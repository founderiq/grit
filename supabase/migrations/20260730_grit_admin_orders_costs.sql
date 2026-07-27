-- =============================================================================
-- GRIT · Pedidos para el admin: costos, archivado, ajustes, ad spend y
--        checkouts abandonados
-- Migración: 20260730_grit_admin_orders_costs
--
-- Continúa 20260729_grit_admin_foundation. No modifica migraciones previas.
--
-- QUÉ AGREGA
--   1. Columnas nuevas en `orders`: origen, archivado, notas internas, fecha de
--      venta y el snapshot de costos e ingresos extra.
--   2. `efectivo` como método de pago válido, preservando transferencia y
--      tarjeta. Los pedidos web actuales no cambian de comportamiento.
--   3. `order_adjustments` — extras y ajustes por pedido, con historial.
--   4. `ad_spend` — inversión publicitaria por fecha.
--   5. `abandoned_checkouts` — checkouts abandonados (solo el esquema; la
--      captura llega en una fase posterior).
--   6. `order_status_history.changed_by` — quién hizo el cambio, nullable.
--
-- COMPATIBILIDAD
--   Todas las columnas nuevas de `orders` tienen default o son nullable, así
--   que los pedidos web existentes siguen válidos y ningún INSERT actual se
--   rompe. Los pedidos que ya estaban quedan con `source = 'web'`.
--
-- SEGURIDAD
--   RLS activo y cero políticas en las tres tablas nuevas. En particular
--   `abandoned_checkouts` no admite inserts desde `anon`: la captura futura va
--   a pasar por un endpoint server-side con la service role.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · Origen, archivado y notas internas
--
-- Archivar es un borrado lógico: el pedido sigue en la base, deja de contar en
-- las métricas y se puede restaurar poniendo `archived_at` en null. No hay
-- ningún camino que borre pedidos físicamente.
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists source text not null default 'web';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.orders'::regclass
       and conname  = 'orders_source_valido'
  ) then
    alter table public.orders
      add constraint orders_source_valido check (source in ('web', 'manual'));
  end if;
end $$;

alter table public.orders
  add column if not exists archived_at    timestamptz,
  add column if not exists archived_by    uuid references auth.users (id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists created_by     uuid references auth.users (id) on delete set null;

comment on column public.orders.source is
  'web = generado por el checkout público. manual = cargado a mano desde el admin.';
comment on column public.orders.archived_at is
  'Archivado lógico. Con valor, el pedido queda fuera de las métricas pero sigue existiendo. Restaurar = volver a null.';
comment on column public.orders.archived_by is
  'Usuario de Auth que archivó el pedido. Null si esa cuenta se elimina.';
comment on column public.orders.internal_notes is
  'Notas internas del equipo. No se muestran nunca al cliente.';
comment on column public.orders.created_by is
  'Usuario de Auth que cargó un pedido manual. Siempre null en los pedidos web.';

-- `idempotency_key` es NOT NULL porque los pedidos web la necesitan para no
-- duplicarse ante un doble clic. Un pedido manual no viene de ningún reintento
-- y no tiene una clave natural que ofrecer, así que se le da un default: la
-- base genera una y la unicidad se mantiene.
--
-- Esto no debilita la idempotencia del checkout: `create_order` sigue fallando
-- explícitamente si la clave llega en null, así que un pedido web nunca puede
-- caer en el default por descuido.
alter table public.orders
  alter column idempotency_key set default gen_random_uuid();

-- -----------------------------------------------------------------------------
-- 2 · Fecha de venta
--
-- `created_at` es un timestamptz y se guarda en UTC: un pedido de las 21:00 de
-- Asunción cae al día siguiente si se agrupa por UTC. `sale_date` es la fecha
-- del negocio, en `America/Asuncion`, y es la que usan los reportes por día.
--
-- Se agrega nullable → backfill desde `created_at` → NOT NULL, para que los
-- pedidos existentes conserven su fecha real en lugar de recibir la de hoy.
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists sale_date date;

update public.orders
   set sale_date = (created_at at time zone 'America/Asuncion')::date
 where sale_date is null;

alter table public.orders
  alter column sale_date set default (now() at time zone 'America/Asuncion')::date;

alter table public.orders
  alter column sale_date set not null;

comment on column public.orders.sale_date is
  'Fecha de la venta en hora de Paraguay (America/Asuncion). Es la que usan los reportes diarios, no created_at.';

create index if not exists orders_sale_date_idx on public.orders (sale_date desc);

-- -----------------------------------------------------------------------------
-- 3 · Snapshot de costos e ingresos extra
--
-- `product_cost_total` y `logistics_cost` son una FOTO del momento de la venta.
-- Se calculan una sola vez, al crear el pedido, leyendo `business_settings`.
-- Si mañana sube el costo de la pulsera, los pedidos viejos no se tocan: la
-- ganancia histórica sigue siendo la que realmente fue.
--
-- `customer_free_shipping` distingue "el cliente no pagó envío" de "el envío no
-- costó nada". El costo logístico se registra igual y se descuenta de la
-- ganancia: el envío gratis es una promoción, no un ahorro.
--
-- `extra_revenue_total` y `extra_cost_total` son la suma de `order_adjustments`
-- de ese pedido. Los mantiene al día un trigger (punto 5); no se escriben a
-- mano.
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists product_cost_total     integer not null default 0,
  add column if not exists logistics_cost         integer not null default 0,
  add column if not exists extra_cost_total       integer not null default 0,
  add column if not exists extra_revenue_total    integer not null default 0,
  add column if not exists customer_free_shipping boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.orders'::regclass
                    and conname = 'orders_product_cost_total_no_negativo') then
    alter table public.orders add constraint orders_product_cost_total_no_negativo
      check (product_cost_total >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.orders'::regclass
                    and conname = 'orders_logistics_cost_no_negativo') then
    alter table public.orders add constraint orders_logistics_cost_no_negativo
      check (logistics_cost >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.orders'::regclass
                    and conname = 'orders_extra_cost_total_no_negativo') then
    alter table public.orders add constraint orders_extra_cost_total_no_negativo
      check (extra_cost_total >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.orders'::regclass
                    and conname = 'orders_extra_revenue_total_no_negativo') then
    alter table public.orders add constraint orders_extra_revenue_total_no_negativo
      check (extra_revenue_total >= 0);
  end if;
