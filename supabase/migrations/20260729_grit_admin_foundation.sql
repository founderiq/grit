-- =============================================================================
-- GRIT · Fundación del panel administrativo
-- Migración: 20260729_grit_admin_foundation
--
-- Continúa 20260728_grit_orders_transactional. No modifica migraciones previas.
--
-- QUÉ AGREGA
--   1. `public.admin_users` — quién puede entrar al panel. Tener cuenta en
--      Supabase Auth NO alcanza: además hace falta una fila activa acá.
--   2. `public.business_settings` — tabla singleton con los costos del negocio
--      (producto y logística). Editable desde el admin más adelante.
--
-- SIN DATOS PERSONALES
--   Esta migración no contiene ningún email, user id, contraseña ni token. Los
--   dos administradores existentes se cargan aparte, con el script documentado
--   `supabase/scripts/agregar_admins.sql`, que usa placeholders.
--
-- SEGURIDAD
--   RLS activo y CERO políticas en ambas tablas: `anon` y `authenticated` no
--   tienen ninguna forma de leerlas ni escribirlas desde el navegador.
--
--   `admin_users` se le concede a `service_role` únicamente SELECT. El servidor
--   necesita leerla para autorizar; no necesita —y por lo tanto no puede—
--   crear ni modificar administradores. Así, aun en el peor escenario (la
--   secret key filtrada y un endpoint comprometido), nadie puede promoverse a
--   sí mismo a admin: alta y baja se hacen exclusivamente desde el SQL editor
--   del proyecto, que corre como dueño de la base.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · admin_users
--
-- La PK es directamente `user_id`: un usuario de Auth tiene como mucho una fila
-- acá, y la relación es 1:1. `on delete cascade` hace que borrar la cuenta en
-- Supabase Auth borre también su permiso, sin dejar filas huérfanas.
--
-- `is_active` permite revocar el acceso sin perder el registro de que esa
-- persona fue administradora (baja lógica, igual que el archivado de pedidos).
-- -----------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id      uuid        primary key
    references auth.users (id) on delete cascade,

  role         text        not null default 'admin'
    constraint admin_users_role_valido check (role in ('admin')),

  is_active    boolean     not null default true,
  display_name text
    constraint admin_users_display_name_no_vacio check (
      display_name is null or btrim(display_name) <> ''
    ),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.admin_users is
  'Personas autorizadas a entrar a /admin. No guarda emails ni contraseñas: la identidad vive en auth.users. Se administra desde el SQL editor, nunca desde la aplicación.';
comment on column public.admin_users.role is
  'Por ahora solo "admin". Si se agregan roles, ampliar la constraint en una migración nueva.';
comment on column public.admin_users.is_active is
  'false revoca el acceso al panel conservando el registro histórico. El servidor exige is_active = true.';

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.grit_set_updated_at();

-- Listado del panel: primero los activos.
create index if not exists admin_users_is_active_idx on public.admin_users (is_active) where is_active;

-- -----------------------------------------------------------------------------
-- 2 · business_settings (singleton)
--
-- Una sola fila, garantizada por la PK `id` con check `id = 1`: un segundo
-- INSERT choca contra la primary key y falla. No hace falta ningún trigger.
--
-- Todos los montos son enteros en guaraníes, igual que en el resto del esquema.
--
-- Los valores iniciales son los costos vigentes del negocio. Cambiarlos afecta
-- solo a los pedidos creados después: `create_order` guarda un snapshot por
-- pedido y nunca reescribe los anteriores.
--
-- Deliberadamente NO se modela: dólares, tipo de cambio, courier ni Buzón
-- Prime. Tampoco existe una tercera zona "envío gratis": la zona logística es
-- siempre `asuncion` o `interior`, y que el cliente pague o no el envío es un
-- dato distinto (`orders.customer_free_shipping`). El costo logístico real se
-- registra igual y se descuenta de la ganancia.
-- -----------------------------------------------------------------------------

create table if not exists public.business_settings (
  id                        smallint    primary key default 1
    constraint business_settings_singleton check (id = 1),

  product_cost_per_bracelet integer     not null default 9500
    constraint business_settings_product_cost_no_negativo check (product_cost_per_bracelet >= 0),
  logistics_cost_asuncion   integer     not null default 20000
    constraint business_settings_logistics_asuncion_no_negativo check (logistics_cost_asuncion >= 0),
  logistics_cost_interior   integer     not null default 30000
    constraint business_settings_logistics_interior_no_negativo check (logistics_cost_interior >= 0),

  updated_at                timestamptz not null default now(),
  updated_by                uuid        references auth.users (id) on delete set null
);

comment on table public.business_settings is
  'Costos del negocio, en guaraníes enteros. Una sola fila (id = 1). Editarla no reescribe los snapshots de pedidos ya creados.';
comment on column public.business_settings.product_cost_per_bracelet is
  'Costo de una pulsera para el negocio. Se multiplica por la cantidad de pulseras del pedido al crearlo.';
comment on column public.business_settings.logistics_cost_asuncion is
  'Costo logístico real de una entrega en Asunción / Gran Asunción, lo pague el cliente o no.';
comment on column public.business_settings.logistics_cost_interior is
  'Costo logístico real de un envío al interior / encomienda, lo pague el cliente o no.';
comment on column public.business_settings.updated_by is
  'Usuario de Auth que guardó el último cambio. Queda en null si esa cuenta se elimina.';

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.grit_set_updated_at();

-- La fila única, con los valores iniciales por defecto de la tabla. Si la
-- migración se vuelve a correr, `do nothing` evita pisar valores ya editados.
insert into public.business_settings (id) values (1)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3 · Row Level Security
--
-- RLS activo y sin políticas: ni `anon` ni `authenticated` pueden tocar estas
-- tablas. Toda lectura del panel pasa por el servidor, que primero verifica
-- `admin_users` y recién después consulta con la service role.
-- -----------------------------------------------------------------------------

alter table public.admin_users       enable row level security;
alter table public.business_settings enable row level security;

-- Defensa en profundidad frente a los default privileges de Supabase, que
-- grantan las tablas nuevas de `public` a anon y authenticated.
revoke all on public.admin_users       from anon, authenticated;
revoke all on public.business_settings from anon, authenticated;

-- Solo lectura para el servidor: autorizar sí, promover no.
-- Alta, baja y cambios de rol se hacen desde el SQL editor del proyecto.
revoke all    on public.admin_users from service_role;
grant  select on public.admin_users to   service_role;

-- Los costos sí se editan desde el panel, mediante endpoints server-side.
grant select, update on public.business_settings to service_role;

commit;
