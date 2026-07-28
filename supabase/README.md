# Supabase · Base de datos de Grit

Este directorio contiene las migraciones SQL versionadas del proyecto de
Supabase de Grit.

Un **único** proyecto de Supabase va a alojar, con el tiempo:

1. El ecommerce y el panel administrador
2. La aplicación NFC de Grit

Las migraciones actuales cubren el **ecommerce y la fundación del panel**. Las
tablas de la aplicación NFC llegan en una migración aparte; por eso todos los
objetos de acá llevan nombres del dominio de pedidos y se evitan nombres
genéricos (`items`, `users`, `links`) que puedan chocar más adelante.

---

## Migraciones

Se aplican **en orden de nombre**, una sola vez cada una.

| # | Archivo | Contenido | Estado |
|---|---|---|---|
| 1 | `migrations/20260727_grit_ecommerce_foundation.sql` | Fundación del ecommerce: pedidos, ítems, historial de estados y links de pago | ✅ aplicada |
| 2 | `migrations/20260728_grit_orders_transactional.sql` | `confirmation_token`, `idempotency_key` y la función `create_order` | ✅ aplicada |
| 3 | `migrations/20260729_grit_admin_foundation.sql` | `admin_users` y `business_settings` | ✅ aplicada |
| 4 | `migrations/20260730_grit_admin_orders_costs.sql` | Columnas de admin en `orders`, `efectivo`, `order_adjustments`, `ad_spend`, `abandoned_checkouts`, `changed_by` | ✅ aplicada |
| 5 | `migrations/20260731_grit_create_order_costs.sql` | `create_order` con snapshot de costos (`p_units`) | ✅ aplicada |
| 6 | `migrations/20260801_grit_admin_final.sql` | Borrado lógico de `ad_spend`, conversión y archivo de abandonados, y `create_manual_order` | ⏳ pendiente de aplicar |

> **No vuelvas atrás.** La migración 5 borra la versión de `create_order` que
> crea la 2 y la reemplaza por otra con un parámetro más. Volver a correr la 2
> **después** de la 5 dejaría dos funciones con el mismo nombre y firmas
> distintas. (Si se intenta, la migración 2 falla y se revierte sola: no llega a
> dejar nada a medias. Pero no hay motivo para intentarlo.)
>
> En cambio, **el orden respecto del despliegue del código no importa**: el
> parámetro nuevo (`p_units`) va al final y es opcional, así que una llamada con
> la firma vieja sigue siendo válida y la función deriva la cantidad de pulseras
> de los propios ítems. Se puede aplicar la migración antes o después del deploy
> sin ventana de error.

Además hay un script que **no** es una migración:

| Archivo | Cuándo | Qué hace |
|---|---|---|
| `scripts/agregar_admins.sql` | Después de la migración 3 | Habilita a mano las cuentas del equipo en `admin_users`. Usa placeholders: no contiene emails |

Y la documentación de reportes:

| Archivo | Contenido |
|---|---|
| `METRICAS.md` | Qué pedidos cuentan y cómo se calcula cada métrica del panel |

---

## Tablas

### `orders`

