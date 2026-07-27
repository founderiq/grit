-- =============================================================================
-- GRIT · create_order con snapshot de costos
-- Migración: 20260731_grit_create_order_costs
--
-- Continúa 20260730_grit_admin_orders_costs. No modifica migraciones previas.
--
-- QUÉ CAMBIA
--   `public.create_order` pasa a guardar, al crear un pedido web:
--     · product_cost_total     = pulseras × business_settings.product_cost_per_bracelet
--     · logistics_cost         = costo de la zona real (Asunción o interior)
--     · customer_free_shipping = si el cliente pagó Gs. 0 de envío estándar
--     · source                 = 'web'
--     · sale_date              = fecha de hoy en America/Asuncion
--
-- QUÉ NO CAMBIA
--   La idempotencia por `idempotency_key`, el `confirmation_token`, las
--   columnas que devuelve la función y, por lo tanto, la respuesta del endpoint,
--   el aviso por Telegram y la página /gracias. Un pedido repetido sigue
--   devolviendo el existente con `is_duplicate = true` y sin tocar nada.
--
-- FIRMA NUEVA
--   Se agrega el parámetro `p_units` (cantidad de pulseras del pedido, ya
--   calculada y validada por el servidor). Como cambia la firma, hay que
--   BORRAR la versión anterior antes de crear la nueva: `create or replace` con
--   otra lista de parámetros crearía una sobrecarga, y una llamada por nombre
--   quedaría ambigua entre las dos.
--
--   `p_units` va AL FINAL y con default `null`, para que una llamada con los 17
--   argumentos viejos siga siendo válida. Así el orden entre aplicar esta
--   migración y desplegar el código deja de importar: si el pedido llega sin
--   `p_units`, la función deriva la cantidad de pulseras de los propios ítems.
--   Sin ese default, aplicar la migración rompería el checkout desplegado hasta
--   el siguiente deploy, y desplegar antes lo rompería hasta la migración.
--
-- SNAPSHOT, NO CÁLCULO EN VIVO
--   Los costos se leen de `business_settings` UNA vez, al crear el pedido, y se
--   copian a la fila. Cambiar los costos más adelante no reescribe ningún
--   pedido anterior: la ganancia histórica queda como realmente fue.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · Baja de la versión de 20260728 (17 parámetros)
-- -----------------------------------------------------------------------------

drop function if exists public.create_order(
  uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, integer, integer, integer, jsonb, jsonb
);

-- -----------------------------------------------------------------------------
-- 2 · Versión nueva (18 parámetros: suma p_units, al final y opcional)
-- -----------------------------------------------------------------------------

