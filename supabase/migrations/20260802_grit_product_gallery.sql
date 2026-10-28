-- =============================================================================
-- GRIT · Galería administrable de /producto
-- Migración: 20260802_grit_product_gallery
--
-- Continúa 20260801_grit_admin_final. NO modifica ninguna tabla, función ni
-- política existente: solo CREA objetos nuevos. Es idempotente de punta a punta
-- (`if not exists`, `create or replace`, `on conflict`, seed condicionado), así
-- que se puede volver a ejecutar sin daño.
--
-- QUÉ AGREGA
--   1. `public.product_gallery_images` → la galería GENERAL de /producto: qué
--      imagen, en qué posición, su texto alternativo y si está activa.
--   2. Cuatro funciones transaccionales, solo para `service_role`:
--        · gallery_add_image      → alta al final de la galería
--        · gallery_replace_image  → cambia el archivo conservando la posición
--        · gallery_delete_image   → baja + renumeración del resto
--        · gallery_reorder        → nuevo orden completo
--   3. El bucket de Storage `product-gallery`: lectura pública de los archivos,
--      límite de tamaño y tipos MIME permitidos. SIN políticas de escritura.
--   4. Seed: registra las diez fotos actuales de /public/img/galeria en el
--      mismo orden, solo si la tabla está vacía.
--
-- QUÉ NO TOCA
--   Pedidos, ítems, costos, abandonados, admin_users, los modelos de pulsera
--   (sus fotos siguen en /public/img/variants y no pasan por esta tabla) y
--   cualquier política de Storage existente.
--
-- SIN DATOS PERSONALES
--   Ni un email, ni un user id, ni un token, ni la URL del proyecto.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 · product_gallery_images
--
-- Una fila por foto de la galería. El ORDEN es la única fuente de verdad de
-- qué foto es la principal: la de `sort_order = 1`. No hay un "featured" aparte.
--
-- DE DÓNDE SALE EL ARCHIVO — exactamente una de dos columnas:
--   · storage_path → objeto del bucket `product-gallery` (lo que sube el panel).
--   · static_path  → archivo versionado en /public/img/galeria. Solo lo usa el
--                    seed, para que las fotos actuales aparezcan sin volver a
--                    subirlas. Reemplazar una de esas fotos la pasa a Storage.
--
-- Cada subida usa un nombre NUEVO (`galeria/<uuid>.<ext>`): un archivo nunca se
-- sobrescribe, así que ni el CDN de Storage ni el optimizador de imágenes de
-- Next pueden servir una versión vieja con el nombre de una nueva.
--
-- `sort_order` es único con chequeo DIFERIDO: reordenar intercambia posiciones
-- dentro de una misma sentencia, y un único inmediato fallaría a mitad de
-- camino aunque el resultado final sea válido.
-- -----------------------------------------------------------------------------

create table if not exists public.product_gallery_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text,
  static_path  text,
  sort_order   integer not null,
  alt_text     text,
  is_active    boolean not null default true,
  width        integer,
  height       integer,
  size_bytes   integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  updated_by   uuid references auth.users (id) on delete set null,

  constraint product_gallery_images_un_origen check (
    (storage_path is not null) <> (static_path is not null)
  ),
  constraint product_gallery_images_storage_path_valido check (
    storage_path is null
    or storage_path ~ '^galeria/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$'
  ),
  constraint product_gallery_images_static_path_valido check (
    static_path is null
    or static_path ~ '^/img/galeria/[a-z0-9_-]+\.(webp|jpg|jpeg|png)$'
  ),
  constraint product_gallery_images_sort_order_positivo check (sort_order >= 1),
  constraint product_gallery_images_alt_largo check (
    alt_text is null or char_length(alt_text) <= 300
  ),
  constraint product_gallery_images_dimensiones check (
    (width is null or width between 1 and 10000)
    and (height is null or height between 1 and 10000)
    and (size_bytes is null or size_bytes >= 0)
  ),
  constraint product_gallery_images_storage_path_unico unique (storage_path),
  constraint product_gallery_images_sort_order_unico unique (sort_order)
    deferrable initially deferred
);

comment on table public.product_gallery_images is
  'Galería general de /producto. La posición 1 es la foto principal. No incluye las fotos de los modelos de pulsera.';
comment on column public.product_gallery_images.storage_path is
  'Ruta dentro del bucket product-gallery. Nunca se reutiliza: cada subida tiene nombre propio.';
comment on column public.product_gallery_images.static_path is
  'Archivo versionado en /public (solo filas del seed). Excluyente con storage_path.';
comment on column public.product_gallery_images.sort_order is
  'Posición en la galería, 1..n sin huecos. La 1 es la foto principal.';
comment on column public.product_gallery_images.is_active is
  'false la saca de /producto sin borrarla.';

drop trigger if exists product_gallery_images_set_updated_at on public.product_gallery_images;
create trigger product_gallery_images_set_updated_at
  before update on public.product_gallery_images
  for each row execute function public.grit_set_updated_at();