end $$;

comment on column public.orders.product_cost_total is
  'Snapshot: cantidad de pulseras × business_settings.product_cost_per_bracelet al momento de la venta. No se recalcula.';
comment on column public.orders.logistics_cost is
  'Snapshot: costo logístico real del pedido según su zona, lo haya pagado el cliente o no. No se recalcula.';
comment on column public.orders.extra_cost_total is
  'Suma de order_adjustments.cost_amount de este pedido. Lo mantiene un trigger.';
comment on column public.orders.extra_revenue_total is
  'Suma de order_adjustments.revenue_amount de este pedido. Lo mantiene un trigger.';
comment on column public.orders.customer_free_shipping is
  'true cuando el cliente pagó Gs. 0 de envío estándar. El costo logístico se registra igual en logistics_cost.';

-- Backfill del snapshot para los pedidos anteriores a esta migración.
--
-- Se hace UNA sola vez y solo sobre filas que todavía están en cero, con la
-- misma fórmula que va a usar create_order y con los costos vigentes hoy. La
-- alternativa —dejarlos en cero— sería peor: un pedido con costo 0 aparece en
-- los reportes como 100 % de margen, que es un número falso.
--
-- La cantidad de pulseras sale de los ítems: `bundle_id` es la cantidad de
-- pulseras del pack ('1', '2', '3') y la pulsera extra promocional no lleva
-- bundle_id, así que cuenta como una.
update public.orders o
   set product_cost_total = s.product_cost_per_bracelet * coalesce((
         select sum(i.quantity * coalesce(
                  case when i.bundle_id ~ '^[0-9]+$' then i.bundle_id::integer end, 1))
           from public.order_items i
          where i.order_id = o.id
       ), 0),
       logistics_cost     = case o.shipping_zone
                              when 'asuncion' then s.logistics_cost_asuncion
                              else s.logistics_cost_interior
                            end,
       customer_free_shipping = (o.shipping_cost = 0)
  from public.business_settings s
 where s.id = 1
   and o.product_cost_total = 0
   and o.logistics_cost = 0;

-- -----------------------------------------------------------------------------
-- 4 · Efectivo como método de pago
--
-- Se reemplaza la constraint para sumar 'efectivo', preservando los dos
-- valores que ya existían. Es solo para pedidos manuales futuros: el checkout
-- web sigue ofreciendo únicamente transferencia y tarjeta, y la lógica de
-- payment_status de los pedidos web no cambia.
-- -----------------------------------------------------------------------------

alter table public.orders drop constraint if exists orders_payment_method_valido;

alter table public.orders
  add constraint orders_payment_method_valido
  check (payment_method in ('transferencia', 'tarjeta', 'efectivo'));

