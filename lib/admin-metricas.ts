/**
 * Cálculo de las métricas del panel — función pura.
 *
 * Recibe las filas de `orders` del período (ya filtradas en SQL por rango de
 * fechas y sin archivadas) más el total de Ad Spend, y devuelve los catorce
 * números del dashboard. No toca la base: por eso se puede testear con arrays
 * a mano y sin infraestructura.
 *
 * QUÉ PEDIDO CUENTA
 *   Para todo lo financiero, solo los pedidos VÁLIDOS:
 *     · payment_status = 'pagado'
 *     · order_status  <> 'cancelado'
 *     · archived_at    is null   (ya excluidos en la consulta)
 *   Un pedido pendiente todavía no es plata en la caja, y uno cancelado no
 *   facturó aunque en algún momento figurara como pagado.
 *
 *   "Cancelados" es la única métrica que mira fuera de ese conjunto: cuenta los
 *   pedidos cancelados del período, que por definición no son válidos.
 *
 * DIVISIÓN POR CERO
 *   AOV, CPA, ROAS y los dos márgenes devuelven `null` —no cero, no NaN, no
 *   Infinity— cuando su divisor es cero. Cero diría "el ticket promedio fue de
 *   Gs. 0", que es falso; `null` dice "no hay dato", que es lo cierto, y la
 *   interfaz lo muestra como el valor neutro correspondiente.
 */

/** Las columnas de `orders` que hacen falta para medir. Nada más. */
export type FilaMetrica = {
  total: number | null;
  product_cost_total: number | null;
  logistics_cost: number | null;
  extra_cost_total: number | null;
  extra_revenue_total: number | null;
  source: string | null;
  payment_status: string | null;
  order_status: string | null;
};

export type Metricas = {
  pedidosConfirmados: number;
  ingresoTotal: number;
  aov: number | null;
  cancelados: number;
  costoProductoLogistica: number;
  gananciaBruta: number;
  margenBruto: number | null;
  adSpend: number;
  cpa: number | null;
  roas: number | null;
  gananciaNeta: number;
  margenNeto: number | null;
  pedidosWeb: number;
  pedidosManuales: number;
};

const num = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/** División que devuelve `null` en lugar de `NaN` o `Infinity`. */
const dividir = (a: number, b: number): number | null =>
  b > 0 && Number.isFinite(a / b) ? a / b : null;

/** Un pedido cuenta para la plata solo si está cobrado y no fue cancelado. */
export const esPedidoValido = (f: FilaMetrica): boolean =>
  f.payment_status === "pagado" && f.order_status !== "cancelado";

/**
 * Un pedido está cancelado si lo está la entrega o si el cobro terminó en
 * cancelado o fallido. Es la misma regla que decide la píldora "Cancelado" de
 * la tabla, así que la tarjeta y el listado no pueden contradecirse.
 */
export const esPedidoCancelado = (f: FilaMetrica): boolean =>
  f.order_status === "cancelado" ||
  f.payment_status === "cancelado" ||
  f.payment_status === "fallido";

/**
 * @param filas   Pedidos del período, SIN archivados.
 * @param adSpend Inversión publicitaria del período, en guaraníes.
 */
export function calcularMetricas(
  filas: FilaMetrica[],
  adSpend: number,
): Metricas {
  const validos = filas.filter(esPedidoValido);

  // Ingreso = lo facturado más los ajustes que suman.
  //
  // `extra_revenue_total` ES la suma de `order_adjustments.revenue_amount` de
  // ese pedido: la mantiene un trigger en la base. Por eso se suma una sola
  // vez y no hace falta volver a consultar la tabla de ajustes.
  const ingresoTotal = validos.reduce(
    (acc, f) => acc + num(f.total) + num(f.extra_revenue_total),
    0,
  );

  // Costo = producto + logística + ajustes que restan. `extra_cost_total` es,
  // igual que arriba, la suma de `order_adjustments.cost_amount`.
  const costoProductoLogistica = validos.reduce(
    (acc, f) =>
      acc + num(f.product_cost_total) + num(f.logistics_cost) + num(f.extra_cost_total),
    0,
  );

  const inversion = Math.max(0, num(adSpend));
  const gananciaBruta = ingresoTotal - costoProductoLogistica;
  const gananciaNeta = gananciaBruta - inversion;
  const n = validos.length;

  return {
    pedidosConfirmados: n,
    ingresoTotal,
    aov: dividir(ingresoTotal, n),
    cancelados: filas.filter(esPedidoCancelado).length,
    costoProductoLogistica,
    gananciaBruta,
    margenBruto: dividir(gananciaBruta, ingresoTotal),
    adSpend: inversion,
    cpa: dividir(inversion, n),
    roas: dividir(ingresoTotal, inversion),
    gananciaNeta,
    margenNeto: dividir(gananciaNeta, ingresoTotal),
    pedidosWeb: validos.filter((f) => f.source === "web").length,
    pedidosManuales: validos.filter((f) => f.source === "manual").length,
  };
}

/** Métricas en cero, para el estado de error: la interfaz nunca ve `undefined`. */
export const METRICAS_VACIAS: Metricas = calcularMetricas([], 0);
