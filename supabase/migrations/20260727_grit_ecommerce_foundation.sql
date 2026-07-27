-- =============================================================================
-- GRIT · Fundación de base de datos del ecommerce
-- Migración: 20260727_grit_ecommerce_foundation
--
-- Crea las tablas de pedidos del ecommerce sobre PostgreSQL de Supabase.
--
-- ALCANCE
--   Solo el ecommerce. El mismo proyecto de Supabase va a alojar más adelante
--   la aplicación NFC de Grit; sus tablas llegan en otra migración y por eso
--   todos los objetos de acá llevan nombres del dominio de pedidos, sin
--   nombres genéricos que puedan chocar (`items`, `users`, `links`…).
--
-- MONEDA
--   Todos los montos son enteros en guaraníes. El guaraní no tiene centavos,
--   así que no se usa `numeric` ni `money`: `integer` evita por completo los
--   errores de redondeo de punto flotante. El techo de `integer` son
--   2.147.483.647 Gs, muy por encima de cualquier pedido.
--
-- SEGURIDAD
--   RLS activo en todas las tablas y CERO políticas: con RLS activo y sin
--   políticas, `anon` y `authenticated` no pueden leer, insertar, actualizar
--   ni borrar nada. Solo `service_role`, que saltea RLS por diseño, tiene
--   acceso. Los pedidos se van a insertar desde un endpoint server-side con
--   la service role, que NUNCA se expone al navegador.
--   Además se revocan los privilegios de tabla a `anon` y `authenticated`,
--   como segunda línea de defensa por si alguna vez se agrega una política.
--
-- IDEMPOTENCIA
--   La migración se puede correr más de una vez sin romper nada:
--   `create table if not exists`, `create index if not exists`,
--   `create or replace function` y `drop trigger if exists` antes de crear.
--   Las constraints declaradas dentro de `create table` no se re-evalúan
--   porque la tabla ya existe.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0 · Extensiones
--
-- `gen_random_uuid()` es una función del core desde PostgreSQL 13, así que en
-- Supabase (PG 15+) está disponible sin instalar nada. Se deja igual el
-- `create extension if not exists` de pgcrypto por compatibilidad hacia atrás;
-- si ya está instalada, la sentencia no hace nada.
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1 · Utilidades compartidas
-- -----------------------------------------------------------------------------

-- Mantiene `updated_at` al día en cada UPDATE. Se aplica con un trigger por
-- tabla, más abajo.
create or replace function public.grit_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.grit_set_updated_at() is
  'Trigger BEFORE UPDATE: refresca updated_at con now().';

-- -----------------------------------------------------------------------------
-- 2 · Numeración de pedidos
--
-- Formato: GRT-YYYYMMDD-NNNNNN   (ej. GRT-20260727-000106)
--
-- CÓMO FUNCIONA
--   `order_number_counters` guarda un contador por día. Cada pedido nuevo hace
--   un UPSERT sobre la fila del día:
--
--     insert ... values (hoy, 1) on conflict (day) do update set last = last + 1
--
--   El UPSERT es atómico: PostgreSQL toma un lock de fila sobre el contador del
--   día, así que dos pedidos simultáneos se serializan y ninguno puede leer el
--   mismo valor. No hay condición de carrera y no hacen falta reintentos.
--
--   Se prefirió esta tabla a una `sequence` porque una secuencia no se puede
--   reiniciar por día de forma transaccional, y a un `max(order_number) + 1`
--   porque eso sí tiene condición de carrera bajo concurrencia.
--
-- ZONA HORARIA
--   El día se calcula en `America/Asuncion`, no en UTC. Con UTC, un pedido
--   hecho a las 21:00 de Asunción ya contaría como del día siguiente.
--
-- ORIGEN DEL DATO
--   El número lo genera exclusivamente la base, mediante un trigger BEFORE
--   INSERT. No depende del navegador ni de nada que mande el cliente: el
--   endpoint server-side no envía `order_number`.
-- -----------------------------------------------------------------------------

