/**
 * Rango de fechas del panel — funciones puras.
 *
 * TODO el panel se mide sobre fechas del NEGOCIO, en `America/Asuncion`:
 * `orders.sale_date` para los pedidos y `ad_spend.spend_date` para la
 * inversión. Nunca sobre `created_at`, que es UTC y correría un día los
 * pedidos hechos de noche.
 *
 * Las fechas se manejan como texto `YYYY-MM-DD` de punta a punta —así llegan y
 * así se comparan en PostgreSQL— y no como `Date`. Un `new Date("2026-07-27")`
 * es medianoche UTC, que en Asunción es el día anterior: convertir de ida y
 * vuelta solo agrega maneras de equivocarse.
 */

export type RangoId = "7d" | "30d" | "90d" | "todo" | "personalizado";

export type Rango = {
  id: RangoId;
  /** `YYYY-MM-DD` inclusive. `null` en "Todo": sin límite inferior. */
  desde: string | null;
  /** `YYYY-MM-DD` inclusive. `null` en "Todo": sin límite superior. */
  hasta: string | null;
  etiqueta: string;
};

export const OPCIONES_RANGO: { id: RangoId; etiqueta: string }[] = [
  { id: "7d", etiqueta: "Últimos 7 días" },
  { id: "30d", etiqueta: "Últimos 30 días" },
  { id: "90d", etiqueta: "Últimos 90 días" },
  { id: "todo", etiqueta: "Todo" },
  { id: "personalizado", etiqueta: "Rango personalizado" },
];

export const RANGO_POR_DEFECTO: RangoId = "30d";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** `true` si el texto es una fecha `YYYY-MM-DD` que además existe. */
export const esFechaIso = (v: unknown): v is string => {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/**
 * Hoy en Paraguay, como `YYYY-MM-DD`.
 *
 * `en-CA` produce justamente ese formato, así que no hay que rearmar la fecha
 * a mano ni preocuparse por el orden de los componentes.
 */
export const hoyAsuncion = (ahora: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);

/** Corre una fecha `YYYY-MM-DD` una cantidad de días, sin tocar zonas horarias. */
export const sumarDias = (iso: string, dias: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const DIAS: Partial<Record<RangoId, number>> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * Resuelve el rango a partir de los query params de /admin.
 *
 * Cualquier valor inválido cae al rango por defecto en lugar de romper: el
 * panel se abre desde una URL que puede venir editada a mano.
 *
 * "Últimos N días" incluye HOY y los N−1 anteriores, que es lo que espera
 * cualquiera que mire un reporte: 7 días son la semana que termina hoy.
 */
export function resolverRango(
  params: Record<string, string | undefined>,
  ahora: Date = new Date(),
): Rango {
  const hoy = hoyAsuncion(ahora);
  const pedido = params.rango as RangoId | undefined;

  if (pedido === "todo") {
    return { id: "todo", desde: null, hasta: null, etiqueta: "Todo" };
  }

  if (pedido === "personalizado") {
    const a = params.desde;
    const b = params.hasta;

    if (esFechaIso(a) && esFechaIso(b)) {
      // Si vienen al revés, se ordenan en lugar de devolver un rango vacío.
      const [desde, hasta] = a <= b ? [a, b] : [b, a];
      return {
        id: "personalizado",
        desde,
        hasta,
        etiqueta: "Rango personalizado",
      };
    }

    // Personalizado a medio completar: se muestra el selector en ese modo,
    // pero todavía sin filtrar por fechas incompletas.
    return {
      id: "personalizado",
      desde: esFechaIso(a) ? a : null,
      hasta: esFechaIso(b) ? b : null,
      etiqueta: "Rango personalizado",
    };
  }

  const id: RangoId = pedido && DIAS[pedido] ? pedido : RANGO_POR_DEFECTO;
  const dias = DIAS[id]!;

  return {
    id,
    desde: sumarDias(hoy, -(dias - 1)),
    hasta: hoy,
    etiqueta: OPCIONES_RANGO.find((o) => o.id === id)!.etiqueta,
  };
}
