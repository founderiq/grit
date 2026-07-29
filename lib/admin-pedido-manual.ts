/**
 * Pedido manual — validación y recálculo. Funciones puras.
 *
 * Es el equivalente administrativo de `lib/pedidos.ts`, y sigue exactamente la
 * misma regla: del navegador se acepta **qué** se vendió (qué packs, cuántos,
 * si hubo pulsera extra, la zona, el VIP, el envío cobrado y el descuento), y
 * los importes se recalculan acá desde el catálogo de `lib/content.ts`. El
 * total NUNCA llega del formulario.
 *
 * Lo que tampoco puede llegar del navegador y por eso no aparece en la entrada:
 * `user_id`, `created_by`, el costo de producto, el costo logístico, el número
 * de pedido y el `source`. El primero sale de la sesión, los dos costos son un
 * snapshot que arma la base y los dos últimos los pone la base.
 *
 * PRODUCTOS
 *   El pedido se arma con líneas, no con un modelo fijo: cada línea es un pack
 *   del catálogo con su cantidad, y se pueden cargar varias. La pulsera extra
 *   promocional sigue siendo como máximo una, igual que en el ecommerce.
 *
 * Módulo puro: sin red, sin base, sin sesión. Se testea entero.
 */
import {
  EXTRA,
  PRODUCTO_BUNDLES,
  VIP,
  type BundleId,
  type ZonaId,
} from "@/lib/content";
import { aEntero, MAX_MONTO, esEntregaVisible, esPagoVisible, limpiarNotas, resolverEntrega, resolverPago } from "@/lib/admin-mutaciones";
import { esFechaIso, hoyAsuncion, sumarDias } from "@/lib/admin-rango";
import type { EstadoEntrega, EstadoPago } from "@/lib/admin-formato";

/* ------------------------------------------------------------
   Catálogo y métodos
   ------------------------------------------------------------ */

/** Los tres métodos que acepta la base. `efectivo` existe solo para manuales. */
export const METODOS_MANUALES = ["transferencia", "efectivo", "tarjeta"] as const;
export type MetodoManual = (typeof METODOS_MANUALES)[number];

export const esMetodoManual = (v: unknown): v is MetodoManual =>
  typeof v === "string" && (METODOS_MANUALES as readonly string[]).includes(v);

export const esZona = (v: unknown): v is ZonaId => v === "asuncion" || v === "interior";

const esBundleId = (v: unknown): v is BundleId => v === "1" || v === "2" || v === "3";

/** Cantidad máxima por línea. Un pedido manual real no pasa de acá. */
export const QTY_LINEA_MAX = 99;

/** Tope de líneas distintas. Corta payloads absurdos antes de recorrerlos. */
export const MAX_LINEAS = 20;

/* ------------------------------------------------------------
   Entrada y salida
   ------------------------------------------------------------ */

export type LineaManual = { packId: BundleId; qty: number };

export type ItemManual = {
  sku: string;
  product_name: string;
  bundle_id: string | null;
  quantity: number;
  unit_price: number;
  compare_at_price: number | null;
  line_total: number;
  is_promotional: boolean;
};

export type PedidoManual = {
  idempotencyKey: string;
  cliente: {
    nombre: string;
    whatsapp: string;
    ciudad: string;
    direccion: string;
    ubicacion: string | null;
  };
  zona: ZonaId;
  metodoPago: MetodoManual;
  /** Valores reales de la base, ya traducidos desde lo que se ve en el panel. */
  paymentStatus: string;
  orderStatus: string;
  saleDate: string;
  notas: string | null;

  subtotal: number;
  descuento: number;
  envio: number;
  vip: boolean;
  vipCosto: number;
  total: number;
  unidades: number;
  items: ItemManual[];
};

export type ErrorCampo = { campo: string; codigo: string };

export type ResultadoManual =
  | { ok: true; pedido: PedidoManual }
  | { ok: false; errores: ErrorCampo[] };

/* ------------------------------------------------------------
   Armado e importes — compartidos por la interfaz y el servidor
   ------------------------------------------------------------ */

export type TotalesManual = {
  items: ItemManual[];
  unidades: number;
  subtotal: number;
  descuento: number;
  envio: number;
  vipCosto: number;
  total: number;
};