create table if not exists public.order_number_counters (
  day         date    primary key,
  last_value  integer not null default 0
    constraint order_number_counters_last_value_positive check (last_value >= 0)
);

comment on table public.order_number_counters is
  'Contador de pedidos por día. Lo usa public.next_order_number(); no se toca a mano.';

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'America/Asuncion')::date;
  v_seq integer;
begin
  insert into public.order_number_counters as c (day, last_value)
  values (v_day, 1)
  on conflict (day) do update
    set last_value = c.last_value + 1
  returning c.last_value into v_seq;

  return 'GRT-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

comment on function public.next_order_number() is
  'Devuelve el siguiente número de pedido del día (GRT-YYYYMMDD-NNNNNN). '
  'SECURITY DEFINER para poder tocar el contador sin abrirlo a otros roles.';

-- Trigger que completa order_number cuando viene vacío. El endpoint nunca lo
-- manda; queda condicional para permitir importar pedidos históricos con su
-- número original.
--
-- SECURITY DEFINER a propósito: el trigger corre con el rol que hace el INSERT
-- y PostgreSQL le exige EXECUTE sobre next_order_number(). Definiéndolo acá, la
-- llamada interna ocurre como el dueño de la función y ningún rol escritor
-- necesita permisos sobre la numeración.
create or replace function public.grit_set_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := public.next_order_number();
  end if;
  return new;
end;
$$;

comment on function public.grit_set_order_number() is
  'Trigger BEFORE INSERT sobre orders: completa order_number si viene vacío.';

-- -----------------------------------------------------------------------------
-- 3 · orders
-- -----------------------------------------------------------------------------

create table if not exists public.orders (
  id                    uuid        primary key default gen_random_uuid(),
  order_number          text        not null unique,

  -- Contacto y envío
  customer_name         text        not null
    constraint orders_customer_name_no_vacio check (btrim(customer_name) <> ''),
  customer_whatsapp     text        not null
    constraint orders_customer_whatsapp_no_vacio check (btrim(customer_whatsapp) <> ''),
  customer_city         text        not null
    constraint orders_customer_city_no_vacio check (btrim(customer_city) <> ''),
  customer_address      text        not null
    constraint orders_customer_address_no_vacio check (btrim(customer_address) <> ''),
  customer_location_url text,

  -- Envío
  shipping_zone         text        not null
    constraint orders_shipping_zone_valida check (shipping_zone in ('asuncion', 'interior')),
  shipping_cost         integer     not null default 0
    constraint orders_shipping_cost_no_negativo check (shipping_cost >= 0),
  vip_shipping          boolean     not null default false,
  vip_shipping_cost     integer     not null default 0
    constraint orders_vip_shipping_cost_no_negativo check (vip_shipping_cost >= 0),

  -- Pago y estado
  payment_method        text        not null
    constraint orders_payment_method_valido check (payment_method in ('transferencia', 'tarjeta')),
  payment_status        text        not null default 'pendiente_transferencia'
    constraint orders_payment_status_valido check (payment_status in (
      'pendiente_transferencia',
      'pendiente_pago_online',
      'pagado',
      'fallido',
      'cancelado'
    )),
  order_status          text        not null default 'nuevo'
    constraint orders_order_status_valido check (order_status in (
      'nuevo',
      'confirmado',
      'preparando',
      'enviado',
      'entregado',
      'cancelado'
    )),

  -- Montos, todos enteros en guaraníes
  subtotal              integer     not null
    constraint orders_subtotal_no_negativo check (subtotal >= 0),
  discount_amount       integer     not null default 0
    constraint orders_discount_amount_no_negativo check (discount_amount >= 0),
  total                 integer     not null
    constraint orders_total_no_negativo check (total >= 0),

  -- Referencias opcionales
  payment_link_key      text,
  notes                 text,
  metadata              jsonb       not null default '{}'::jsonb,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Coherencia entre el flag de VIP y su costo: si no hay VIP, no se cobra.
  constraint orders_vip_coherente check (vip_shipping or vip_shipping_cost = 0)
);

