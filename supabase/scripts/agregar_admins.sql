-- =============================================================================
-- GRIT · Alta manual de administradores
--
-- NO es una migración. Es un script que se corre a mano, UNA vez, desde el
-- SQL Editor del proyecto de Supabase, después de aplicar
-- `migrations/20260729_grit_admin_foundation.sql`.
--
-- POR QUÉ NO ESTÁ EN UNA MIGRACIÓN
--   Las migraciones viven en el repositorio y el repositorio no es lugar para
--   los emails del equipo. Acá tampoco hay ninguno: los emails reales se
--   escriben al momento de correr el script y no quedan guardados en git.
--
-- POR QUÉ SE CORRE COMO DUEÑO Y NO DESDE LA APLICACIÓN
--   `admin_users` le concede a `service_role` solo SELECT. La aplicación puede
--   leer para autorizar, pero no puede crear ni modificar administradores. Alta
--   y baja pasan siempre por acá, que corre como dueño de la base.
--   Consecuencia buscada: nadie puede promoverse a sí mismo a administrador.
--
-- REQUISITOS PREVIOS
--   Las cuentas ya tienen que existir en Supabase Auth
--   (Dashboard → Authentication → Users → Add user).
--   Este script NO crea cuentas ni contraseñas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASO 1 · Ver qué cuentas existen en Auth
--
-- Sirve para confirmar los emails exactos antes de habilitarlos. No modifica
-- nada. La columna `ya_es_admin` avisa si esa cuenta ya está habilitada.
-- -----------------------------------------------------------------------------

select u.email,
       u.created_at,
       (a.user_id is not null) as ya_es_admin,
       a.is_active,
       a.display_name
  from auth.users u
  left join public.admin_users a on a.user_id = u.id
 order by u.created_at;


-- -----------------------------------------------------------------------------
-- PASO 2 · Habilitar a las dos personas del equipo
--
-- Reemplazá los cuatro placeholders por los valores reales ANTES de ejecutar:
--
--   'EMAIL_ADMIN_1'   → el email exacto de la primera cuenta, entre comillas
--   'NOMBRE_ADMIN_1'  → cómo querés que aparezca en el panel
--   'EMAIL_ADMIN_2'   → el email exacto de la segunda cuenta
--   'NOMBRE_ADMIN_2'  → cómo querés que aparezca en el panel
--
-- El email se usa acá SOLO para encontrar el `user_id` en Auth. Lo que se
-- guarda en `admin_users` es el UUID, nunca el email: la autorización del panel
-- no mira direcciones de correo en ningún momento.
--
-- `on conflict` hace que volver a correrlo sea seguro: si la persona ya estaba,
-- se reactiva y se actualiza el nombre en lugar de fallar.
-- -----------------------------------------------------------------------------

insert into public.admin_users (user_id, role, is_active, display_name)
select u.id, 'admin', true, v.display_name
  from (values
          ('EMAIL_ADMIN_1', 'NOMBRE_ADMIN_1'),
          ('EMAIL_ADMIN_2', 'NOMBRE_ADMIN_2')
       ) as v(email, display_name)
  join auth.users u on lower(u.email) = lower(v.email)
on conflict (user_id) do update
   set is_active    = true,
       display_name = excluded.display_name,
       updated_at   = now();


-- -----------------------------------------------------------------------------
-- PASO 3 · Verificar
--
-- Tienen que aparecer exactamente las dos filas, con `is_active = true`.
-- Si falta alguna, el email del PASO 2 no coincide con ninguna cuenta de Auth:
-- revisalo contra la salida del PASO 1. El `insert ... select ... join` no
-- inventa filas, simplemente no inserta nada cuando no encuentra la cuenta.
-- -----------------------------------------------------------------------------

select a.user_id,
       a.role,
       a.is_active,
       a.display_name,
       a.created_at
  from public.admin_users a
 order by a.created_at;


-- =============================================================================
-- OPERACIONES POSTERIORES
-- =============================================================================

-- Revocar el acceso a alguien, conservando el registro histórico:
--
--   update public.admin_users
--      set is_active = false
--    where user_id = (select id from auth.users where lower(email) = lower('EMAIL_A_REVOCAR'));
--
-- El servidor exige `is_active = true`, así que el acceso se corta en el
-- siguiente request. La sesión que tenga abierta deja de servirle.

-- Devolverle el acceso:
--
--   update public.admin_users
--      set is_active = true
--    where user_id = (select id from auth.users where lower(email) = lower('EMAIL_A_REACTIVAR'));

-- Quitar a alguien por completo (pierde el histórico de que fue admin):
--
--   delete from public.admin_users
--    where user_id = (select id from auth.users where lower(email) = lower('EMAIL_A_BORRAR'));
--
-- Borrar la cuenta en Supabase Auth también elimina su fila acá, por el
-- `on delete cascade`.
