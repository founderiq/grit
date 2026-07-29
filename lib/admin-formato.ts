/**
 * Formato y normalización de estados del panel — funciones puras.
 *
 * Sin `server-only` a propósito: no tocan la base ni variables de entorno, así
 * que las pueden usar tanto los Server Components que renderizan las tablas
 * como cualquier control del cliente, y se testean sin infraestructura.
 *
 * Todo el formato es de Paraguay: guaraníes con punto de miles, decimales con
 * coma.
 */

/* ------------------------------------------------------------
   Números
   ------------------------------------------------------------ */

/**
 * Guaraníes. Mismo formato que el ecommerce (`Gs. 199.000`).
 *
 * Un valor ausente se muestra como `Gs. 0`, no como guion: en un panel de
 * métricas "todavía no hay datos" y "cero" significan lo mismo para el negocio.
 */
export const fmtGs = (n: number | null | undefined): string =>
  `Gs. ${Math.round(n ?? 0).toLocaleString("es-PY")}`;

/** Entero simple: `1.250`. */
export const fmtNumero = (n: number | null | undefined): string =>
  Math.round(n ?? 0).toLocaleString("es-PY");

/**
 * Porcentaje con un decimal: `42,5%`.
 *
 * Recibe la FRACCIÓN (0,425), no el porcentaje ya multiplicado. `null` es el
 * resultado de una división por cero y se muestra como `0%`.
 */
export const fmtPorcentaje = (fraccion: number | null | undefined): string => {
  if (fraccion == null || !Number.isFinite(fraccion)) return "0%";
  return `${(fraccion * 100).toLocaleString("es-PY", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
};

/** Múltiplo con dos decimales: `3,25x`. `null` (sin inversión) → `0x`. */
export const fmtMultiplo = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "0x";
  return `${n.toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}x`;
};

/** Cantidad de pedidos, con su sustantivo: `1 pedido` / `12 pedidos`. */
export const fmtPedidos = (n: number | null | undefined): string => {
  const v = Math.round(n ?? 0);
  return `${v.toLocaleString("es-PY")} ${v === 1 ? "pedido" : "pedidos"}`;
};

/* ------------------------------------------------------------
   Fechas
   ------------------------------------------------------------ */

/**
 * `sale_date` llega como `YYYY-MM-DD` (columna `date`, sin hora ni zona).
 * Se formatea partiendo el texto en lugar de construir un `Date`: `new
 * Date("2026-07-27")` se interpreta como medianoche UTC y en Asunción
 * (UTC-3/-4) mostraría el día anterior.
 */
export const fmtFechaCorta = (iso: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "—";
  return `${Number(m[3])}/${Number(m[2])}/${m[1]!.slice(2)}`;
};

/** `timestamptz` a fecha y hora de Paraguay: `27/7/26 18:42`. */
export const fmtFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const partes = new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "numeric",
    month: "numeric",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
};

/* ------------------------------------------------------------
   Estados
   ------------------------------------------------------------ */

export type EstadoPago = "pendiente" | "pagado" | "cancelado";
export type EstadoEntrega =
  | "pendiente"
  | "preparado"
  | "enviado"
  | "entregado"
  | "cancelado";

/**
 * Los cinco `payment_status` de la base se muestran en TRES estados.
 *
 * Los dos pendientes —transferencia y pago online— son lo mismo para quien
 * gestiona los pedidos: falta cobrar. `fallido` se agrupa con `cancelado`
 * porque en ninguno de los dos casos entró la plata.
 */
export const normalizarPago = (bruto: string | null | undefined): EstadoPago => {
  switch (bruto) {
    case "pagado":
      return "pagado";
    case "cancelado":
    case "fallido":
      return "cancelado";
    default:
      // pendiente_transferencia, pendiente_pago_online y cualquier valor futuro
      // que todavía no signifique cobrado.
      return "pendiente";
  }
};

/** Los seis `order_status` se muestran en CINCO estados de entrega. */
export const normalizarEntrega = (
  bruto: string | null | undefined,
): EstadoEntrega => {
  switch (bruto) {
    case "preparando":
      return "preparado";
    case "enviado":
      return "enviado";
    case "entregado":
      return "entregado";
    case "cancelado":
      return "cancelado";
    default:
      // nuevo y confirmado: el pedido todavía no se preparó.
      return "pendiente";
  }
};

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

export const ETIQUETA_ENTREGA: Record<EstadoEntrega, string> = {
  pendiente: "Pendiente",
  preparado: "Preparado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ETIQUETA_ORIGEN: Record<string, string> = {
  web: "Web",
  manual: "Manual",
};

/**
 * `payment_status` de la base que corresponden a cada estado visible. Se usa
 * para filtrar en SQL sin traer filas de más.
 */
export const PAGOS_CRUDOS: Record<EstadoPago, string[]> = {
  pendiente: ["pendiente_transferencia", "pendiente_pago_online"],
  pagado: ["pagado"],
  cancelado: ["cancelado", "fallido"],
};

export const ENTREGAS_CRUDAS: Record<EstadoEntrega, string[]> = {
  pendiente: ["nuevo", "confirmado"],
  preparado: ["preparando"],
  enviado: ["enviado"],
  entregado: ["entregado"],
  cancelado: ["cancelado"],
};

/* ------------------------------------------------------------
   Teléfono
   ------------------------------------------------------------ */

/**
 * Enlace de WhatsApp para un teléfono guardado.
 *
 * Acepta los dos formatos que valida el checkout —`09xxxxxxxx` y
 * `+5959xxxxxxxx`— y devuelve `null` para cualquier otra cosa, para no generar
 * un link roto a partir de un dato incompleto.
 */
export const enlaceWhatsapp = (bruto: string | null | undefined): string | null => {
  const limpio = (bruto ?? "").trim().replace(/[\s().-]/g, "");

  if (/^09\d{8}$/.test(limpio)) return `https://wa.me/595${limpio.slice(1)}`;
  if (/^\+5959\d{8}$/.test(limpio)) return `https://wa.me/${limpio.slice(1)}`;

  return null;
};