comment on column public.orders.payment_method is
  'transferencia y tarjeta se usan en el checkout web. efectivo queda disponible para pedidos manuales.';

-- -----------------------------------------------------------------------------
-- 5 · order_adjustments — extras y ajustes por pedido
--
-- `revenue_amount` suma a la facturación del pedido; `cost_amount` reduce la
-- ganancia. Ninguno de los dos admite negativos: para descontar se carga el
-- concepto del otro lado, y así el historial queda legible.
--
-- El detalle es obligatorio si alguno de los montos supera cero.
-- -----------------------------------------------------------------------------

create table if not exists public.order_adjustments (
  id             uuid        primary key default gen_random_uuid(),
  order_id       uuid        not null
    references public.orders (id) on delete cascade,

  description    text,
  revenue_amount integer     not null default 0
    constraint order_adjustments_revenue_no_negativo check (revenue_amount >= 0),
  cost_amount    integer     not null default 0
    constraint order_adjustments_cost_no_negativo check (cost_amount >= 0),

  created_by     uuid        references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint order_adjustments_detalle_obligatorio check (
    (revenue_amount = 0 and cost_amount = 0)
    or btrim(coalesce(description, '')) <> ''
  )
);

comment on table public.order_adjustments is
  'Extras y ajustes de un pedido. Historial: no se pisan filas, se agregan. Se borran en cascada junto con el pedido.';
comment on column public.order_adjustments.revenue_amount is
  'Ingreso adicional en guaraníes. Suma a venta, facturación y total del pedido en las métricas.';
comment on column public.order_adjustments.cost_amount is
  'Costo adicional en guaraníes. Resta a la ganancia.';

create index if not exists order_adjustments_order_id_idx   on public.order_adjustments (order_id);
create index if not exists order_adjustments_created_at_idx on public.order_adjustments (created_at desc);

-- Mantiene `orders.extra_revenue_total` / `extra_cost_total` como suma de los
-- ajustes del pedido. Recalcula desde cero en cada cambio en lugar de sumar
-- diferencias: así un UPDATE o un DELETE no pueden dejar el total desfasado.
--
-- SECURITY DEFINER para que quien cargue un ajuste no necesite UPDATE sobre
-- `orders`.
create or replace function public.grit_sync_order_adjustments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := '{}'::uuid[];
  v_id  uuid;
begin
  -- Las ramas se escriben con IF y no con CASE porque en un trigger de INSERT
  -- la variable OLD no está asignada, y evaluarla —aunque sea dentro de un
  -- CASE que no se elige— aborta la función.
  if tg_op in ('INSERT', 'UPDATE') then
    v_ids := array_append(v_ids, new.order_id);
  end if;

  -- En un UPDATE que mueva el ajuste de pedido, hay que recalcular los dos.
  if tg_op in ('UPDATE', 'DELETE') then
    v_ids := array_append(v_ids, old.order_id);
  end if;

  foreach v_id in array v_ids loop
    update public.orders o
       set extra_revenue_total = coalesce(t.rev, 0),
           extra_cost_total    = coalesce(t.cost, 0)
      from (
        select sum(a.revenue_amount) as rev, sum(a.cost_amount) as cost
          from public.order_adjustments a
         where a.order_id = v_id
      ) t
     where o.id = v_id;
  end loop;

  return null;
end;
$$;

comment on function public.grit_sync_order_adjustments() is
  'Trigger AFTER sobre order_adjustments: recalcula extra_revenue_total y extra_cost_total del pedido.';

drop trigger if exists order_adjustments_sync on public.order_adjustments;
create trigger order_adjustments_sync
  after insert or update or delete on public.order_adjustments
  for each row execute function public.grit_sync_order_adjustments();

-- -----------------------------------------------------------------------------
-- 6 · ad_spend — inversión publicitaria
--
-- Una fecha puede tener varios registros (distintas campañas o plataformas):
-- no hay unicidad por fecha. Todo en guaraníes enteros.
-- -----------------------------------------------------------------------------

