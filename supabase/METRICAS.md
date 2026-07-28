# Métricas del panel administrativo

Este documento define **qué pedidos cuentan** y **cómo se calcula cada número**.
Es la referencia para cuando se construya el dashboard: mientras las consultas
salgan de acá, dos pantallas distintas no van a mostrar cifras distintas.

Todos los montos son **enteros en guaraníes**. No hay dólares ni tipo de cambio.

---

## 1. Qué pedidos cuentan

Un pedido entra en las métricas de ingresos y ganancia solo si cumple **las tres**
condiciones:

| Condición | Columna |
|---|---|
| Está pagado | `payment_status = 'pagado'` |
| No está cancelado | `order_status <> 'cancelado'` |
| No está archivado | `archived_at is null` |

En SQL, el filtro base:

```sql
create or replace view -- (referencia; no hace falta crearla)
  pedidos_validos as
select *
  from public.orders
 where payment_status = 'pagado'
   and order_status  <> 'cancelado'
   and archived_at    is null;
```

### Por qué cada condición

- **`payment_status = 'pagado'`** — un pedido pendiente todavía no es plata en la
  caja. Los dos estados pendientes (`pendiente_transferencia` y
  `pendiente_pago_online`) se muestran juntos como **«Pendiente»** en el panel,
  pero ninguno de los dos suma a los ingresos.
- **`order_status <> 'cancelado'`** — un pedido cancelado no factura ni deja
  ganancia, aunque en algún momento se haya marcado como pagado.
- **`archived_at is null`** — archivar es el borrado lógico del panel. El pedido
  sigue en Supabase y se puede restaurar, pero queda fuera de los reportes.

### Agrupación por fecha

Los reportes por día, semana o mes usan **`sale_date`**, no `created_at`.
`created_at` es un `timestamptz` guardado en UTC: un pedido de las 21:00 de
Asunción caería en el día siguiente. `sale_date` ya está en `America/Asuncion`.

El Ad Spend se agrupa por su propio `spend_date`, que también es una fecha del
negocio.

---

## 2. Fórmulas

Con `P` = el conjunto de pedidos válidos del período y `A` = las filas de
`ad_spend` del mismo período:

| Métrica | Fórmula |
|---|---|
| **Pedidos confirmados** | `count(P)` |
| **Ingreso total** | `Σ (total + extra_revenue_total)` |
| **Costo producto/logística** | `Σ (product_cost_total + logistics_cost + extra_cost_total)` |
| **Ganancia bruta** | `ingreso − costo` |
| **Margen bruto** | `ganancia bruta / ingreso` |
| **Ad Spend** | `Σ ad_spend.amount` |
| **Ganancia neta** | `ganancia bruta − ad spend` |
| **Margen neto** | `ganancia neta / ingreso` |
| **AOV** (ticket promedio) | `ingreso / pedidos confirmados` |
| **CPA** | `ad spend / pedidos confirmados` |
| **ROAS** | `ingreso / ad spend` |
| **Cancelados** | `count` de pedidos con `order_status = 'cancelado'` |
| **Pedidos web** | `count(P)` con `source = 'web'` |
| **Pedidos manuales** | `count(P)` con `source = 'manual'` |

`extra_revenue_total` y `extra_cost_total` son las sumas de `order_adjustments`
de cada pedido, mantenidas al día por un trigger. Por eso las fórmulas de arriba
ya incluyen los ajustes sin necesidad de un `join` adicional.

> **Los ajustes se suman una sola vez.** En este esquema, «`extra_cost_total`» y
> «la suma de `cost_amount` de los ajustes» son exactamente el mismo número —lo
> mantiene el trigger `order_adjustments_sync`—, igual que
> `extra_revenue_total` y la suma de `revenue_amount`. Sumar los dos nombres
> contaría cada ajuste dos veces, así que las fórmulas usan la columna y no
> vuelven a consultar `order_adjustments`.

**Cancelados** se cuenta aparte, con su propio filtro: no puede salir de `P`,
que justamente los excluye. Sí se les aplica `archived_at is null`, para no
contar dos veces un pedido que además se archivó.

### División por cero

**Cuatro métricas pueden dividir por cero** y ninguna debe romper la pantalla:

| Métrica | Divisor | Cuándo es cero |
|---|---|---|
| AOV | pedidos confirmados | un período sin ventas pagadas |
| CPA | pedidos confirmados | idem |
| ROAS | ad spend | un período sin inversión publicitaria |
| Margen | ingreso | un período sin ingresos |

La regla es **devolver `null`, no cero**: cero significaría "el ticket promedio
fue de Gs. 0", que es falso. `null` significa "no hay dato", que es lo cierto, y
la interfaz lo muestra como `—`.

```sql
case when pedidos > 0 then ingreso / pedidos end  as aov,
case when pedidos > 0 then ad_spend / pedidos end as cpa,
case when ad_spend > 0 then ingreso::numeric / ad_spend end as roas,
case when ingreso > 0 then (ingreso - costo)::numeric / ingreso end as margen
```

---

## 3. Consulta de referencia

Un período cerrado, con todas las métricas de una sola pasada:

