/**
 * Reglas de las escrituras del panel — funciones puras.
 *
 * Acá vive la parte que decide QUÉ se va a guardar: cómo se traduce un estado
 * visible al valor real de la base y qué ajuste es válido. Sin red, sin base y
 * sin sesión, para poder testearla entera.
 *
 * Lo que NO está acá es la autorización ni la lectura del estado actual: eso
 * ocurre en `app/admin/acciones.ts`, en el servidor, antes de llamar a estas
 * funciones.
 */
import {
  ETIQUETA_ENTREGA,
  ETIQUETA_PAGO,
  normalizarEntrega,
  normalizarPago,
  type EstadoEntrega,
  type EstadoPago,
} from "@/lib/admin-formato";

/* ------------------------------------------------------------
   Estado de pago
   ------------------------------------------------------------ */

export const PAGOS_VISIBLES: EstadoPago[] = ["pendiente", "pagado", "cancelado"];

export const esPagoVisible = (v: unknown): v is EstadoPago =>
  typeof v === "string" && (PAGOS_VISIBLES as string[]).includes(v);

/**
 * Traduce el estado de pago elegido en el panel al `payment_status` real.
 *
 * "Pendiente" es el único que no es directo: la base distingue el pendiente de
 * transferencia del de pago online, y esa distinción importa —es lo que dice
 * qué se está esperando—. Por eso:
 *
 *   · Si el pedido YA estaba en algún pendiente, se conserva su subtipo. Pasar
 *     de "Pendiente" a "Pendiente" no debería cambiar nada.
 *   · Si vuelve desde pagado, cancelado o fallido, el subtipo se deduce del
 *     método de pago: tarjeta espera un pago online; transferencia y efectivo,
 *     una transferencia.
 *
 * @param destino  Estado elegido en el panel.
 * @param actual   `payment_status` que la base tiene HOY, leído en el servidor.
 * @param metodo   `payment_method` del pedido, también leído en el servidor.
 */
export function resolverPago(
  destino: EstadoPago,
  actual: string | null,
  metodo: string | null,
): string {
  if (destino === "pagado") return "pagado";
  if (destino === "cancelado") return "cancelado";

  if (actual === "pendiente_transferencia" || actual === "pendiente_pago_online") {
    return actual;
  }

  return metodo === "tarjeta" ? "pendiente_pago_online" : "pendiente_transferencia";
}

/* ------------------------------------------------------------
   Estado de entrega
   ------------------------------------------------------------ */

export const ENTREGAS_VISIBLES: EstadoEntrega[] = [
  "pendiente",
  "preparado",
  "enviado",
  "entregado",
  "cancelado",
];

export const esEntregaVisible = (v: unknown): v is EstadoEntrega =>
  typeof v === "string" && (ENTREGAS_VISIBLES as string[]).includes(v);

/**
 * Traduce el estado de entrega elegido al `order_status` real.
 *
 * "Pendiente" siempre guarda `nuevo`. La base también tiene `confirmado`, que
 * el panel muestra como pendiente, pero hoy no hay forma de elegirlo: mientras
 * no exista esa acción, no se inventa un valor que nadie pidió.
 */
export function resolverEntrega(destino: EstadoEntrega): string {
  switch (destino) {
    case "preparado":
      return "preparando";
    case "enviado":
      return "enviado";
    case "entregado":
      return "entregado";
    case "cancelado":
      return "cancelado";
    default:
      return "nuevo";
  }
}

/* ------------------------------------------------------------
   Notas internas
   ------------------------------------------------------------ */

/** Largo máximo de una nota interna. Es una nota, no un documento. */
export const MAX_NOTAS = 2000;

/** Recorta y acota. Una nota vacía se guarda como `null`, no como "". */
export const limpiarNotas = (bruto: unknown): string | null => {
  if (typeof bruto !== "string") return null;
  const t = bruto.trim().slice(0, MAX_NOTAS);
  return t.length > 0 ? t : null;
};

/* ------------------------------------------------------------
   Ajustes
   ------------------------------------------------------------ */

export const MAX_DESCRIPCION = 300;

/** Techo de un ajuste: el mismo `integer` que usa toda la base, en guaraníes. */
export const MAX_MONTO = 2_000_000_000;

export type AjusteValido = {
  descripcion: string;
  revenue: number;
  cost: number;
};