El pedido. Una fila por compra confirmada desde el checkout.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `order_number` | `text` | Único. Formato `GRT-YYYYMMDD-NNNNNN`. Lo genera la base |
| `customer_name` | `text` | No vacío |
| `customer_whatsapp` | `text` | No vacío. Indexado |
| `customer_city` | `text` | No vacío |
| `customer_address` | `text` | No vacío |
| `customer_location_url` | `text` | Opcional |
| `shipping_zone` | `text` | `asuncion` \| `interior` |
| `shipping_cost` | `integer` | Guaraníes. `0` cuando aplica envío gratis |
| `vip_shipping` | `boolean` | Envío Prioritario VIP |
| `vip_shipping_cost` | `integer` | Guaraníes. `0` si no hay VIP |
| `payment_method` | `text` | `transferencia` \| `tarjeta` |
| `payment_status` | `text` | Ver estados |
| `order_status` | `text` | Ver estados |
| `subtotal` | `integer` | Guaraníes |
| `discount_amount` | `integer` | Guaraníes |
| `total` | `integer` | Guaraníes |
| `payment_link_key` | `text` | Opcional. Referencia lógica a `payment_links.key` |
| `notes` | `text` | Opcional |
| `metadata` | `jsonb` | Opcional, default `{}` |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` lo mantiene un trigger |

Columnas agregadas para el panel (migración 4):

| Columna | Tipo | Notas |
|---|---|---|
| `source` | `text` | `web` \| `manual`. Los pedidos existentes quedaron en `web` |
| `sale_date` | `date` | Fecha de la venta en `America/Asuncion`. Es la que usan los reportes |
| `archived_at` | `timestamptz` | Archivado lógico. Con valor, el pedido sale de las métricas pero sigue existiendo |
| `archived_by` | `uuid` | FK → `auth.users.id`, `on delete set null` |
| `internal_notes` | `text` | Notas del equipo. Nunca se muestran al cliente |
| `created_by` | `uuid` | Quién cargó un pedido manual. Siempre `null` en los web |
| `product_cost_total` | `integer` | Snapshot: pulseras × costo unitario al momento de la venta |
| `logistics_cost` | `integer` | Snapshot: costo logístico real de la zona, lo pague el cliente o no |
| `customer_free_shipping` | `boolean` | `true` si el cliente pagó Gs. 0 de envío estándar |
| `extra_revenue_total` | `integer` | Suma de `order_adjustments.revenue_amount`. Lo mantiene un trigger |
| `extra_cost_total` | `integer` | Suma de `order_adjustments.cost_amount`. Lo mantiene un trigger |

`payment_method` pasa a admitir también `efectivo`, para pedidos manuales.
`transferencia` y `tarjeta` siguen igual, y **la lógica de `payment_status` de
los pedidos web no cambia**.

`idempotency_key` gana un `default gen_random_uuid()`: un pedido manual no viene
de ningún reintento y no tiene una clave natural que ofrecer. Esto no debilita
la idempotencia del checkout, porque `create_order` sigue fallando explícitamente
si la clave llega en `null`.

### `order_items`

Las líneas del pedido. **Se borran en cascada** al borrar el pedido.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `orders.id`, `on delete cascade` |
| `sku` | `text` | Ej. `pack-2`, `pulsera-extra` |
| `product_name` | `text` | Nombre mostrado al cliente |
| `bundle_id` | `text` | Opcional: `1`, `2`, `3` |
| `quantity` | `integer` | Mayor a cero |
| `unit_price` | `integer` | Guaraníes |
| `compare_at_price` | `integer` | Opcional. Precio tachado |
| `line_total` | `integer` | Guaraníes. Valor autoritativo de la línea |
| `is_promotional` | `boolean` | `true` en la pulsera extra de 35% OFF |
| `metadata` | `jsonb` | Opcional |
| `created_at` | `timestamptz` | |

`line_total` **no** se deriva de `quantity × unit_price` por constraint, para
que un descuento aplicado a la línea no entre en conflicto con la restricción.

### `order_status_history`

Bitácora de cambios de estado. **Se borra en cascada** al borrar el pedido.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `orders.id`, `on delete cascade` |
| `order_status` | `text` | Opcional, validado contra la lista |
| `payment_status` | `text` | Opcional, validado contra la lista |
| `note` | `text` | Opcional |
| `changed_by` | `uuid` | Opcional. FK → `auth.users.id`, `on delete set null` |
| `created_at` | `timestamptz` | |

Una fila necesita al menos uno de los tres campos con contenido.

`changed_by` es nullable a propósito: los pedidos web y los cambios automáticos
no tienen persona detrás. Se completa solo cuando el cambio lo hace alguien
desde el panel. Con estos cuatro campos la tabla cubre cambios de pago, de
entrega, archivado/restaurado y notas internas, sin necesitar columnas nuevas:
archivar se anota como una fila con `note` y `changed_by`, sin tocar los estados.

### `payment_links`

Links estáticos de pago con tarjeta, para cargar más adelante.
**La migración no inserta ninguna fila**: sin URLs reales ni datos ficticios.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `key` | `text` | Único, no vacío |
| `label` | `text` | No vacío |
| `amount` | `integer` | Guaraníes |
| `url` | `text` | Debe empezar con `https://` |
| `is_active` | `boolean` | Default `true` |
| `metadata` | `jsonb` | Opcional |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` con trigger |

### `order_number_counters`

Tabla interna de la numeración. No la toca ninguna aplicación: solo la usa la
función `next_order_number()`.

### `admin_users`

Quién puede entrar a `/admin`. **No guarda emails ni contraseñas**: la identidad
vive en `auth.users` y acá solo está el permiso.

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | `uuid` | PK y FK → `auth.users.id`, `on delete cascade` |
| `role` | `text` | Por ahora solo `admin` |
| `is_active` | `boolean` | Default `true`. `false` revoca el acceso sin perder el registro |
| `display_name` | `text` | Opcional. Si está vacío, el panel muestra el email |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` con trigger |