/**
 * Convierte las líneas elegidas en ítems de pedido y saca los importes.
 *
 * Es la ÚNICA cuenta: el resumen que ve quien carga el pedido y el total que se
 * guarda salen de acá, así que no pueden diferir. El descuento se acota al
 * subtotal para que el total nunca sea negativo.
 */
export function totalesManual(entrada: {
  lineas: LineaManual[];
  extra: boolean;
  envio: number;
  descuento: number;
  vip: boolean;
}): TotalesManual {
  const items: ItemManual[] = [];
  let subtotal = 0;
  let unidades = 0;

  for (const l of entrada.lineas) {
    const b = PRODUCTO_BUNDLES.find((x) => x.id === l.packId);
    if (!b) continue;

    const lineTotal = b.precio * l.qty;

    items.push({
      sku: `pack-${b.id}`,
      product_name: b.nombreLargo,
      bundle_id: b.id,
      quantity: l.qty,
      unit_price: b.precio,
      compare_at_price: b.compare > 0 ? b.compare : null,
      line_total: lineTotal,
      is_promotional: false,
    });

    subtotal += lineTotal;
    unidades += b.unidades * l.qty;
  }

  if (entrada.extra) {
    items.push({
      sku: "pulsera-extra",
      product_name: EXTRA.nombre,
      bundle_id: null,
      quantity: 1,
      unit_price: EXTRA.precio,
      compare_at_price: EXTRA.compare,
      line_total: EXTRA.precio,
      is_promotional: true,
    });
    subtotal += EXTRA.precio;
    unidades += 1;
  }

  const descuento = Math.min(Math.max(0, entrada.descuento), subtotal);
  const envio = Math.max(0, entrada.envio);
  const vipCosto = entrada.vip ? VIP.costo : 0;

  return {
    items,
    unidades,
    subtotal,
    descuento,
    envio,
    vipCosto,
    total: subtotal - descuento + envio + vipCosto,
  };
}

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const texto = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Teléfono paraguayo, con la misma tolerancia que el checkout público pero sin
 * exigir el formato exacto: un pedido cargado a mano puede venir de un contacto
 * viejo. Se pide, como mínimo, que haya dígitos suficientes para llamar.
 */
const telefonoValido = (v: string) => /^[+\d][\d\s().-]{6,}$/.test(v);

/* ------------------------------------------------------------
   Validación
   ------------------------------------------------------------ */

/**
 * Valida el formulario del pedido manual y devuelve todo recalculado.
 *
 * @param bruto Lo que mandó el navegador, sin tipar y sin confianza.
 * @param hoy   Fecha de hoy en Asunción. Se inyecta para poder testear.
 */