export type ErrorAjuste =
  | "descripcion_requerida"
  | "monto_invalido"
  | "monto_negativo"
  | "monto_fuera_de_rango"
  | "sin_monto";

export type ResultadoAjuste =
  | { ok: true; ajuste: AjusteValido }
  | { ok: false; error: ErrorAjuste };

/**
 * Acepta enteros o el texto de un input numérico. Un decimal se rechaza en
 * lugar de redondearse: el guaraní no tiene centavos y adivinar el monto de un
 * ajuste sería peor que pedirlo de nuevo.
 */
const aEntero = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  if (typeof v !== "string") return null;

  const t = v.trim().replace(/\./g, "");
  if (t.length === 0) return 0;
  if (!/^-?\d+$/.test(t)) return null;

  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
};

/**
 * Valida un ajuste antes de que toque la base.
 *
 * Reglas: los dos montos pueden ser cero por separado, pero no los dos a la
 * vez —una fila sin plata no es un ajuste—; ninguno admite negativos, porque
 * para descontar se carga el concepto del otro lado y así el historial queda
 * legible; y el detalle es obligatorio, porque un monto sin explicación no se
 * puede auditar seis meses después.
 */
export function validarAjuste(bruto: {
  descripcion?: unknown;
  revenue?: unknown;
  cost?: unknown;
}): ResultadoAjuste {
  const revenue = aEntero(bruto.revenue ?? 0);
  const cost = aEntero(bruto.cost ?? 0);

  if (revenue === null || cost === null) return { ok: false, error: "monto_invalido" };
  if (revenue < 0 || cost < 0) return { ok: false, error: "monto_negativo" };
  if (revenue > MAX_MONTO || cost > MAX_MONTO) {
    return { ok: false, error: "monto_fuera_de_rango" };
  }
  if (revenue === 0 && cost === 0) return { ok: false, error: "sin_monto" };

  const descripcion =
    typeof bruto.descripcion === "string"
      ? bruto.descripcion.trim().slice(0, MAX_DESCRIPCION)
      : "";

  if (descripcion.length === 0) return { ok: false, error: "descripcion_requerida" };

  return { ok: true, ajuste: { descripcion, revenue, cost } };
}

/* ------------------------------------------------------------
   Resumen financiero de un pedido
   ------------------------------------------------------------ */

export type ResumenPedido = {
  ingresoActualizado: number;
  costoActualizado: number;
  ganancia: number;
  /** `null` cuando el ingreso es cero: no hay margen que calcular. */
  margen: number | null;
};

/**
 * Las cuatro cifras del pedido, con la misma definición que usan las métricas
 * del dashboard: si el detalle y el resumen general no coincidieran, uno de
 * los dos estaría mintiendo.
 *
 * `product_cost_total` y `logistics_cost` son el snapshot congelado al crear el
 * pedido y no se recalculan nunca: acá solo se leen.
 */
export function resumenPedido(p: {
  total: number | null;
  extra_revenue_total: number | null;
  product_cost_total: number | null;
  logistics_cost: number | null;
  extra_cost_total: number | null;
}): ResumenPedido {
  const n = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const ingresoActualizado = n(p.total) + n(p.extra_revenue_total);
  const costoActualizado =
    n(p.product_cost_total) + n(p.logistics_cost) + n(p.extra_cost_total);
  const ganancia = ingresoActualizado - costoActualizado;

  return {
    ingresoActualizado,
    costoActualizado,
    ganancia,
    margen: ingresoActualizado > 0 ? ganancia / ingresoActualizado : null,
  };
}

/* ------------------------------------------------------------
   Notas de la bitácora
   ------------------------------------------------------------ */

/** "Pago: Pendiente → Pagado", con los nombres que ve el administrador. */
export const notaCambioPago = (antes: string | null, despues: string): string =>
  `Pago: ${ETIQUETA_PAGO[normalizarPago(antes)]} → ${ETIQUETA_PAGO[normalizarPago(despues)]}`;

/** "Entrega: Pendiente → Enviado". */
export const notaCambioEntrega = (antes: string | null, despues: string): string =>
  `Entrega: ${ETIQUETA_ENTREGA[normalizarEntrega(antes)]} → ${ETIQUETA_ENTREGA[normalizarEntrega(despues)]}`;