-- -----------------------------------------------------------------------------
-- 2 · RLS y privilegios
--
-- Mismo criterio que el resto del esquema: RLS activo, CERO políticas, nada
-- para anon ni authenticated. /producto lee la galería desde el servidor con la
-- service role; el navegador solo recibe las URLs públicas de los archivos.
-- -----------------------------------------------------------------------------

alter table public.product_gallery_images enable row level security;

revoke all on public.product_gallery_images from anon, authenticated;
grant select, insert, update, delete on public.product_gallery_images to service_role;

-- -----------------------------------------------------------------------------
-- 3 · Funciones
--
-- Todas:
--   · corren en UNA transacción (la del llamador), así que no quedan estados a
--     medio escribir;
--   · toman el mismo lock de transacción, para que dos administradores que
--     editan a la vez se serialicen en vez de pisarse las posiciones;
--   · verifican que quien escribe sea un administrador ACTIVO, igual que
--     create_manual_order: ni con la service role se escribe a nombre de otro;
--   · solo las puede ejecutar service_role.
--
-- No tocan Storage: subir y borrar archivos lo hace el servidor, en el orden
-- seguro (primero subir, después apuntar la fila, y recién al final borrar el
-- archivo viejo).
-- -----------------------------------------------------------------------------

create or replace function public.grit_gallery_assert_admin(p_admin uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_admin is null or not exists (
    select 1 from public.admin_users a
     where a.user_id = p_admin and a.is_active
  ) then
    raise exception 'el usuario debe ser un administrador activo' using errcode = '42501';
  end if;
end;
$$;

-- Clave fija del lock de la galería (pg_advisory_xact_lock se libera solo al
-- terminar la transacción).
create or replace function public.grit_gallery_lock()
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtext('grit.product_gallery_images'));
$$;

-- 3.1 · Alta al final ----------------------------------------------------------

