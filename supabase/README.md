# Supabase · Base de datos de Grit

Este directorio contiene las migraciones SQL versionadas del proyecto de
Supabase de Grit.

Un **único** proyecto de Supabase va a alojar, con el tiempo:

1. El ecommerce y el panel administrador
2. La aplicación NFC de Grit

Esta primera migración cubre **solo el ecommerce**. Las tablas de la aplicación
NFC llegan en una migración aparte; por eso todos los objetos de acá llevan
nombres del dominio de pedidos y se evitan nombres genéricos (`items`, `users`,
`links`) que puedan chocar más adelante.

---

## Migraciones

| Archivo | Contenido | Estado |
|---|---|---|
| `migrations/20260727_grit_ecommerce_foundation.sql` | Fundación del ecommerce: pedidos, ítems, historial de estados y links de pago | ✅ aplicada |
| `migrations/20260728_grit_orders_transactional.sql` | `confirmation_token`, `idempotency_key` y la función `create_order` | ⏳ pendiente de aplicar |

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
| `created_at` | `timestamptz` | |

Una fila necesita al menos uno de los tres campos con contenido.

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

---

## Relaciones

```
orders ─┬─< order_items           (order_id, ON DELETE CASCADE)
        └─< order_status_history  (order_id, ON DELETE CASCADE)

orders.payment_link_key ··· payment_links.key   (referencia lógica, sin FK)
```

`payment_link_key` no lleva foreign key a propósito: si algún día se borra o
se rota un link de pago, el histórico del pedido tiene que sobrevivir con la
clave que se usó en su momento.

---

## Estados

**`payment_method`**
`transferencia` · `tarjeta`

**`payment_status`** — default `pendiente_transferencia`
`pendiente_transferencia` · `pendiente_pago_online` · `pagado` · `fallido` · `cancelado`

**`order_status`** — default `nuevo`
`nuevo` · `confirmado` · `preparando` · `enviado` · `entregado` · `cancelado`

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

**Row Level Security está activo en las cinco tablas, y no hay ninguna política.**

Con RLS activo y sin políticas, el efecto es:

| Rol | Acceso |
|---|---|
| `anon` (navegador, sin sesión) | **ninguno** |
| `authenticated` (navegador, con sesión) | **ninguno** |
| `service_role` (servidor) | total — saltea RLS por definición |

Además, como defensa en profundidad, la migración:

- **revoca** todos los privilegios de tabla a `anon` y `authenticated`, para que
  un descuido futuro al crear una política no abra la puerta sola;
- **grantea explícitamente** `select, insert, update, delete` a `service_role`
  sobre las cuatro tablas de aplicación, en vez de depender de los *default
  privileges* de Supabase (así la migración es autocontenida);
- **deja el contador de numeración sin grants** para todos los roles de
  aplicación, incluido `service_role`: solo lo toca la función
  `next_order_number()`, que es `SECURITY DEFINER`.

### Qué clave se usa en el servidor

Los pedidos se insertan y se leen **exclusivamente** desde el servidor, con dos
variables de entorno:

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SECRET_KEY` | Clave con permisos de `service_role` |

- Ninguna de las dos lleva prefijo `NEXT_PUBLIC_`, así que Next **no las expone**
  al navegador.
- Solo las lee `lib/supabase-admin.ts`, que empieza con `import "server-only"`:
  si algún componente de cliente llegara a importarlo, **el build falla**.
- Los únicos archivos que importan ese módulo son `app/api/pedidos/route.ts` y
  `app/gracias/page.tsx`, ambos de servidor.
- La `anon key` no sirve para leer ni escribir en estas tablas, por diseño:
  aunque se filtrara, no puede tocar pedidos.

Este archivo no contiene ninguna credencial, ni la URL del proyecto, ni la anon
key, ni la service role key, ni tokens, ni links de pago reales.

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

## Qué queda pendiente para la Fase 5B

- Carga de los links reales en `payment_links` y redirección al pago externo
  para el método `tarjeta` (hoy va a `/gracias`, que muestra el pago online
  como pendiente).
- Notificación por Telegram.
- Panel administrador y Supabase Auth, con las políticas de RLS para
  `authenticated` acotadas por rol.
- Trigger opcional que registre automáticamente en `order_status_history` cada
  cambio de `order_status` o `payment_status`.
- Tablas de la aplicación NFC, en su propia migración.

---

## Cómo aplicar la migración manualmente

Desde el **SQL Editor** de Supabase:

1. Entrá al proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. **New query**.
3. Copiá el contenido completo de la migración que toque aplicar y pegalo.
   Las migraciones se aplican **en orden de nombre**: primero
   `20260727_grit_ecommerce_foundation.sql` (ya aplicada), después
   `20260728_grit_orders_transactional.sql`.
4. **Run**.
5. Verificá en **Table Editor** que aparecen las cinco tablas: `orders`,
   `order_items`, `order_status_history`, `payment_links` y
   `order_number_counters`.
6. Verificá en **Authentication → Policies** que las cinco figuran con RLS
   activo y **sin políticas**.

La migración corre dentro de una transacción: si algo falla, no queda nada a
medio aplicar. Es idempotente, así que volver a correrla es seguro — la segunda
vez solo emite avisos de tipo `already exists, skipping`.

### Comprobación rápida después de aplicar

```sql
-- Las cinco tablas, con RLS activo y sin políticas
select c.relname                                                as tabla,
       c.relrowsecurity                                         as rls_activo,
       (select count(*) from pg_policies p where p.tablename = c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- La numeración funciona (esto NO crea ningún pedido)
select public.next_order_number();
```

> El `select public.next_order_number()` consume un número del contador del día.
> Si querés dejar el contador en cero después de probar:
> `delete from public.order_number_counters;`

### Con la CLI de Supabase (opcional)

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

La CLI toma las migraciones de `supabase/migrations/` por orden de nombre.
