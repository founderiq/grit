-- =============================================================================
-- GRIT · Cierre del panel administrativo
-- Migración: 20260801_grit_admin_final
--
-- Continúa 20260731_grit_create_order_costs. NO modifica ninguna migración
-- anterior: solo agrega columnas, constraints e índices, y crea una función
-- nueva. Es idempotente de punta a punta (todo va con `if not exists` o dentro
-- de un `do` que verifica antes), así que se puede volver a ejecutar sin daño.
--
-- QUÉ AGREGA
--   1. `public.ad_spend`            → borrado lógico (archived_at / archived_by).
--   2. `public.abandoned_checkouts` → converted_at, archived_by, pasos válidos.
--   3. `public.create_manual_order` → alta transaccional de pedidos cargados a
--      mano desde el panel, con el mismo snapshot de costos que el checkout.
--
-- QUÉ NO CAMBIA
--   `create_order`, la idempotencia del checkout, el `confirmation_token`, las
--   métricas ya calculadas y los snapshots de los pedidos existentes. Ningún
--   pedido anterior se reescribe.
--
-- SIN DATOS PERSONALES
--   Ni un email, ni un user id, ni un token. Los administradores se cargan con
--   `supabase/scripts/agregar_admins.sql`.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · ad_spend: borrado lógico
--
-- Igual que los pedidos, una inversión publicitaria no se borra físicamente: se
-- archiva. Así el número que alguien vio ayer en el dashboard sigue siendo
-- explicable, y un borrado por error se puede deshacer.
--
-- Las métricas filtran `archived_at is null`, de modo que archivar una fila la
-- saca del CPA, del ROAS y de la ganancia neta del período, exactamente como si
-- se hubiera borrado.
-- -----------------------------------------------------------------------------

alter table public.ad_spend
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users (id) on delete set null;

comment on column public.ad_spend.archived_at is
  'Borrado lógico. Con valor, la fila deja de contar en las métricas. La fila nunca se elimina.';
comment on column public.ad_spend.archived_by is
  'Administrador que la archivó. Queda en null si esa cuenta se elimina.';

-- El listado y las métricas siempre piden las activas del período.
create index if not exists ad_spend_activas_idx
  on public.ad_spend (spend_date desc)
  where archived_at is null;

-- -----------------------------------------------------------------------------
-- 2 · abandoned_checkouts: conversión y archivo
--
-- `converted_at` responde "¿cuándo se recuperó?" sin tener que mirar el pedido.
-- `archived_by` cierra el mismo par que ya tienen los pedidos.
--
-- El check de `current_step` va NOT VALID a propósito: aplica a todo lo que se
-- escriba de ahora en adelante y no revisa lo que ya esté guardado. Si algún
-- entorno tuviera filas viejas con otro texto, la migración igual aplica en vez
-- de fallar a mitad de camino.
-- -----------------------------------------------------------------------------

alter table public.abandoned_checkouts
  add column if not exists converted_at timestamptz,
  add column if not exists archived_by  uuid references auth.users (id) on delete set null;

comment on column public.abandoned_checkouts.converted_at is
  'Momento en que este checkout terminó en un pedido. Lo escribe el servidor al crear el pedido, nunca el navegador.';
comment on column public.abandoned_checkouts.archived_by is
  'Administrador que archivó la fila.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.abandoned_checkouts'::regclass
       and conname  = 'abandoned_checkouts_current_step_valido'
  ) then
    alter table public.abandoned_checkouts
      add constraint abandoned_checkouts_current_step_valido
      check (current_step is null or current_step in (
        'contacto', 'entrega', 'seleccion', 'pago', 'review'
      ))
      not valid;
  end if;
end $$;

-- Coherencia: un checkout convertido tiene que decir a qué pedido fue.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.abandoned_checkouts'::regclass
       and conname  = 'abandoned_checkouts_conversion_coherente'
  ) then
    alter table public.abandoned_checkouts
      add constraint abandoned_checkouts_conversion_coherente
      check (status <> 'converted' or converted_order_id is not null)
      not valid;
  end if;
end $$;

-- No hace falta ningún índice nuevo acá: 20260730 ya dejó
-- `abandoned_checkouts_last_seen_idx` y `abandoned_checkouts_activos_idx`, que
-- son exactamente lo que consulta el listado del panel.

-- -----------------------------------------------------------------------------
-- 3 · create_manual_order
--
-- El equivalente de `create_order` para los pedidos que se cargan a mano: los
-- que se cerraron por WhatsApp, en persona o por Instagram y que igual tienen
-- que aparecer en las métricas.
--
-- MISMAS REGLAS QUE EL CHECKOUT
--   · Pedido, ítems e historial en UNA transacción.
--   · Snapshot de costos leído de `business_settings` al crear, nunca después.
--   · Idempotente por `p_idempotency_key`: un doble clic devuelve el pedido que
--     ya se creó, con `is_duplicate = true`, sin insertar otro ni recalcular.
--
-- LO QUE LA FUNCIÓN NO ACEPTA
--   No hay parámetro para el número de pedido (lo genera la base), ni para el
--   costo de producto, ni para el costo logístico: se leen de la configuración.
--   `p_created_by` tiene que ser un administrador ACTIVO —se verifica acá
--   adentro, además de en el servidor—, así que ni siquiera con la service role
--   se puede atribuir un pedido manual a alguien que no lo es.
--
-- DIFERENCIAS CON EL CHECKOUT
--   `source` queda en 'manual', se guarda `created_by`, la fecha de venta la
--   elige quien carga el pedido (no es necesariamente hoy) y el estado de
--   entrega inicial puede ser cualquiera de los válidos, porque un pedido
--   cargado a mano puede estar ya entregado.
-- -----------------------------------------------------------------------------