create or replace function public.gallery_add_image(
  p_storage_path text,
  p_alt_text     text,
  p_width        integer,
  p_height       integer,
  p_size_bytes   integer,
  p_admin        uuid
)
returns public.product_gallery_images
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila public.product_gallery_images;
begin
  perform public.grit_gallery_assert_admin(p_admin);
  perform public.grit_gallery_lock();

  insert into public.product_gallery_images
    (storage_path, alt_text, width, height, size_bytes, sort_order, created_by, updated_by)
  values (
    p_storage_path,
    nullif(btrim(p_alt_text), ''),
    p_width,
    p_height,
    p_size_bytes,
    coalesce((select max(g.sort_order) from public.product_gallery_images g), 0) + 1,
    p_admin,
    p_admin
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

-- 3.2 · Reemplazo conservando la posición --------------------------------------
--
-- Devuelve la ruta de Storage ANTERIOR (o null si venía del seed estático),
-- para que el servidor borre ese archivo solo después de que la fila ya apunta
-- al nuevo.

create or replace function public.gallery_replace_image(
  p_id           uuid,
  p_storage_path text,
  p_alt_text     text,
  p_width        integer,
  p_height       integer,
  p_size_bytes   integer,
  p_admin        uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior text;
begin
  perform public.grit_gallery_assert_admin(p_admin);
  perform public.grit_gallery_lock();

  select g.storage_path into v_anterior
    from public.product_gallery_images g
   where g.id = p_id
     for update;

  if not found then
    raise exception 'la imagen no existe' using errcode = 'P0002';
  end if;

  update public.product_gallery_images g
     set storage_path = p_storage_path,
         static_path  = null,
         alt_text     = nullif(btrim(p_alt_text), ''),
         width        = p_width,
         height       = p_height,
         size_bytes   = p_size_bytes,
         updated_by   = p_admin
   where g.id = p_id;

  return v_anterior;
end;
$$;

-- 3.3 · Baja + renumeración ----------------------------------------------------
--
-- No deja borrar la última imagen: la galería nunca queda vacía por un clic.
-- Devuelve la ruta de Storage de la fila borrada (null si era del seed) para
-- que el servidor elimine el archivo DESPUÉS de que ya nadie lo referencia.

create or replace function public.gallery_delete_image(
  p_id    uuid,
  p_admin uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruta text;
begin
  perform public.grit_gallery_assert_admin(p_admin);
  perform public.grit_gallery_lock();

  if not exists (select 1 from public.product_gallery_images g where g.id = p_id) then
    raise exception 'la imagen no existe' using errcode = 'P0002';
  end if;

  if (select count(*) from public.product_gallery_images) <= 1 then
    raise exception 'la galería necesita al menos una imagen' using errcode = '23514';
  end if;

  delete from public.product_gallery_images g
   where g.id = p_id
  returning g.storage_path into v_ruta;

  -- Posiciones 1..n sin huecos, respetando el orden relativo.
  update public.product_gallery_images g
     set sort_order = o.posicion
    from (
      select x.id, row_number() over (order by x.sort_order, x.created_at) as posicion
        from public.product_gallery_images x
    ) o
   where g.id = o.id
     and g.sort_order <> o.posicion;

  return v_ruta;
end;
$$;

-- 3.4 · Nuevo orden completo ---------------------------------------------------
--
-- Recibe TODOS los ids en el orden deseado. Si falta uno, sobra uno o hay un
-- repetido, falla sin tocar nada: así un panel desactualizado (otra persona
-- subió o borró una foto mientras tanto) no puede dejar posiciones inválidas.

create or replace function public.gallery_reorder(
  p_ids   uuid[],
  p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  perform public.grit_gallery_assert_admin(p_admin);
  perform public.grit_gallery_lock();

  select count(*) into v_total from public.product_gallery_images;

  if p_ids is null
     or cardinality(p_ids) <> v_total
     or (select count(distinct u) from unnest(p_ids) u) <> v_total
     or exists (
       select 1 from unnest(p_ids) u
        where not exists (select 1 from public.product_gallery_images g where g.id = u)
     )
  then
    raise exception 'el orden no coincide con la galería actual' using errcode = '40001';
  end if;

  update public.product_gallery_images g
     set sort_order = o.posicion,
         updated_by = p_admin
    from unnest(p_ids) with ordinality as o(id, posicion)
   where g.id = o.id
     and g.sort_order <> o.posicion;
end;
$$;

revoke all on function public.grit_gallery_assert_admin(uuid) from public, anon, authenticated;
revoke all on function public.grit_gallery_lock() from public, anon, authenticated;
revoke all on function public.gallery_add_image(text, text, integer, integer, integer, uuid)
  from public, anon, authenticated;
revoke all on function public.gallery_replace_image(uuid, text, text, integer, integer, integer, uuid)
  from public, anon, authenticated;
revoke all on function public.gallery_delete_image(uuid, uuid) from public, anon, authenticated;
revoke all on function public.gallery_reorder(uuid[], uuid) from public, anon, authenticated;

grant execute on function public.gallery_add_image(text, text, integer, integer, integer, uuid)
  to service_role;
grant execute on function public.gallery_replace_image(uuid, text, text, integer, integer, integer, uuid)
  to service_role;
grant execute on function public.gallery_delete_image(uuid, uuid) to service_role;
grant execute on function public.gallery_reorder(uuid[], uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 4 · Bucket de Storage `product-gallery`
--
-- `public = true` habilita SOLO la lectura de archivos por URL
-- (/storage/v1/object/public/product-gallery/...), que es lo que necesita un
-- visitante de /producto. NO habilita listar, subir, reemplazar ni borrar.
--
-- No se crea ninguna política sobre storage.objects: sin políticas, anon y
-- authenticated no pueden escribir en el bucket. Las escrituras las hace el
-- servidor con la service role, después de autorizar al administrador.
--
-- Límite y tipos MIME: segunda barrera, por si algún día algo saltea la
-- validación del servidor. El panel ya entrega archivos optimizados de pocos
-- cientos de KB; 3 MB deja margen sin permitir fotos crudas de cámara.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-gallery',
  'product-gallery',
  true,
  3145728,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 5 · Seed: las diez fotos actuales, en el mismo orden
--
-- Se REGISTRAN apuntando a /public/img/galeria (no se copian a Storage): ya
-- están publicadas, optimizadas a 500×500 y versionadas en el repo, que además
-- las conserva como fallback. Reemplazar cualquiera desde el panel la mueve a
-- Storage sin tocar el archivo original.
--
-- Solo corre si la tabla está vacía: volver a ejecutar la migración no duplica
-- nada ni pisa lo que ya se haya editado desde el panel.
-- -----------------------------------------------------------------------------

insert into public.product_gallery_images (static_path, sort_order, alt_text, width, height, size_bytes)
select v.static_path, v.sort_order, v.alt_text, 500, 500, v.size_bytes
  from (values
    ('/img/galeria/galeria-01.webp',  1, 'Pulsera GRIT — más que un accesorio, un recordatorio diario de fe', 23806),
    ('/img/galeria/galeria-02.webp',  2, 'Par de pulseras GRIT junto a una Biblia abierta y una vela', 38590),
    ('/img/galeria/galeria-03.webp',  3, 'Cómo funciona el tap NFC: acercás el celular y recibís tu versículo del día', 30094),
    ('/img/galeria/galeria-04.webp',  4, 'Detalle de la pulsera GRIT con cruz bordada sobre fondo oscuro', 25054),
    ('/img/galeria/galeria-05.webp',  5, 'Testimonio de cliente usando la pulsera GRIT en su rutina diaria', 22550),
    ('/img/galeria/galeria-06.webp',  6, 'Mujer mostrando la pulsera GRIT y el versículo del día en su celular', 25002),
    ('/img/galeria/galeria-07.webp',  7, 'App GRIT mostrando el versículo del día y contenido devocional', 17042),
    ('/img/galeria/galeria-08.webp',  8, 'Hombre llevando la pulsera GRIT en la muñeca', 26922),
    ('/img/galeria/galeria-09.webp',  9, 'Características de la pulsera GRIT: NFC, escaneo rápido y diseño negro minimalista', 24788),
    ('/img/galeria/galeria-10.webp', 10, 'Detalle del chip NFC integrado en la pulsera GRIT', 23670)
  ) as v(static_path, sort_order, alt_text, size_bytes)
 where not exists (select 1 from public.product_gallery_images);

commit;
