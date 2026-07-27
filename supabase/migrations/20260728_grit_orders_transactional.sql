-- =============================================================================
-- GRIT · Creación transaccional de pedidos
-- Migración: 20260728_grit_orders_transactional
--
-- Continúa 20260727_grit_ecommerce_foundation. No la modifica.
--
-- QUÉ AGREGA
--   1. `orders.confirmation_token` — UUID único que abre /gracias sin depender
--      del número de pedido, que es secuencial y por lo tanto adivinable.
--   2. `orders.idempotency_key` — UUID único por intento lógico de pedido, que
--      evita duplicados por doble clic, reintento o corte de red.
--   3. `public.create_order(...)` — crea pedido, ítems e historial en UNA sola
--      transacción, y es idempotente respecto de `idempotency_key`.
--
-- SEGURIDAD
--   La función es SECURITY DEFINER con `search_path` fijo. Se revoca su
--   ejecución a `public`, `anon` y `authenticated`; solo `service_role` puede
--   invocarla, desde el endpoint server-side. RLS sigue activo y sin políticas.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · Columnas nuevas en orders
--
-- Se agregan en tres pasos (nullable → backfill → not null) en lugar de
-- directamente NOT NULL, para que la migración también sirva si la tabla ya
-- tuviera pedidos cargados.
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists confirmation_token uuid not null default gen_random_uuid();

alter table public.orders
  add column if not exists idempotency_key uuid;

-- Backfill para filas previas a esta migración.
update public.orders
   set idempotency_key = gen_random_uuid()
 where idempotency_key is null;

alter table public.orders
  alter column idempotency_key set not null;

-- Las constraints UNIQUE no admiten IF NOT EXISTS: se agregan solo si faltan.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.orders'::regclass
       and conname  = 'orders_confirmation_token_key'
  ) then
    alter table public.orders
      add constraint orders_confirmation_token_key unique (confirmation_token);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.orders'::regclass
       and conname  = 'orders_idempotency_key_key'
  ) then
    alter table public.orders
      add constraint orders_idempotency_key_key unique (idempotency_key);
  end if;
end $$;

comment on column public.orders.confirmation_token is
  'UUID que abre /gracias. Se usa en lugar de order_number porque ese es secuencial y adivinable.';
comment on column public.orders.idempotency_key is
  'UUID del intento lógico de pedido. Un mismo valor nunca crea dos pedidos.';

-- -----------------------------------------------------------------------------
-- 2 · create_order — alta transaccional e idempotente
--
-- La función recibe valores YA VALIDADOS Y RECALCULADOS por el servidor. No
-- valida reglas de negocio ni recalcula precios: eso ocurre en el endpoint,
-- que es la única puerta de entrada. Acá se garantizan dos cosas:
--
--   ATOMICIDAD  El cuerpo de una función plpgsql corre dentro de la
--               transacción del llamador. Si falla la inserción de un ítem o
--               del historial, se revierte también el pedido: nunca queda un
--               pedido a medio crear.
--
--   IDEMPOTENCIA  Antes de insertar se busca `idempotency_key`. Si ya existe,
--               se devuelve el pedido existente. Si dos llamadas concurrentes
--               pasan juntas esa comprobación, la constraint UNIQUE hace fallar
--               a una; ese caso se captura y se resuelve releyendo el pedido
--               que ganó. Así la carrera termina siempre en un solo pedido.
--
-- `p_items` es un array JSON con la forma:
--   [{"sku":"pack-2","product_name":"Pack de 2 Pulseras GRIT","bundle_id":"2",
--     "quantity":1,"unit_price":199000,"compare_at_price":230000,
--     "line_total":199000,"is_promotional":false}, ...]
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
  p_metadata              jsonb default '{}'::jsonb
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
  v_order public.orders%rowtype;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency_key es obligatorio' using errcode = '22004';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items debe ser un array con al menos un elemento' using errcode = '22023';
  end if;

  -- 1 · ¿Ya existe un pedido con esta clave?
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

  -- 2 · Alta. order_number y confirmation_token los pone la base.
  begin
    insert into public.orders (
      idempotency_key,
      customer_name, customer_whatsapp, customer_city, customer_address,
      customer_location_url,
      shipping_zone, shipping_cost, vip_shipping, vip_shipping_cost,
      payment_method, payment_status, order_status,
      subtotal, discount_amount, total,
      metadata
    ) values (
      p_idempotency_key,
      p_customer_name, p_customer_whatsapp, p_customer_city, p_customer_address,
      nullif(btrim(coalesce(p_customer_location_url, '')), ''),
      p_shipping_zone, p_shipping_cost, p_vip_shipping, p_vip_shipping_cost,
      p_payment_method, p_payment_status, 'nuevo',
      p_subtotal, p_discount_amount, p_total,
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

  -- 3 · Ítems del pedido, en la misma transacción.
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

  -- 4 · Primera entrada de la bitácora, también en la misma transacción.
  insert into public.order_status_history (order_id, order_status, payment_status, note)
  values (v_order.id, 'nuevo', p_payment_status, 'Pedido creado desde el checkout');

  return query
    select v_order.id, v_order.order_number, v_order.confirmation_token,
           v_order.total, v_order.payment_method, v_order.payment_status,
           false;
end;
$$;

comment on function public.create_order is
  'Crea pedido, ítems e historial en una sola transacción. Idempotente por '
  'idempotency_key: repetir la clave devuelve el pedido existente en lugar de '
  'duplicarlo. Recibe valores ya validados y recalculados por el servidor.';

-- -----------------------------------------------------------------------------
-- 3 · Índices y permisos
-- -----------------------------------------------------------------------------

-- confirmation_token e idempotency_key ya tienen índice único por sus
-- constraints UNIQUE. No hace falta declararlos aparte.

-- Solo el rol servidor puede invocar la función.
revoke all on function public.create_order(
  uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, integer, integer, integer, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.create_order(
  uuid, text, text, text, text, text, text, integer, boolean, integer,
  text, text, integer, integer, integer, jsonb, jsonb
) to service_role;

commit;