### `business_settings`

Tabla **singleton** con los costos del negocio. Una sola fila, garantizada por
`id smallint primary key check (id = 1)`.

| Columna | Tipo | Inicial |
|---|---|---|
| `id` | `smallint` | `1` (fijo) |
| `product_cost_per_bracelet` | `integer` | `9500` |
| `logistics_cost_asuncion` | `integer` | `20000` |
| `logistics_cost_interior` | `integer` | `30000` |
| `updated_at` | `timestamptz` | con trigger |
| `updated_by` | `uuid` | Opcional. FK → `auth.users.id`, `on delete set null` |

Los tres costos tienen `check >= 0`. Editarlos **no reescribe** los snapshots de
los pedidos ya creados.

### `order_adjustments`

Extras y ajustes de un pedido. **Se borran en cascada** al borrar el pedido.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `orders.id`, `on delete cascade` |
| `description` | `text` | Obligatoria si algún monto es mayor a cero |
| `revenue_amount` | `integer` | `>= 0`. Suma a venta, facturación y total |
| `cost_amount` | `integer` | `>= 0`. Resta a la ganancia |
| `created_by` | `uuid` | Opcional. FK → `auth.users.id` |
| `created_at` | `timestamptz` | |

Un trigger recalcula `orders.extra_revenue_total` y `orders.extra_cost_total` en
cada alta, edición o baja. Recalcula desde cero en vez de sumar diferencias, así
un UPDATE o un DELETE no pueden dejar el total desfasado.

### `ad_spend`

Inversión publicitaria por fecha. Una misma fecha admite varias filas
(campañas o plataformas distintas).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `spend_date` | `date` | Indexado |
| `amount` | `integer` | **Mayor a cero** |
| `note` | `text` | Opcional |
| `created_by` | `uuid` | Opcional |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` con trigger |

### `abandoned_checkouts`

Checkouts iniciados y no completados. **Solo el esquema**: la captura llega en
una fase posterior, desde un endpoint server-side. `anon` no tiene ningún
privilegio, así que no se puede insertar desde el navegador.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `session_key` | `text` | **Único**, no vacío |
| `customer_name` / `customer_whatsapp` / `customer_city` | `text` | Opcionales |
| `pack_id` | `text` | Opcional |
| `pack_qty` | `integer` | Opcional, mayor a cero |
| `has_extra` | `boolean` | Default `false` |
| `shipping_zone` | `text` | Opcional. `asuncion` \| `interior` |
| `current_step` | `text` | Opcional |
| `status` | `text` | `abandoned` \| `converted`. Default `abandoned` |
| `converted_order_id` | `uuid` | Opcional. FK → `orders.id`, `on delete set null` |
| `created_at` / `updated_at` / `last_seen_at` | `timestamptz` | |
| `archived_at` | `timestamptz` | Opcional |

---

## Relaciones

```
orders ─┬─< order_items           (order_id, ON DELETE CASCADE)
        ├─< order_status_history  (order_id, ON DELETE CASCADE)
        ├─< order_adjustments     (order_id, ON DELETE CASCADE)
        └─< abandoned_checkouts   (converted_order_id, ON DELETE SET NULL)