comment on table public.orders is
  'Pedidos del ecommerce. Montos en guaraníes enteros. Se insertan solo desde el servidor con la service role.';
comment on column public.orders.order_number is
  'Identificador legible GRT-YYYYMMDD-NNNNNN. Lo genera la base, no el cliente.';
comment on column public.orders.payment_link_key is
  'Clave del link de pago usado (referencia lógica a payment_links.key, sin FK: los links pueden borrarse sin perder el histórico del pedido).';
comment on column public.orders.metadata is
  'Datos auxiliares del pedido (origen, campaña, user agent…). Nunca datos de tarjeta.';

drop trigger if exists orders_set_order_number on public.orders;
create trigger orders_set_order_number
  before insert on public.orders
  for each row execute function public.grit_set_order_number();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.grit_set_updated_at();

-- `order_number` ya tiene índice único: lo crea la constraint UNIQUE de la
-- columna (índice `orders_order_number_key`). No hace falta declararlo aparte.
create index if not exists orders_customer_whatsapp_idx on public.orders (customer_whatsapp);
create index        if not exists orders_created_at_idx        on public.orders (created_at desc);
create index        if not exists orders_payment_status_idx    on public.orders (payment_status);
create index        if not exists orders_order_status_idx      on public.orders (order_status);
create index        if not exists orders_payment_link_key_idx  on public.orders (payment_link_key)
  where payment_link_key is not null;

-- -----------------------------------------------------------------------------
-- 4 · order_items
-- -----------------------------------------------------------------------------

