/**
 * Meta Conversions API — Purchase de pedidos MANUALES. Lógica pura.
 *
 * QUÉ RESUELVE
 *   Los pedidos que se cierran por WhatsApp y se cargan a mano en /admin nunca
 *   pasan por /gracias, así que el Pixel no los ve. Este módulo arma el evento
 *   Purchase server-side que el panel manda a Meta cuando un administrador lo
 *   decide (botón "Enviar venta a Meta"), y decide si ese envío corresponde.
 *
 * QUÉ NO TOCA
 *   Nada del ecommerce: el Pixel, el Purchase de /gracias y la integración
 *   "Conversions API with Meta" (que replica los eventos del Pixel) siguen
 *   exactamente igual. Un pedido con `source !== "manual"` NUNCA se envía desde
 *   acá: lo rechaza `evaluarEnvio()` y, antes, la propia Server Action.
 *
 * DECISIONES (ver la auditoría en el historial del proyecto)
 *   · `action_source: "chat"` — Meta lo define como "conversion was made via a
 *     messaging app, sms, or online messaging feature": la venta se cierra por
 *     WhatsApp. No es `website` (no ocurre en el sitio y no tenemos IP ni user
 *     agent del cliente) ni `business_messaging` (exige anuncios
 *     Click-to-WhatsApp con `ctwa_clid`).
 *   · `event_id = purchase-<order_number>` — el mismo esquema que el Purchase
 *     web. `order_number` es único en `orders`, así que nunca coincide con el
 *     de un pedido web; y si por error se mandara un pedido web, Meta lo
 *     deduplicaría contra el del navegador.
 *   · `event_time` = momento en que el pedido quedó Pagado (la última fila
 *     "pagado" de `order_status_history`). Meta rechaza el request entero si
 *     un evento tiene más de 7 días, así que se bloquea antes de llegar ahí.
 *   · `user_data` lleva SOLO lo que existe y está permitido: teléfono, nombre,
 *     apellido (solo si es inequívoco), ciudad y país, normalizados y con
 *     SHA-256 como pide Meta. Nunca IP ni user agent: los del servidor o los
 *     del administrador serían datos falsos del cliente.
 *
 * ESTADO DEL ENVÍO
 *   Vive en `orders.metadata.meta_capi`, separado por modo:
 *
 *     { "live": RegistroMeta, "test": RegistroMeta }
 *
 *   Un envío de prueba (Test Events, en Preview) nunca marca el pedido como
 *   enviado de verdad: Preview y Producción pueden compartir la base, y un
 *   evento de prueba no cuenta en Meta.
 *
 * Módulo puro: sin red, sin base, sin variables de entorno. Se testea entero.
 * Usa `node:crypto`, así que solo se importa desde el servidor.
 */
import { createHash } from "node:crypto";
import { datosDeItems, type ContenidoPixel, type ItemGuardado } from "@/lib/meta-pixel";

/* ------------------------------------------------------------
   Constantes
   ------------------------------------------------------------ */

export type ModoMeta = "live" | "test";

export const EVENTO_PURCHASE = "Purchase";
export const ACTION_SOURCE = "chat";
export const MONEDA_META = "PYG";
/** Todos los envíos van a Paraguay: las zonas de envío son solo de PY. */
export const PAIS = "py";

/** Clave dentro de `orders.metadata`. */
export const CLAVE_METADATA = "meta_capi";

/** Meta rechaza eventos de más de 7 días. Se deja una hora de margen. */
export const EDAD_MAXIMA_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;

/**
 * Un envío que quedó "enviando" más de esto se considera interrumpido (el
 * servidor se cortó a mitad de camino) y se puede reintentar. El reintento usa
 * el mismo `event_id`, así que Meta descarta el duplicado si el primero sí
 * había llegado.
 */
export const ENVIANDO_VENCE_MS = 2 * 60 * 1000;

export const eventIdDePedido = (orderNumber: string): string => `purchase-${orderNumber}`;

/* ------------------------------------------------------------
   Normalización y hashing (reglas de Meta, customer information parameters)
   ------------------------------------------------------------ */

export const sha256 = (valor: string): string =>
  createHash("sha256").update(valor, "utf8").digest("hex");

/**
 * Teléfono → formato de Meta: solo dígitos, con código de país, sin ceros a la
 * izquierda. `customer_whatsapp` es texto libre (se carga a mano), así que se
 * tolera `0994 320 994`, `+595 994 320994`, `595994320994` o `00595…`.
 *
 * Sin código de país se asume Paraguay. Un número nacional paraguayo tiene 8 o
 * 9 dígitos después de quitar el 0 inicial (celulares: 9XX XXX XXX). Un número
 * con `+` u `00` de otro país se respeta tal cual.
 *
 * Devuelve `null` si no se puede armar un número confiable: mejor no mandar el
 * dato que mandar uno que nunca va a coincidir.
 */