create or replace function public.create_manual_order(
  p_idempotency_key       uuid,
  p_created_by            uuid,
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
  p_order_status          text,
  p_subtotal              integer,
  p_discount_amount       integer,
  p_total                 integer,
  p_units                 integer,
  p_sale_date             date,
  p_items                 jsonb,
  p_internal_notes        text  default null,
  p_metadata              jsonb default '{}'::jsonb
)
returns table (
  id           uuid,
  order_number text,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order     public.orders%rowtype;
  v_cfg       public.business_settings%rowtype;
  v_product   integer;
  v_logistics integer;
  v_vip_costo integer;
begin
  /* --- Validaciones ------------------------------------------------------
     Se repiten acá aunque el servidor ya las hizo. Esta función es el último
     borde antes de la tabla: lo que no pase por acá no entra.              */

  if p_idempotency_key is null then
    raise exception 'idempotency_key es obligatorio' using errcode = '22004';
  end if;

  if p_created_by is null or not exists (
    select 1 from public.admin_users a
     where a.user_id = p_created_by and a.is_active
  ) then
    raise exception 'created_by debe ser un administrador activo' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items debe ser un array con al menos un elemento' using errcode = '22023';
  end if;

  if p_units is null or p_units < 1 then
    raise exception 'units debe ser mayor a cero' using errcode = '22023';
  end if;

  if p_sale_date is null
     or p_sale_date < date '2020-01-01'
     or p_sale_date > ((now() at time zone 'America/Asuncion')::date + 1) then
    raise exception 'sale_date fuera de rango' using errcode = '22023';
  end if;

  -- 1 · ¿Ya existe? Se responde antes de leer costos y antes de escribir nada,
  --     igual que en create_order: un reintento no toca el snapshot original.
  select * into v_order
    from public.orders o
   where o.idempotency_key = p_idempotency_key;

  if found then
    return query select v_order.id, v_order.order_number, true;
    return;
  end if;

  -- 2 · Costos vigentes, congelados en este pedido.
  select * into v_cfg from public.business_settings s where s.id = 1;

  if not found then
    raise exception 'business_settings no está inicializada' using errcode = 'P0002';
  end if;

  v_product := p_units * v_cfg.product_cost_per_bracelet;

  v_logistics := case p_shipping_zone
                   when 'asuncion' then v_cfg.logistics_cost_asuncion
                   else v_cfg.logistics_cost_interior
                 end;

  -- Coherencia del VIP: sin VIP no se cobra VIP. Es también una constraint de
  -- la tabla; normalizarlo acá evita que un descuido devuelva un error de base.
  v_vip_costo := case when coalesce(p_vip_shipping, false)
                      then coalesce(p_vip_shipping_cost, 0) else 0 end;

  -- 3 · Alta. order_number y confirmation_token los pone la base.
  begin
    insert into public.orders (
      idempotency_key,
      customer_name, customer_whatsapp, customer_city, customer_address,
      customer_location_url,
      shipping_zone, shipping_cost, vip_shipping, vip_shipping_cost,
      payment_method, payment_status, order_status,
      subtotal, discount_amount, total,
      source, sale_date, created_by, internal_notes,
      product_cost_total, logistics_cost, customer_free_shipping,
      metadata
    ) values (
      p_idempotency_key,
      p_customer_name, p_customer_whatsapp, p_customer_city, p_customer_address,
      nullif(btrim(coalesce(p_customer_location_url, '')), ''),
      p_shipping_zone, p_shipping_cost, coalesce(p_vip_shipping, false), v_vip_costo,
      p_payment_method, p_payment_status, p_order_status,
      p_subtotal, p_discount_amount, p_total,
      'manual', p_sale_date, p_created_by,
      nullif(btrim(coalesce(p_internal_notes, '')), ''),
      v_product,
      v_logistics,
      (p_shipping_cost = 0),
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_order;

  exception when unique_violation then
    -- Carrera: otra transacción insertó primero con la misma clave.
    select * into v_order
      from public.orders o
     where o.idempotency_key = p_idempotency_key;

    if not found then
      raise;  -- La colisión fue por otra constraint.
    end if;

    return query select v_order.id, v_order.order_number, true;
    return;
  end;

  -- 4 · Ítems, en la misma transacción.
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

  -- 5 · Primera entrada de la bitácora. Acá SÍ hay una persona detrás.
  insert into public.order_status_history (
    order_id, order_status, payment_status, note, changed_by
  ) values (
    v_order.id, p_order_status, p_payment_status,
    'Pedido manual creado desde el panel', p_created_by
  );

  return query select v_order.id, v_order.order_number, false;
end;
$$;

comment on function public.create_manual_order is
  'Crea un pedido cargado a mano desde el panel: pedido, ítems e historial en '
  'una sola transacción, con el mismo snapshot de costos que create_order. '
  'source = manual y created_by obligatorio y verificado contra admin_users. '
  'Idempotente por idempotency_key.';

-- -----------------------------------------------------------------------------
-- 4 · Permisos de la función
--
-- Solo `service_role`, desde una Server Action ya autorizada. Ni `anon` ni
-- `authenticated` pueden ejecutarla, así que no hay forma de crear un pedido
-- desde el navegador aunque se conozca el nombre de la función.
-- -----------------------------------------------------------------------------

revoke all on function public.create_manual_order(
  uuid, uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, text, integer, integer, integer, integer, date, jsonb, text, jsonb
) from public, anon, authenticated;

grant execute on function public.create_manual_order(
  uuid, uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, text, integer, integer, integer, integer, date, jsonb, text, jsonb
) to service_role;

commit;