create table if not exists public.ad_spend (
  id         uuid        primary key default gen_random_uuid(),
  spend_date date        not null,
  amount     integer     not null
    constraint ad_spend_amount_positivo check (amount > 0),
  note       text,
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ad_spend is
  'Inversión en publicidad por fecha, en guaraníes enteros. Varias filas por día están permitidas. Editable desde el admin.';
comment on column public.ad_spend.amount is
  'Monto invertido. Debe ser mayor a cero: una fila en cero no es un gasto, es una fila de más.';

drop trigger if exists ad_spend_set_updated_at on public.ad_spend;
create trigger ad_spend_set_updated_at
  before update on public.ad_spend
  for each row execute function public.grit_set_updated_at();

create index if not exists ad_spend_spend_date_idx on public.ad_spend (spend_date desc);

-- -----------------------------------------------------------------------------
-- 7 · abandoned_checkouts
--
-- Solo el esquema. La captura se implementa más adelante, desde un endpoint
-- server-side: `anon` no tiene ningún privilegio sobre esta tabla, así que no
-- se puede insertar desde el navegador.
--
-- `session_key` es único: un mismo checkout se actualiza, no se duplica.
-- -----------------------------------------------------------------------------

create table if not exists public.abandoned_checkouts (
  id                 uuid        primary key default gen_random_uuid(),
  session_key        text        not null unique
    constraint abandoned_checkouts_session_key_no_vacia check (btrim(session_key) <> ''),

  customer_name      text,
  customer_whatsapp  text,
  customer_city      text,

  pack_id            text,
  pack_qty           integer
    constraint abandoned_checkouts_pack_qty_positiva check (pack_qty is null or pack_qty > 0),
  has_extra          boolean     not null default false,
  shipping_zone      text
    constraint abandoned_checkouts_shipping_zone_valida check (
      shipping_zone is null or shipping_zone in ('asuncion', 'interior')
    ),

  current_step       text,
  status             text        not null default 'abandoned'
    constraint abandoned_checkouts_status_valido check (status in ('abandoned', 'converted')),
  converted_order_id uuid        references public.orders (id) on delete set null,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  archived_at        timestamptz
);

comment on table public.abandoned_checkouts is
  'Checkouts iniciados y no completados. Se escriben solo desde el servidor; anon no tiene privilegios. La captura llega en una fase posterior.';
comment on column public.abandoned_checkouts.session_key is
  'Clave estable del checkout en curso. Única: el mismo intento se actualiza en lugar de duplicarse.';
comment on column public.abandoned_checkouts.status is
  'abandoned mientras no haya pedido. converted cuando el checkout terminó en una compra.';
comment on column public.abandoned_checkouts.converted_order_id is
  'Pedido resultante, cuando el checkout convirtió. Queda en null si ese pedido se elimina.';
comment on column public.abandoned_checkouts.last_seen_at is
  'Última señal de actividad del visitante en el checkout.';

drop trigger if exists abandoned_checkouts_set_updated_at on public.abandoned_checkouts;
create trigger abandoned_checkouts_set_updated_at
  before update on public.abandoned_checkouts
  for each row execute function public.grit_set_updated_at();

create index if not exists abandoned_checkouts_status_idx     on public.abandoned_checkouts (status);
create index if not exists abandoned_checkouts_last_seen_idx  on public.abandoned_checkouts (last_seen_at desc);
create index if not exists abandoned_checkouts_activos_idx    on public.abandoned_checkouts (created_at desc)
  where archived_at is null;

-- -----------------------------------------------------------------------------
-- 8 · Auditoría del historial de estados
--
-- `changed_by` es nullable a propósito: los pedidos web y los cambios
-- automáticos no tienen usuario detrás. Solo se completa cuando el cambio lo
-- hace una persona desde el admin.
--
-- La tabla ya admitía registrar cambios de pago, de entrega y notas: los tres
-- campos (`payment_status`, `order_status`, `note`) son nullables y la
-- constraint solo exige que haya al menos uno. Archivar y restaurar se anotan
-- como una fila con `note`, sin cambiar los estados.
-- -----------------------------------------------------------------------------

alter table public.order_status_history
  add column if not exists changed_by uuid references auth.users (id) on delete set null;

comment on column public.order_status_history.changed_by is
  'Usuario de Auth que hizo el cambio. Null en los cambios automáticos y en los pedidos web.';

-- -----------------------------------------------------------------------------
-- 9 · Row Level Security y permisos
-- -----------------------------------------------------------------------------

alter table public.order_adjustments   enable row level security;
alter table public.ad_spend            enable row level security;
alter table public.abandoned_checkouts enable row level security;

revoke all on public.order_adjustments   from anon, authenticated;
revoke all on public.ad_spend            from anon, authenticated;
revoke all on public.abandoned_checkouts from anon, authenticated;

grant select, insert, update, delete on public.order_adjustments   to service_role;
grant select, insert, update, delete on public.ad_spend            to service_role;
grant select, insert, update, delete on public.abandoned_checkouts to service_role;

revoke all on function public.grit_sync_order_adjustments() from public, anon, authenticated;

commit;