auth.users ─┬─< admin_users                      (user_id,   ON DELETE CASCADE)
            ├─· orders.archived_by / created_by  (ON DELETE SET NULL)
            ├─· order_status_history.changed_by  (ON DELETE SET NULL)
            ├─· order_adjustments.created_by     (ON DELETE SET NULL)
            ├─· ad_spend.created_by              (ON DELETE SET NULL)
            └─· business_settings.updated_by     (ON DELETE SET NULL)

orders.payment_link_key ··· payment_links.key   (referencia lógica, sin FK)
```

`admin_users` usa `cascade` porque una cuenta borrada no debe dejar un permiso
huérfano. El resto de las referencias a `auth.users` usa `set null`: borrar a una
persona no puede borrar el histórico de pedidos que registró.

`payment_link_key` no lleva foreign key a propósito: si algún día se borra o
se rota un link de pago, el histórico del pedido tiene que sobrevivir con la
clave que se usó en su momento.

---

## Estados

**`payment_method`**
`transferencia` · `tarjeta` · `efectivo`

`efectivo` existe solo para pedidos manuales. El checkout web sigue ofreciendo
únicamente transferencia y tarjeta.

**`payment_status`** — default `pendiente_transferencia`
`pendiente_transferencia` · `pendiente_pago_online` · `pagado` · `fallido` · `cancelado`

**`order_status`** — default `nuevo`
`nuevo` · `confirmado` · `preparando` · `enviado` · `entregado` · `cancelado`

**`source`** — default `web`
`web` (checkout público) · `manual` (cargado desde el panel)

En el panel, los estados de pago se agrupan visualmente en tres:
**Pendiente** (`pendiente_transferencia` y `pendiente_pago_online`),
**Pagado** (`pagado`) y **Cancelado** (`cancelado`). `fallido` se muestra aparte.
Es una agrupación de presentación: los valores guardados no cambian.

Se implementaron como constraints `CHECK` y no como `enum` de PostgreSQL: un
`CHECK` se amplía con un simple `ALTER TABLE ... DROP/ADD CONSTRAINT`, mientras
que agregar valores a un `enum` en uso es bastante más rígido.

---

## Moneda

**Todos los montos son enteros en guaraníes.** El guaraní no tiene centavos, así
que no se usa `numeric` ni `money`: `integer` evita de raíz cualquier error de
redondeo. El techo de `integer` son 2.147.483.647 Gs, muy por encima de
cualquier pedido real.

---

## Cómo se genera el número de pedido

Formato: **`GRT-YYYYMMDD-NNNNNN`** — por ejemplo `GRT-20260727-000106`.

1. La tabla `order_number_counters` guarda un contador por día.
2. Cada pedido nuevo hace un UPSERT sobre la fila del día:

   ```sql
   insert into order_number_counters (day, last_value)
   values (hoy, 1)
   on conflict (day) do update set last_value = c.last_value + 1
   returning last_value;
   ```

3. El UPSERT es **atómico**: PostgreSQL toma un lock de fila sobre el contador
   del día, así que dos pedidos simultáneos se serializan y ninguno puede leer
   el mismo valor. No hay condición de carrera ni hacen falta reintentos.
4. El número se arma en `next_order_number()` y lo aplica el trigger
   `orders_set_order_number` (BEFORE INSERT).

**Por qué no otras opciones**

- Una `sequence` no se puede reiniciar por día de forma transaccional.
- `max(order_number) + 1` sí tiene condición de carrera bajo concurrencia.

**Zona horaria.** El día se calcula en `America/Asuncion`, no en UTC. Con UTC,
un pedido hecho a las 21:00 de Asunción contaría como del día siguiente.

**Origen del dato.** El número lo genera exclusivamente la base. No depende del
navegador ni de nada que mande el cliente: el endpoint server-side no envía
`order_number`. El trigger solo respeta un valor externo si viene explícito y no
vacío, lo que deja abierta la puerta a importar pedidos históricos con su
número original.

**Verificado bajo concurrencia:** 12 sesiones paralelas insertando 25 pedidos
cada una (300 en total) produjeron 300 números distintos, contiguos de 1 a 300,
con cero duplicados.

---

## Política de RLS

**Row Level Security está activo en las diez tablas, y no hay ninguna política.**

Con RLS activo y sin políticas, el efecto es:

| Rol | Acceso |
|---|---|
| `anon` (navegador, sin sesión) | **ninguno** |
| `authenticated` (navegador, con sesión) | **ninguno** |
| `service_role` (servidor) | total — saltea RLS por definición |

Esto vale también **con el panel andando**: estar autenticado en Supabase Auth
no da acceso a ninguna tabla. El panel no consulta la base desde el navegador;
todo pasa por el servidor, que primero verifica `admin_users`.

Además, como defensa en profundidad, las migraciones:

- **revocan** todos los privilegios de tabla a `anon` y `authenticated`, para que
  un descuido futuro al crear una política no abra la puerta sola;
- **grantean explícitamente** los privilegios a `service_role` sobre cada tabla,
  en vez de depender de los *default privileges* de Supabase (así cada migración
  es autocontenida);
- **dejan el contador de numeración sin grants** para todos los roles de
  aplicación, incluido `service_role`: solo lo toca la función
  `next_order_number()`, que es `SECURITY DEFINER`.

### `admin_users` es de solo lectura para el servidor

`admin_users` es la única tabla donde `service_role` tiene **solo `SELECT`**:

```sql
revoke all    on public.admin_users from service_role;
grant  select on public.admin_users to   service_role;
```

El servidor necesita leerla para autorizar; no necesita —y por lo tanto no
puede— crear ni modificar administradores. Alta, baja y cambios de rol se hacen
exclusivamente desde el SQL Editor del proyecto, que corre como dueño de la base
(ver `scripts/agregar_admins.sql`).

Consecuencia buscada: **nadie puede promoverse a sí mismo a administrador**, ni
siquiera en el peor escenario de la secret key filtrada y un endpoint
comprometido.

### Qué clave se usa dónde

| Variable | Lado | Para qué |
|---|---|---|
| `SUPABASE_URL` | servidor | URL del proyecto |
| `SUPABASE_SECRET_KEY` | servidor | Clave con permisos de `service_role` |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador | URL del proyecto, para Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador | Publishable key, **solo para Auth** |

- Las dos del servidor **no** llevan prefijo `NEXT_PUBLIC_`, así que Next no las
  expone al navegador.
- Solo las lee `lib/supabase-admin.ts`, que empieza con `import "server-only"`:
  si algún componente de cliente llegara a importarlo, **el build falla**
  (verificado en cada fase importándolo a propósito desde un componente de
  cliente).
- Lo mismo vale para `lib/supabase-server.ts` y `lib/admin-auth.ts`.
- La publishable key **solo sirve para autenticar**. Con RLS activo y sin
  políticas no puede leer ni escribir ninguna tabla de Grit, así que aunque se
  filtrara —viaja en cada request del navegador, es pública por diseño— no puede
  tocar pedidos ni ver quién es administrador.
- Verificado en el build: la publishable key aparece únicamente en el chunk de
  `/admin`. Ni la landing, ni `/producto`, ni `/checkout`, ni `/gracias` la
  cargan.

Este archivo no contiene ninguna credencial, ni la URL del proyecto, ni la anon
key, ni la publishable key, ni la service role key, ni tokens, ni emails, ni
links de pago reales.

---

## Creación transaccional de pedidos (`create_order`)

La segunda migración agrega dos columnas a `orders` y la función que usa el
endpoint.

| Columna | Para qué |
|---|---|
| `confirmation_token` | UUID único que abre `/gracias`. Se usa en lugar de `order_number` porque ese es secuencial y adivinable |
| `idempotency_key` | UUID único del intento lógico de pedido |

### Atomicidad

`public.create_order(...)` inserta el pedido, sus ítems y la primera entrada del
historial. El cuerpo de una función plpgsql corre dentro de la transacción del
llamador, así que **si falla un ítem o el historial, se revierte también el
pedido**: nunca queda un pedido a medio crear. Verificado en local forzando un
ítem inválido: la tabla `orders` no cambió y la `idempotency_key` quedó libre
para reintentar.

### Idempotencia

1. Antes de insertar, la función busca `idempotency_key`. Si ya existe,
   devuelve el pedido existente con `is_duplicate = true`.
2. Si dos llamadas concurrentes pasan juntas esa comprobación, la constraint
   `UNIQUE` hace fallar a una. Ese `unique_violation` se captura y se resuelve
   releyendo el pedido que ganó.

Resultado: **una misma clave nunca produce dos pedidos**, ni siquiera en
carrera. Verificado con 20 llamadas concurrentes usando la misma clave: se creó
un solo pedido (una respuesta con `is_duplicate=false` y 19 con `true`), con un
solo ítem y una sola entrada de historial.

El navegador genera la clave y la reutiliza mientras reintenta el mismo pedido;
solo la renueva si cambia el contenido (pack, cantidad, extra, zona, VIP o
método de pago). Corregir un dato de contacto no la renueva.

### Recálculo de precios en el servidor

La función **no** valida reglas de negocio ni recalcula precios: recibe valores
ya calculados. Quien los calcula es `lib/pedidos.ts`, en el endpoint, a partir
del catálogo de `lib/content.ts`. Del navegador solo se acepta *qué* quiere
comprar el cliente y su contacto; cualquier `total`, `subtotal` o precio que
venga en el request se ignora por completo.

### Estrategia de limpieza del carrito

El carrito **no** se borra al enviar el formulario. La secuencia es:

1. El endpoint responde OK → el checkout escribe `grit:cart:limpiar` en
   `localStorage` con el token del pedido.
2. `/gracias` carga y encuentra el pedido → `<LimpiarCarrito />` borra
   `grit:cart:v1` y la marca.
3. Si el endpoint falla, la marca nunca se escribe y el carrito queda intacto
   para reintentar.

Un refresh de `/gracias` no puede crear otro pedido: la página solo lee. Y como
la marca se borra en la primera limpieza, un refresh posterior no toca nada.

---

## Snapshot de costos (`create_order`, migración 5)

Al crear un pedido web, la función congela cuatro datos que después no vuelve a
tocar nunca:

| Dato | Cómo se calcula |
|---|---|
| `product_cost_total` | `p_units × business_settings.product_cost_per_bracelet` |
| `logistics_cost` | El costo de la zona real: `asuncion` o `interior` |
| `customer_free_shipping` | `p_shipping_cost = 0` |
| `sale_date` | `(now() at time zone 'America/Asuncion')::date` |

Y fija `source = 'web'`.

`p_units` es la cantidad de pulseras, **incluida la extra promocional**. La
calcula el servidor en `lib/pedidos.ts` a partir del catálogo; no llega nunca
del navegador. La función rechaza un pedido con cero pulseras.

El parámetro va **al final de la firma y con default `null`**, para que una
llamada con los 17 argumentos anteriores siga siendo válida: en ese caso la
cantidad se deriva de los propios ítems (`bundle_id` es la cantidad de pulseras
del pack; la extra promocional no lleva `bundle_id` y cuenta como una). Es lo
que permite aplicar la migración antes o después del deploy sin romper nada.

`customer_free_shipping` se **deriva** de `p_shipping_cost` en vez de recibirse
como parámetro aparte, para que los dos datos no puedan contradecirse.

### Qué no cambia el snapshot

- **Un reintento.** La comprobación de `idempotency_key` ocurre *antes* de leer
  los costos: si el pedido ya existía, la función devuelve el existente sin
  tocarlo. Verificado subiendo el costo de la pulsera entre el primer intento y
  el segundo: el snapshot quedó en el valor original.
- **Editar `business_settings`.** Los pedidos anteriores conservan sus números;
  solo los posteriores toman los nuevos. Verificado.
- **El VIP.** Suma ingreso vía `vip_shipping_cost` y no agrega costo logístico.
- **El envío gratis.** El cliente paga Gs. 0, pero `logistics_cost` guarda igual
  lo que gastó el negocio.

Los pedidos anteriores a la migración 4 recibieron el snapshot en un backfill
único, con la misma fórmula y los costos vigentes al aplicarla. Dejarlos en cero
habría sido peor: un pedido con costo 0 aparece en los reportes con 100 % de
margen, que es un número falso.

---

## Autorización de `/admin`

Dos comprobaciones encadenadas, las dos **en el servidor**:

1. **Autenticación** — `supabase.auth.getUser()` con la sesión de las cookies.
   Se usa `getUser()` y no `getSession()`: el primero valida el token contra
   Supabase Auth, el segundo confía en la cookie tal como llegó.
2. **Autorización** — se busca ese `user_id` en `admin_users` con la service
   role. Sin una fila con `is_active = true` no se entra, **por más que la
   cuenta exista en Auth**. En ningún momento se autoriza por email.

La regla está aislada en `lib/admin-acceso.ts` (función pura, sin red ni base) y
la orquesta `lib/admin-auth.ts`. Falla cerrado: si la consulta de autorización
falla, no hay permiso.

`/admin` es un Server Component con `dynamic = "force-dynamic"`. No existe una
versión "completa" de la página escondida detrás de un `if` del cliente, así que
no hay nada que revelar desactivando JavaScript ni inspeccionando el bundle.

Un `middleware.ts` acotado a `/admin/:path*` refresca el token cuando expira —un
Server Component puede leer cookies pero no escribirlas—. **No** es la
autorización: solo mantiene viva la sesión.

Verificado de punta a punta contra un stub local de Supabase Auth + PostgREST:
cuenta sin fila → «Acceso no autorizado»; cuenta con fila inactiva → «Acceso no
autorizado»; cuenta activa → panel; sesión que sobrevive al recargado y a otra
pestaña; «Salir» que vuelve al login; y una cookie de sesión editada a mano para
suplantar al administrador activo que **no** abre el panel.

---

## Creación de pedidos manuales (`create_manual_order`, migración 6)

El equivalente administrativo de `create_order`, para las ventas cerradas por
WhatsApp, en persona o por Instagram.

Hace exactamente lo mismo que el alta web —pedido, ítems e historial en UNA
transacción, con el snapshot de costos leído de `business_settings`— y se
diferencia en cuatro cosas:

| | `create_order` | `create_manual_order` |
|---|---|---|
| `source` | `web` | `manual` |
| `created_by` | queda en `null` | obligatorio, verificado contra `admin_users` |
| `sale_date` | hoy en America/Asuncion | la elige quien carga el pedido |
| `order_status` inicial | siempre `nuevo` | cualquiera de los válidos |

`p_created_by` se verifica DENTRO de la función: tiene que existir en
`admin_users` con `is_active = true`. Ni siquiera con la service role se puede
atribuir un pedido manual a alguien que no es administrador activo.

Es idempotente por `idempotency_key`, igual que el alta web: repetir la clave
devuelve el pedido existente con `is_duplicate = true` y no toca su snapshot.

Solo `service_role` puede ejecutarla.

---

## Borrado lógico de `ad_spend` (migración 6)

`ad_spend` suma `archived_at` y `archived_by`. Eliminar una inversión desde el
panel escribe `archived_at`: la fila queda en la base y deja de contar en el
CPA, el ROAS, la ganancia neta y el margen neto. **No hay ningún camino en el
código que borre una fila de `ad_spend` físicamente.**

---

## Checkouts abandonados

`abandoned_checkouts` suma `converted_at` y `archived_by`, más dos constraints
`NOT VALID` (aplican a lo nuevo, no revisan lo existente):

- `current_step` solo puede ser `contacto`, `entrega`, `seleccion`, `pago` o
  `review`.
- Un checkout `converted` tiene que decir a qué pedido fue.

Quién escribe qué:

| Campo | Lo escribe |
|---|---|
| contacto, selección, zona, `current_step`, `last_seen_at` | `POST /api/checkout-abandonado`, desde el checkout público |
| `status`, `converted_order_id`, `converted_at` | El servidor, al crear el pedido |
| `archived_at`, `archived_by` | El panel |

El endpoint público **nunca** lee `status`, `converted_order_id` ni
`archived_at` del navegador, y responde 204 sin cuerpo: no devuelve datos de
nadie, ni siquiera de quien lo llama.

---

## Qué queda pendiente

- Carga de los links reales en `payment_links` y redirección al pago externo
  para el método `tarjeta` (hoy va a `/gracias`, que muestra el pago online
  como pendiente).
- Trigger opcional que registre automáticamente en `order_status_history` cada
  cambio de `order_status` o `payment_status`.
- Tablas de la aplicación NFC, en su propia migración.

---

## Cómo aplicar las migraciones manualmente

Desde el **SQL Editor** de Supabase, una por vez y **en orden de nombre**:

1. Entrá al proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. **New query**.
3. Copiá el contenido completo de la migración que toque aplicar y pegalo.
4. **Run**.
5. Pasá a la siguiente. No saltees ninguna y no vuelvas atrás.

Orden completo:

```
1. migrations/20260727_grit_ecommerce_foundation.sql   ✅ ya aplicada
2. migrations/20260728_grit_orders_transactional.sql   ✅ ya aplicada
3. migrations/20260729_grit_admin_foundation.sql       ← aplicar
4. migrations/20260730_grit_admin_orders_costs.sql     ← aplicar
5. migrations/20260731_grit_create_order_costs.sql     ← aplicar
```

Después, y solo entonces:

```
6. scripts/agregar_admins.sql   ← reemplazando los cuatro placeholders
```

> El checkout sigue funcionando durante todo el proceso: `p_units` es opcional,
> así que ni la versión desplegada vieja ni la nueva se rompen mientras se
> aplican las migraciones.

Cada migración corre dentro de una transacción: si algo falla, no queda nada a
medio aplicar.

### Comprobación después de aplicar

```sql
-- Las diez tablas, con RLS activo y sin políticas
select c.relname                                                as tabla,
       c.relrowsecurity                                         as rls_activo,
       (select count(*) from pg_policies p where p.tablename = c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- business_settings tiene exactamente una fila, con los costos iniciales
select * from public.business_settings;

-- Queda una sola versión de create_order, la de 18 parámetros
select pg_get_function_identity_arguments(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'create_order';

-- service_role puede leer admin_users pero no escribirla
select has_table_privilege('service_role', 'public.admin_users', 'select') as puede_leer,
       has_table_privilege('service_role', 'public.admin_users', 'insert') as puede_insertar;
```

Lo esperado: diez tablas con `rls_activo = t` y `politicas = 0`; una sola fila
en `business_settings` con 9500 / 20000 / 30000; una sola firma de
`create_order` terminada en `p_units integer, p_items jsonb, p_metadata jsonb`;
y `puede_leer = t`, `puede_insertar = f`.

Los pedidos existentes tienen que haber quedado con su snapshot cargado:

```sql
select order_number, source, sale_date, customer_free_shipping,
       product_cost_total, logistics_cost
  from public.orders
 order by created_at;
```

### Con la CLI de Supabase (opcional)

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

La CLI toma las migraciones de `supabase/migrations/` por orden de nombre.