```sql
with validos as (
  select o.*
    from public.orders o
   where o.payment_status = 'pagado'
     and o.order_status  <> 'cancelado'
     and o.archived_at    is null
     and o.sale_date between :desde and :hasta
),
agg as (
  select
    count(*)                                                              as pedidos,
    count(*) filter (where source = 'web')                                as pedidos_web,
    count(*) filter (where source = 'manual')                             as pedidos_manuales,
    coalesce(sum(total + extra_revenue_total), 0)                          as ingreso,
    coalesce(sum(product_cost_total + logistics_cost + extra_cost_total), 0) as costo
    from validos
),
ads as (
  select coalesce(sum(amount), 0) as gasto
    from public.ad_spend
   where spend_date between :desde and :hasta
),
cancelados as (
  select count(*) as n
    from public.orders
   where order_status = 'cancelado'
     and archived_at is null
     and sale_date between :desde and :hasta
)
select
  a.pedidos,
  a.pedidos_web,
  a.pedidos_manuales,
  c.n                                        as cancelados,
  a.ingreso,
  a.costo,
  a.ingreso - a.costo                        as ganancia_bruta,
  ads.gasto                                  as ad_spend,
  a.ingreso - a.costo - ads.gasto            as ganancia_neta,
  case when a.pedidos  > 0 then a.ingreso / a.pedidos end                              as aov,
  case when a.pedidos  > 0 then ads.gasto / a.pedidos end                              as cpa,
  case when ads.gasto  > 0 then round(a.ingreso::numeric / ads.gasto, 2) end           as roas,
  case when a.ingreso  > 0 then round((a.ingreso - a.costo)::numeric / a.ingreso, 4) end as margen_bruto,
  case when a.ingreso  > 0
       then round((a.ingreso - a.costo - ads.gasto)::numeric / a.ingreso, 4) end       as margen_neto
  from agg a cross join ads cross join cancelados c;
```

---

## 4. De dónde sale cada costo

### Costo de producto

`orders.product_cost_total` es un **snapshot**: la cantidad de pulseras del
pedido multiplicada por `business_settings.product_cost_per_bracelet` **al
momento de la venta**. Lo escribe `create_order` y no se recalcula nunca más.

La cantidad de pulseras incluye la **pulsera extra promocional**: si alguien
compra el pack de 2 y agrega la extra, son 3 pulseras.

Subir el costo de la pulsera en `business_settings` afecta **solo a los pedidos
posteriores**. Los históricos conservan el costo que realmente tuvieron, que es
lo único que permite comparar la ganancia de dos meses distintos.

### Costo logístico

`orders.logistics_cost` es otro snapshot, tomado de la **zona real** del pedido:

| Zona | Costo |
|---|---|
| `asuncion` (Asunción / Gran Asunción) | `business_settings.logistics_cost_asuncion` |
| `interior` (interior / encomienda) | `business_settings.logistics_cost_interior` |

**El envío gratis no es una tercera zona.** Es un dato aparte,
`customer_free_shipping`, que dice si el cliente pagó Gs. 0 de envío estándar.
El costo logístico se registra igual y se descuenta de la ganancia: el envío
gratis es una promoción que paga el negocio, no un envío que salió gratis.

Un pedido al interior con envío bonificado queda así:

```
shipping_cost           0        ← lo que pagó el cliente
customer_free_shipping  true
logistics_cost          30000    ← lo que gastó el negocio
```

### VIP

El **Envío Prioritario VIP** es ingreso adicional: entra en `total` a través de
`vip_shipping_cost` y **no agrega costo logístico**. Un pedido VIP tiene el
mismo `logistics_cost` que el mismo pedido sin VIP.

### Ajustes

`order_adjustments` cubre todo lo que no encaja en las categorías anteriores:

- `revenue_amount` — ingreso extra (un grabado, una cadena suelta). Suma a
  ingreso.
- `cost_amount` — costo extra (un envío urgente que pagó el negocio). Resta a la
  ganancia.

Ninguno de los dos admite negativos: para descontar algo se carga el concepto
del otro lado, y el historial queda legible. El detalle es obligatorio si alguno
de los dos montos supera cero.

---

## 5. Dónde está implementado

| Archivo | Qué hace |
|---|---|
| `lib/admin-metricas.ts` | Las catorce fórmulas. Función pura: recibe las filas y el Ad Spend del período, devuelve los números |
| `lib/admin-rango.ts` | Traduce el selector de rango a un `desde`/`hasta` en `America/Asuncion` |
| `lib/admin-datos.ts` | Las consultas a Supabase. **Solo servidor** (`server-only`), con la service role |
| `lib/admin-formato.ts` | Guaraníes, porcentajes, múltiplos y la normalización de estados |
| `lib/admin-filtros.ts` | Lee y valida los filtros del listado desde la URL |

Las consultas traen únicamente las columnas necesarias de los pedidos **no
archivados** del rango y agregan en JavaScript. Se prefirió esto a una función
SQL nueva para no pedir otra migración; a esta escala son unos pocos kilobytes
por consulta, y la fórmula queda testeada y a la vista. Si el volumen creciera
mucho, el reemplazo natural es una función `SECURITY DEFINER` que devuelva los
agregados ya calculados, sin cambiar nada más del panel.

---

## 6. Verificado

Las fórmulas de este documento se ejercitaron contra PostgreSQL 16 local, con la
suite de la Fase 6A:

- Las cuatro divisiones devuelven `null` —no error, ni cero— con cero pedidos y
  cero inversión.
- Archivar un pedido lo saca del conteo; restaurarlo lo devuelve.
- Cancelar un pedido pagado lo saca del conteo de ingresos.
- Un pedido con envío gratis conserva su `logistics_cost`.
- Un pedido con VIP no acumula costo logístico adicional.
- Cambiar `product_cost_per_bracelet` no altera los snapshots ya guardados.