create table if not exists public.order_items (
  id                uuid        primary key default gen_random_uuid(),
  order_id          uuid        not null
    references public.orders (id) on delete cascade,

  sku               text        not null
    constraint order_items_sku_no_vacio check (btrim(sku) <> ''),
  product_name      text        not null
    constraint order_items_product_name_no_vacio check (btrim(product_name) <> ''),
  bundle_id         text,

  quantity          integer     not null
    constraint order_items_quantity_positiva check (quantity > 0),
  unit_price        integer     not null
    constraint order_items_unit_price_no_negativo check (unit_price >= 0),
  compare_at_price  integer
    constraint order_items_compare_at_price_no_negativo check (compare_at_price is null or compare_at_price >= 0),
  line_total        integer     not null
    constraint order_items_line_total_no_negativo check (line_total >= 0),

  is_promotional    boolean     not null default false,
  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.order_items is
  'Líneas de un pedido. Se borran en cascada junto con el pedido.';
comment on column public.order_items.line_total is
  'Total de la línea, en guaraníes. Es el valor autoritativo: no se deriva de quantity × unit_price, para que un descuento por línea no lo contradiga.';
comment on column public.order_items.is_promotional is
  'true en la pulsera extra de 35% OFF y en cualquier ítem promocional futuro.';

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_sku_idx      on public.order_items (sku);

-- -----------------------------------------------------------------------------
-- 5 · order_status_history
-- -----------------------------------------------------------------------------

create table if not exists public.order_status_history (
  id             uuid        primary key default gen_random_uuid(),
  order_id       uuid        not null
    references public.orders (id) on delete cascade,

  order_status   text
    constraint order_status_history_order_status_valido check (order_status is null or order_status in (
      'nuevo',
      'confirmado',
      'preparando',
      'enviado',
      'entregado',
      'cancelado'
    )),
  payment_status text
    constraint order_status_history_payment_status_valido check (payment_status is null or payment_status in (
      'pendiente_transferencia',
      'pendiente_pago_online',
      'pagado',
      'fallido',
      'cancelado'
    )),
  note           text,
  created_at     timestamptz not null default now(),

  -- Una entrada sin ningún dato no aporta nada.
  constraint order_status_history_algo_que_registrar check (
    order_status is not null or payment_status is not null or btrim(coalesce(note, '')) <> ''
  )
);

comment on table public.order_status_history is
  'Bitácora de cambios de estado de un pedido. Se borra en cascada junto con el pedido.';

create index if not exists order_status_history_order_id_idx   on public.order_status_history (order_id);
create index if not exists order_status_history_created_at_idx on public.order_status_history (created_at desc);

-- -----------------------------------------------------------------------------
-- 6 · payment_links
--
-- Acá se van a cargar más adelante los links estáticos de pago con tarjeta.
-- Esta migración NO carga ninguna fila: sin URLs reales y sin datos ficticios.
-- -----------------------------------------------------------------------------

create table if not exists public.payment_links (
  id         uuid        primary key default gen_random_uuid(),
  key        text        not null unique
    constraint payment_links_key_no_vacia check (btrim(key) <> ''),
  label      text        not null
    constraint payment_links_label_no_vacio check (btrim(label) <> ''),
  amount     integer     not null
    constraint payment_links_amount_no_negativo check (amount >= 0),
  url        text        not null
    constraint payment_links_url_https check (url like 'https://%'),
  is_active  boolean     not null default true,
  metadata   jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_links is
  'Links estáticos de pago con tarjeta, por monto. La URL se sirve siempre desde el servidor; nunca se arma en el navegador.';
comment on column public.payment_links.key is
  'Clave estable que referencia orders.payment_link_key (por ejemplo el monto o el nombre del pack).';

drop trigger if exists payment_links_set_updated_at on public.payment_links;
create trigger payment_links_set_updated_at
  before update on public.payment_links
  for each row execute function public.grit_set_updated_at();

-- `key` ya tiene índice único por su constraint UNIQUE (payment_links_key_key).
create index if not exists payment_links_active_idx on public.payment_links (is_active) where is_active;

-- -----------------------------------------------------------------------------
-- 7 · Row Level Security
--
-- RLS activo y SIN políticas en todas las tablas. Efecto:
--   · anon           → sin acceso
--   · authenticated  → sin acceso
--   · service_role   → acceso total (saltea RLS por definición)
--
-- Cuando en la fase 5B exista el panel administrador con Supabase Auth, se
-- agregarán políticas explícitas para `authenticated` acotadas por rol. Hasta
-- entonces, el único camino de escritura es el endpoint server-side.
-- -----------------------------------------------------------------------------

alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.payment_links          enable row level security;
alter table public.order_number_counters  enable row level security;

-- Defensa en profundidad: aunque RLS ya bloquea, se quitan los privilegios de
-- tabla a los roles del navegador, para que un descuido futuro al crear una
-- política no abra la puerta sola.
--
-- Supabase aplica default privileges que grantan las tablas nuevas de `public`
-- a anon, authenticated y service_role. Estos REVOKE deshacen los dos primeros.
revoke all on public.orders                 from anon, authenticated;
revoke all on public.order_items            from anon, authenticated;
revoke all on public.order_status_history   from anon, authenticated;
revoke all on public.payment_links          from anon, authenticated;
revoke all on public.order_number_counters  from anon, authenticated;

-- El contador de numeración es interno: no lo toca ningún rol de aplicación,
-- solo la función SECURITY DEFINER.
revoke all on public.order_number_counters from service_role;

-- Grants explícitos para el rol servidor. No se dejan librados a los default
-- privileges de Supabase: así la migración es autocontenida y correcta aunque
-- el proyecto tenga otra configuración de privilegios por defecto.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders               to service_role;
grant select, insert, update, delete on public.order_items          to service_role;
grant select, insert, update, delete on public.order_status_history to service_role;
grant select, insert, update, delete on public.payment_links        to service_role;

-- La numeración solo se invoca desde el trigger, que es SECURITY DEFINER.
-- Ningún rol de aplicación necesita ejecutarla directamente.
revoke all on function public.next_order_number()     from public, anon, authenticated, service_role;
revoke all on function public.grit_set_order_number() from public, anon, authenticated;
revoke all on function public.grit_set_updated_at()   from public, anon, authenticated;

commit;