create or replace function public.create_order(
  p_idempotency_key       uuid,
  p_customer_name         text,
  p_customer_whatsapp     text,
  p_customer_city         text,
  p_customer_address      text,
  p_customer_location_url text,
  p_shipping_zone         text,
  p_shipping_cost         integer,
  p_vip_shipping          boolean,
  p_vip_shipping_cost     integer,
  p_payment_method        text,
  p_payment_status        text,
  p_subtotal              integer,
  p_discount_amount       integer,
  p_total                 integer,
  p_items                 jsonb,
  p_metadata              jsonb   default '{}'::jsonb,
  p_units                 integer default null
)
returns table (
  id                 uuid,
  order_number       text,
  confirmation_token uuid,
  total              integer,
  payment_method     text,
  payment_status     text,
  is_duplicate       boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order      public.orders%rowtype;
  v_cfg        public.business_settings%rowtype;
  v_units      integer;
  v_product    integer;
  v_logistics  integer;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency_key es obligatorio' using errcode = '22004';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items debe ser un array con al menos un elemento' using errcode = '22023';
  end if;

  -- Cantidad de pulseras. La manda el servidor; si no viene —llamada con la
  -- firma vieja, durante una ventana de despliegue— se deriva de los ítems:
  -- `bundle_id` es la cantidad de pulseras del pack ('1', '2', '3') y la
  -- pulsera extra promocional no lleva bundle_id, así que cuenta como una.
  if p_units is null then
    select coalesce(sum(
             (it->>'quantity')::integer
             * coalesce(case when it->>'bundle_id' ~ '^[0-9]+$'
                             then (it->>'bundle_id')::integer end, 1)
           ), 0)
      into v_units
      from jsonb_array_elements(p_items) as it;
  else
    v_units := p_units;
  end if;

  if v_units < 1 then
    raise exception 'units debe ser mayor a cero' using errcode = '22023';
  end if;

  -- 1 · ¿Ya existe un pedido con esta clave?
  --
  -- Se responde antes de leer costos y antes de escribir nada: un reintento no
  -- puede alterar el snapshot del pedido original, ni siquiera si los costos
  -- cambiaron entre el primer intento y el segundo.
  select * into v_order
    from public.orders o
   where o.idempotency_key = p_idempotency_key;

  if found then
    return query
      select v_order.id, v_order.order_number, v_order.confirmation_token,
             v_order.total, v_order.payment_method, v_order.payment_status,
             true;
    return;
  end if;

  -- 2 · Costos vigentes, congelados en este pedido.
  select * into v_cfg from public.business_settings s where s.id = 1;

  if not found then
    raise exception 'business_settings no está inicializada' using errcode = 'P0002';
  end if;

  -- Cantidad de pulseras × costo unitario. `v_units` ya incluye la pulsera
  -- extra promocional cuando el pedido la lleva.
  v_product := v_units * v_cfg.product_cost_per_bracelet;

  -- Costo logístico REAL, por zona. Es independiente de lo que haya pagado el
  -- cliente: con envío gratis el negocio igual paga la entrega, y el VIP es
  -- ingreso adicional que no agrega costo logístico.
  v_logistics := case p_shipping_zone
                   when 'asuncion' then v_cfg.logistics_cost_asuncion
                   else v_cfg.logistics_cost_interior
                 end;

  -- 3 · Alta. order_number y confirmation_token los pone la base.
  begin
    insert into public.orders (
      idempotency_key,
      customer_name, customer_whatsapp, customer_city, customer_address,
      customer_location_url,
      shipping_zone, shipping_cost, vip_shipping, vip_shipping_cost,
      payment_method, payment_status, order_status,
      subtotal, discount_amount, total,
      source, sale_date,
      product_cost_total, logistics_cost, customer_free_shipping,
      metadata
    ) values (
      p_idempotency_key,
      p_customer_name, p_customer_whatsapp, p_customer_city, p_customer_address,
      nullif(btrim(coalesce(p_customer_location_url, '')), ''),
      p_shipping_zone, p_shipping_cost, p_vip_shipping, p_vip_shipping_cost,
      p_payment_method, p_payment_status, 'nuevo',
      p_subtotal, p_discount_amount, p_total,
      'web',
      (now() at time zone 'America/Asuncion')::date,
      v_product,
      v_logistics,
      -- Envío gratis para el cliente = pagó Gs. 0 de envío estándar. Se deriva
      -- del propio monto guardado para que no puedan contradecirse entre sí.
      (p_shipping_cost = 0),
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_order;

  exception when unique_violation then
    -- Carrera: otra transacción insertó primero con la misma clave.
    -- Se devuelve el pedido que ganó, en vez de fallar.
    select * into v_order
      from public.orders o
     where o.idempotency_key = p_idempotency_key;

    if not found then
      -- La colisión fue por otra constraint (no por idempotency_key).
      raise;
    end if;

    return query
      select v_order.id, v_order.order_number, v_order.confirmation_token,
             v_order.total, v_order.payment_method, v_order.payment_status,
             true;
    return;
  end;

  -- 4 · Ítems del pedido, en la misma transacción.
  insert into public.order_items (
    order_id, sku, product_name, bundle_id,
    quantity, unit_price, compare_at_price, line_total,
    is_promotional
  )
  select
    v_order.id,
    it->>'sku',
    it->>'product_name',
    nullif(it->>'bundle_id', ''),
    (it->>'quantity')::integer,
    (it->>'unit_price')::integer,
    nullif(it->>'compare_at_price', '')::integer,
    (it->>'line_total')::integer,
    coalesce((it->>'is_promotional')::boolean, false)
  from jsonb_array_elements(p_items) as it;

  -- 5 · Primera entrada de la bitácora, también en la misma transacción.
  --     `changed_by` queda en null: no hay persona detrás de un pedido web.
  insert into public.order_status_history (order_id, order_status, payment_status, note)
  values (v_order.id, 'nuevo', p_payment_status, 'Pedido creado desde el checkout');

  return query
    select v_order.id, v_order.order_number, v_order.confirmation_token,
           v_order.total, v_order.payment_method, v_order.payment_status,
           false;
end;
$$;

comment on function public.create_order is
  'Crea pedido, ítems e historial en una sola transacción, e inmoviliza el '
  'snapshot de costos (producto y logística) leído de business_settings. '
  'Idempotente por idempotency_key: repetir la clave devuelve el pedido '
  'existente sin recalcular nada. Recibe valores ya validados por el servidor.';

-- -----------------------------------------------------------------------------
-- 3 · Permisos
--
-- Igual que en 20260728: solo `service_role` puede ejecutarla, desde el
-- endpoint server-side.
-- -----------------------------------------------------------------------------

revoke all on function public.create_order(
  uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, integer, integer, integer, jsonb, jsonb, integer
) from public, anon, authenticated;

grant execute on function public.create_order(
  uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, integer, integer, integer, jsonb, jsonb, integer
) to service_role;

commit;