export function normalizarTelefono(crudo: string): string | null {
  const texto = crudo.trim();
  const internacional = texto.startsWith("+") || texto.startsWith("00");

  let digitos = texto.replace(/\D/g, "");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);

  if (digitos.startsWith("595")) {
    const nacional = digitos.slice(3).replace(/^0+/, "");
    return nacional.length >= 8 && nacional.length <= 9 ? `595${nacional}` : null;
  }

  if (internacional) {
    const limpio = digitos.replace(/^0+/, "");
    return limpio.length >= 8 && limpio.length <= 15 ? limpio : null;
  }

  const nacional = digitos.replace(/^0+/, "");
  return nacional.length >= 8 && nacional.length <= 9 ? `595${nacional}` : null;
}

/**
 * Texto para `fn`, `ln` y `ct`: minúsculas, sin espacios, sin puntuación ni
 * dígitos. Las letras con tilde se conservan en UTF-8, como admite Meta
 * ("valéry" es uno de sus propios ejemplos).
 */
export function normalizarTexto(valor: string): string {
  return valor.normalize("NFC").toLowerCase().replace(/[^\p{L}]/gu, "");
}

/**
 * Nombre completo → nombre y apellido.
 *
 * `customer_name` es un solo campo. El primer token es el nombre. El apellido
 * se manda SOLO con dos palabras exactas ("María González"): con tres o más
 * ("María José González Benítez") no hay forma segura de saber cuál es el
 * apellido, y un apellido equivocado no ayuda a coincidir.
 */
export function partirNombre(completo: string): { fn: string | null; ln: string | null } {
  const tokens = completo
    .trim()
    .split(/\s+/)
    .map(normalizarTexto)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return { fn: null, ln: null };
  return { fn: tokens[0]!, ln: tokens.length === 2 ? tokens[1]! : null };
}

/* ------------------------------------------------------------
   Estado del envío en `orders.metadata`
   ------------------------------------------------------------ */

export type RegistroMeta = {
  status: "sending" | "sent" | "error";
  event_id: string;
  /** Unix en segundos, tal como se mandó a Meta. */
  event_time: number | null;
  attempts: number;
  started_at: string | null;
  sent_at: string | null;
  /** Mensaje corto y saneado. Nunca el token ni datos del cliente. */
  error: string | null;
  fbtrace_id: string | null;
  events_received: number | null;
};

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const textoONull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const numeroONull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Lee el registro de un modo. Tolera metadata vacía, vieja o rota. */
export function leerRegistro(metadata: unknown, modo: ModoMeta): RegistroMeta | null {
  if (!esObjeto(metadata)) return null;
  const meta = metadata[CLAVE_METADATA];
  if (!esObjeto(meta)) return null;
  const r = meta[modo];
  if (!esObjeto(r)) return null;

  const status = r.status;
  if (status !== "sending" && status !== "sent" && status !== "error") return null;

  return {
    status,
    event_id: textoONull(r.event_id) ?? "",
    event_time: numeroONull(r.event_time),
    attempts: numeroONull(r.attempts) ?? 0,
    started_at: textoONull(r.started_at),
    sent_at: textoONull(r.sent_at),
    error: textoONull(r.error),
    fbtrace_id: textoONull(r.fbtrace_id),
    events_received: numeroONull(r.events_received),
  };
}

/**
 * Devuelve una metadata NUEVA con el registro de ese modo reemplazado.
 *
 * `orders.metadata` se reescribe entera en cada UPDATE, así que todo lo demás
 * —modelos, origen, el registro del otro modo— se copia tal cual.
 */
export function conRegistro(
  metadata: unknown,
  modo: ModoMeta,
  registro: RegistroMeta,
): Record<string, unknown> {
  const base = esObjeto(metadata) ? metadata : {};
  const meta = esObjeto(base[CLAVE_METADATA]) ? base[CLAVE_METADATA] : {};
  return { ...base, [CLAVE_METADATA]: { ...meta, [modo]: registro } };
}

export type EstadoEnvio = "no_enviado" | "enviando" | "enviado" | "error";

/**
 * Estado que se muestra y que decide si hay botón. Un "enviando" vencido se
 * trata como error: el envío se cortó y se puede reintentar.
 */
export function estadoDeRegistro(registro: RegistroMeta | null, ahora: Date): EstadoEnvio {
  if (!registro) return "no_enviado";
  if (registro.status === "sent") return "enviado";
  if (registro.status === "error") return "error";

  const inicio = registro.started_at ? Date.parse(registro.started_at) : NaN;
  if (Number.isFinite(inicio) && ahora.getTime() - inicio < ENVIANDO_VENCE_MS) return "enviando";
  return "error";
}