/* ------------------------------------------------------------
   Pedido
   ------------------------------------------------------------ */

export type ItemPedidoAdmin = {
  product_name: string | null;
  quantity: number | null;
  bundle_id: string | null;
};

/**
 * Cantidad REAL de pulseras del pedido.
 *
 * `bundle_id` guarda cuántas pulseras trae el pack ('1', '2', '3'); la pulsera
 * extra promocional no lleva bundle_id y cuenta como una. Es la misma regla que
 * usa `create_order` para congelar el costo de producto, así que la columna
 * "Cantidad" y `product_cost_total` no pueden contradecirse.
 */
export const contarPulseras = (items: ItemPedidoAdmin[] | null | undefined): number =>
  (items ?? []).reduce((acc, i) => {
    const porUnidad = /^\d+$/.test(i.bundle_id ?? "") ? Number(i.bundle_id) : 1;
    return acc + (i.quantity ?? 0) * porUnidad;
  }, 0);

/**
 * Nombres de los productos del pedido, sin repetir y en el orden en que
 * aparecen. No se asume ningún modelo en particular: sale de `order_items`.
 */
export const nombresProductos = (
  items: ItemPedidoAdmin[] | null | undefined,
): string[] => {
  const vistos = new Set<string>();
  const salida: string[] = [];

  for (const i of items ?? []) {
    const nombre = (i.product_name ?? "").trim();
    if (nombre.length === 0 || vistos.has(nombre)) continue;
    vistos.add(nombre);
    salida.push(nombre);
  }

  return salida;
};

/**
 * Descripción de lo que había en un checkout abandonado, con lo poco que se
 * llega a capturar: pack, cantidad y pulsera extra.
 */
export const describirSeleccion = (c: {
  pack_id: string | null;
  pack_qty: number | null;
  has_extra: boolean | null;
}): string => {
  const partes: string[] = [];

  if (c.pack_id) {
    const cantidad = c.pack_qty && c.pack_qty > 1 ? ` × ${c.pack_qty}` : "";
    partes.push(`Pack ${c.pack_id}${cantidad}`);
  }

  if (c.has_extra) partes.push("con pulsera extra");

  return partes.length > 0 ? partes.join(" · ") : "—";
};
