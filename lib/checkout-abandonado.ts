/**
 * Checkouts abandonados — validación del payload público. Funciones puras.
 *
 * Este módulo define exactamente qué acepta `POST /api/checkout-abandonado`.
 * Es un endpoint PÚBLICO: cualquiera puede pegarle desde cualquier lado, así
 * que la lista de campos que se leen es cerrada y corta.
 *
 * LO QUE NUNCA SE LEE DEL NAVEGADOR
 *   `status`, `converted_order_id`, `converted_at`, `archived_at`,
 *   `archived_by`, `id`, `created_at`. Ni siquiera se miran: el objeto que
 *   devuelve esta función no tiene esos campos, así que no hay forma de que
 *   lleguen al UPDATE. Marcar un checkout como convertido o archivarlo son
 *   decisiones del servidor y del panel, no del visitante.
 *
 * CUÁNDO SE GUARDA
 *   Solo cuando hay nombre y un WhatsApp razonablemente válido. Antes de eso no
 *   hay a quién recuperar, y guardar filas vacías solo ensucia el panel.
 *
 * Módulo puro: sin red, sin base. Se testea entero.
 */

/** Los pasos del checkout, tal como se guardan. El panel los traduce. */
export const PASOS = ["contacto", "entrega", "seleccion", "pago", "review"] as const;
export type Paso = (typeof PASOS)[number];

/** Tope del cuerpo del request, en bytes. Un payload real ronda los 300. */
export const MAX_CUERPO = 2048;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CapturaAbandono = {
  session_key: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_city: string | null;
  pack_id: string | null;
  pack_qty: number | null;
  has_extra: boolean;
  shipping_zone: string | null;
  current_step: Paso | null;
};

export type ResultadoCaptura =
  | { ok: true; captura: CapturaAbandono }
  | { ok: false; motivo: "payload_invalido" | "sin_contacto" };

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Recorta, colapsa espacios y limita el largo. */
const texto = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * Normaliza un WhatsApp paraguayo a un solo formato.
 *
 * Se guardan siempre los diez dígitos locales (09xxxxxxxx) para que el mismo
 * número escrito de tres maneras distintas no aparezca como tres clientes. Un
 * número que no se puede normalizar se devuelve tal cual vino, recortado: es
 * preferible un dato imperfecto a perder el contacto.
 */
export function normalizarWhatsapp(bruto: string): string {
  const limpio = bruto.replace(/[\s().-]/g, "");

  if (/^09\d{8}$/.test(limpio)) return limpio;
  if (/^\+5959\d{8}$/.test(limpio)) return `0${limpio.slice(4)}`;
  if (/^5959\d{8}$/.test(limpio)) return `0${limpio.slice(3)}`;

  return limpio.slice(0, 30);
}

/**
 * ¿Hay número suficiente como para escribirle?
 *
 * Más permisivo que el checkout —que exige el formato exacto antes de crear el
 * pedido— porque acá el objetivo es no perder un contacto a medio escribir. Se
 * pide un mínimo de ocho dígitos, que es cuando un número paraguayo empieza a
 * tener sentido.
 */
export const whatsappUtil = (v: string): boolean =>
  (v.match(/\d/g) ?? []).length >= 8;

/**
 * Valida el cuerpo del endpoint público.
 *
 * @param bruto Cuerpo del request, sin tipar y sin confianza.
 */
export function validarCaptura(bruto: unknown): ResultadoCaptura {
  if (!esObjeto(bruto)) return { ok: false, motivo: "payload_invalido" };

  const sessionKey = bruto.sessionKey;
  if (typeof sessionKey !== "string" || !UUID.test(sessionKey)) {
    return { ok: false, motivo: "payload_invalido" };
  }

  const nombre = texto(bruto.nombre, 120);
  const whatsapp = normalizarWhatsapp(texto(bruto.whatsapp, 40));

  // Sin nombre o sin número no hay a quién recuperar: se descarta en silencio.
  if (nombre.length < 2 || !whatsappUtil(whatsapp)) {
    return { ok: false, motivo: "sin_contacto" };
  }

  const ciudad = texto(bruto.ciudad, 80);

  const packId = bruto.packId === "1" || bruto.packId === "2" || bruto.packId === "3"
    ? bruto.packId
    : null;

  const packQtyBruto = bruto.packQty;
  const packQty =
    typeof packQtyBruto === "number" && Number.isInteger(packQtyBruto) &&
    packQtyBruto > 0 && packQtyBruto <= 99
      ? packQtyBruto
      : null;

  const zona =
    bruto.zona === "asuncion" || bruto.zona === "interior" ? bruto.zona : null;

  const paso = PASOS.includes(bruto.paso as Paso) ? (bruto.paso as Paso) : null;

  return {
    ok: true,
    captura: {
      session_key: sessionKey,
      customer_name: nombre,
      customer_whatsapp: whatsapp,
      customer_city: ciudad.length > 0 ? ciudad : null,
      pack_id: packId,
      pack_qty: packQty,
      has_extra: bruto.extra === true,
      shipping_zone: zona,
      current_step: paso,
    },
  };
}