/* ------------------------------------------------------------
   ¿Se puede enviar?
   ------------------------------------------------------------ */

export type MotivoBloqueo =
  | "no_manual"
  | "no_pagado"
  | "archivado"
  | "ya_enviado"
  | "envio_en_curso"
  | "sin_telefono"
  | "sin_fecha_pago"
  | "fuera_de_ventana";

export type EntradaEvaluacion = {
  source: string;
  paymentStatus: string;
  archivado: boolean;
  /** `customer_whatsapp` tal como está guardado. */
  telefono: string;
  /** Momento en que quedó Pagado, de `order_status_history`. */
  pagadoEn: string | null;
  registro: RegistroMeta | null;
  ahora: Date;
};

export type Evaluacion =
  | { ok: true; eventTime: number }
  | { ok: false; motivo: MotivoBloqueo };

/**
 * Decide si este pedido se puede enviar a Meta AHORA, en este modo.
 *
 * El orden importa: primero lo que nunca va a cambiar (no es manual), después
 * el estado del pedido y al final el del envío.
 */
export function evaluarEnvio(e: EntradaEvaluacion): Evaluacion {
  // La regla central: un pedido web jamás sale por acá.
  if (e.source !== "manual") return { ok: false, motivo: "no_manual" };
  if (e.paymentStatus !== "pagado") return { ok: false, motivo: "no_pagado" };
  if (e.archivado) return { ok: false, motivo: "archivado" };

  const estado = estadoDeRegistro(e.registro, e.ahora);
  if (estado === "enviado") return { ok: false, motivo: "ya_enviado" };
  if (estado === "enviando") return { ok: false, motivo: "envio_en_curso" };

  if (!normalizarTelefono(e.telefono)) return { ok: false, motivo: "sin_telefono" };

  const pagado = e.pagadoEn ? Date.parse(e.pagadoEn) : NaN;
  if (!Number.isFinite(pagado)) return { ok: false, motivo: "sin_fecha_pago" };

  const ahoraMs = e.ahora.getTime();
  if (ahoraMs - pagado > EDAD_MAXIMA_MS) return { ok: false, motivo: "fuera_de_ventana" };

  // Un reloj adelantado nunca produce un evento en el futuro.
  const eventTime = Math.floor(Math.min(pagado, ahoraMs) / 1000);
  return { ok: true, eventTime };
}

/* ------------------------------------------------------------
   Payload
   ------------------------------------------------------------ */

export type PedidoParaMeta = {
  orderNumber: string;
  /** `orders.total`: el mismo importe que usa el Purchase web. */
  total: number;
  items: (ItemGuardado & { product_name?: string | null })[];
  cliente: { nombre: string; whatsapp: string; ciudad: string };
};

export type EventoMeta = {
  event_name: typeof EVENTO_PURCHASE;
  event_time: number;
  event_id: string;
  action_source: typeof ACTION_SOURCE;
  user_data: {
    ph?: string[];
    fn?: string[];
    ln?: string[];
    ct?: string[];
    country: string[];
  };
  custom_data: {
    value: number;
    currency: typeof MONEDA_META;
    content_type: "product";
    content_ids: string[];
    contents: ContenidoPixel[];
    num_items: number;
    order_id: string;
    content_name?: string;
  };
};

/**
 * Arma el evento Purchase. Los datos personales salen ya hasheados: lo que
 * devuelve esta función es exactamente lo que viaja a Meta.
 */
export function armarEvento(pedido: PedidoParaMeta, eventTime: number): EventoMeta {
  const user: EventoMeta["user_data"] = { country: [sha256(PAIS)] };

  const ph = normalizarTelefono(pedido.cliente.whatsapp);
  if (ph) user.ph = [sha256(ph)];

  const { fn, ln } = partirNombre(pedido.cliente.nombre);
  if (fn) user.fn = [sha256(fn)];
  if (ln) user.ln = [sha256(ln)];

  const ct = normalizarTexto(pedido.cliente.ciudad);
  if (ct) user.ct = [sha256(ct)];

  // Mismos SKUs y misma cuenta de pulseras que el Purchase del Pixel.
  const { contents, unidades } = datosDeItems(pedido.items);
  const contentName = pedido.items[0]?.product_name ?? undefined;

  return {
    event_name: EVENTO_PURCHASE,
    event_time: eventTime,
    event_id: eventIdDePedido(pedido.orderNumber),
    action_source: ACTION_SOURCE,
    user_data: user,
    custom_data: {
      value: pedido.total,
      currency: MONEDA_META,
      content_type: "product",
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: unidades,
      order_id: pedido.orderNumber,
      ...(contentName ? { content_name: contentName } : {}),
    },
  };
}