export function validarPedidoManual(
  bruto: unknown,
  hoy: string = hoyAsuncion(),
): ResultadoManual {
  const errores: ErrorCampo[] = [];
  const agregar = (campo: string, codigo: string) => errores.push({ campo, codigo });

  if (!esObjeto(bruto)) return { ok: false, errores: [{ campo: "body", codigo: "invalido" }] };

  /* --- Clave de idempotencia -------------------------------------------- */
  const idempotencyKey = bruto.idempotencyKey;
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) {
    agregar("idempotencyKey", "uuid_invalido");
  }

  /* --- Cliente ----------------------------------------------------------- */
  const c = esObjeto(bruto.cliente) ? bruto.cliente : {};
  const cliente = {
    nombre: texto(c.nombre, 120),
    whatsapp: texto(c.whatsapp, 30),
    ciudad: texto(c.ciudad, 80),
    direccion: texto(c.direccion, 200),
    ubicacion: texto(c.ubicacion, 500),
  };

  if (cliente.nombre.length < 2) agregar("cliente.nombre", "requerido");
  if (!telefonoValido(cliente.whatsapp)) agregar("cliente.whatsapp", "invalido");
  if (cliente.ciudad.length === 0) agregar("cliente.ciudad", "requerido");
  if (cliente.direccion.length < 3) agregar("cliente.direccion", "requerido");
  if (cliente.ubicacion.length > 0 && !/^https?:\/\//i.test(cliente.ubicacion)) {
    agregar("cliente.ubicacion", "url_invalida");
  }

  /* --- Zona -------------------------------------------------------------- */
  if (!esZona(bruto.zona)) agregar("zona", "invalida");

  /* --- Líneas de producto ------------------------------------------------ */
  const lineasBrutas = Array.isArray(bruto.lineas) ? bruto.lineas : [];
  if (lineasBrutas.length === 0) agregar("lineas", "sin_lineas");
  if (lineasBrutas.length > MAX_LINEAS) agregar("lineas", "demasiadas");

  const lineas: LineaManual[] = [];
  lineasBrutas.slice(0, MAX_LINEAS).forEach((l, i) => {
    if (!esObjeto(l) || !esBundleId(l.packId)) {
      agregar(`lineas.${i}.packId`, "invalido");
      return;
    }
    const qty = aEntero(l.qty);
    if (qty === null || qty < 1 || qty > QTY_LINEA_MAX) {
      agregar(`lineas.${i}.qty`, "fuera_de_rango");
      return;
    }
    lineas.push({ packId: l.packId, qty });
  });

  /* --- Pulsera extra promocional ----------------------------------------
     Booleano estricto, igual que en el checkout: como máximo una.        */
  const extraBruto = bruto.extra ?? false;
  if (typeof extraBruto !== "boolean") agregar("extra", "debe_ser_booleano");
  const extra = extraBruto === true;

  /* --- VIP --------------------------------------------------------------- */
  const vipBruto = bruto.vip ?? false;
  if (typeof vipBruto !== "boolean") agregar("vip", "debe_ser_booleano");
  const vip = vipBruto === true;

  /* --- Envío cobrado y descuento ----------------------------------------
     Son montos que decide quien carga el pedido, no precios de catálogo:
     por eso se aceptan, pero acotados y como enteros en guaraníes.       */
  const envio = aEntero(bruto.envio ?? 0);
  if (envio === null || envio < 0 || envio > MAX_MONTO) agregar("envio", "monto_invalido");

  const descuento = aEntero(bruto.descuento ?? 0);
  if (descuento === null || descuento < 0 || descuento > MAX_MONTO) {
    agregar("descuento", "monto_invalido");
  }

  /* --- Método y estados --------------------------------------------------- */
  if (!esMetodoManual(bruto.metodoPago)) agregar("metodoPago", "invalido");
  if (!esPagoVisible(bruto.pago)) agregar("pago", "invalido");
  if (!esEntregaVisible(bruto.entrega)) agregar("entrega", "invalido");

  /* --- Fecha de venta -----------------------------------------------------
     Se admite cualquier día pasado y hasta el de mañana en Asunción, para
     cubrir la diferencia horaria de quien cargue el pedido de madrugada.  */
  const saleDate = typeof bruto.saleDate === "string" ? bruto.saleDate : "";
  if (!esFechaIso(saleDate) || saleDate > sumarDias(hoy, 1) || saleDate < "2020-01-01") {
    agregar("saleDate", "fuera_de_rango");
  }

  if (errores.length > 0) return { ok: false, errores };

  /* --- Recálculo ---------------------------------------------------------
     Desde acá no se vuelve a mirar el formulario: todo sale del catálogo. */

  const t = totalesManual({ lineas, extra, envio: envio!, descuento: descuento!, vip });
  const metodoPago = bruto.metodoPago as MetodoManual;

  return {
    ok: true,
    pedido: {
      idempotencyKey: idempotencyKey as string,
      cliente: {
        ...cliente,
        ubicacion: cliente.ubicacion.length > 0 ? cliente.ubicacion : null,
      },
      zona: bruto.zona as ZonaId,
      metodoPago,
      // El estado anterior no existe —el pedido se está creando— así que se
      // pasa `null` y el subtipo de "pendiente" sale del método de pago.
      paymentStatus: resolverPago(bruto.pago as EstadoPago, null, metodoPago),
      orderStatus: resolverEntrega(bruto.entrega as EstadoEntrega),
      saleDate,
      notas: limpiarNotas(bruto.notas),

      subtotal: t.subtotal,
      descuento: t.descuento,
      envio: t.envio,
      vip,
      vipCosto: t.vipCosto,
      total: t.total,
      unidades: t.unidades,
      items: t.items,
    },
  };
}
