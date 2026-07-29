/**
 * Validación y recálculo de pedidos, del lado del servidor.
 *
 * REGLA CENTRAL: del navegador solo se acepta **qué** quiere comprar el
 * cliente (pack, cantidad, extra, zona, VIP, método) y sus datos de contacto.
 * Ningún importe que venga en el request se usa jamás. Subtotal, ahorro,
 * envío, VIP, total y los precios de cada ítem se recalculan acá desde el
 * catálogo de `lib/content.ts`, con las mismas funciones que usa la interfaz.
 * Si el payload trae `total`, `subtotal`, `precio` o similares, se ignoran.
 *
 * Este módulo es puro: no toca red, ni base de datos, ni variables de entorno.
 * Por eso se puede testear sin infraestructura.
 */
import {
  EXTRA,
  PRODUCTO_BUNDLES,
  type BundleId,
  type ZonaId,
} from "@/lib/content";
import { QTY_MAX, QTY_MIN } from "@/lib/cart";
import {
  totalesCheckout,
  validarContacto,
  type CamposContacto,
  type MetodoPago,
} from "@/lib/checkout";

/* ------------------------------------------------------------
   Tipos
   ------------------------------------------------------------ */

export type ItemPedido = {
  sku: string;
  product_name: string;
  bundle_id: string | null;
  quantity: number;
  unit_price: number;
  compare_at_price: number | null;
  line_total: number;
  is_promotional: boolean;
};

export type PedidoCalculado = {
  idempotencyKey: string;
  contacto: CamposContacto;
  packId: BundleId;
  qty: number;
  extra: boolean;
  zona: ZonaId;
  vip: boolean;
  metodoPago: MetodoPago;
  paymentStatus: "pendiente_transferencia" | "pendiente_pago_online";
  /** Todos en guaraníes enteros, calculados en el servidor. */
  subtotal: number;
  descuento: number;
  envio: number;
  envioGratis: boolean;
  vipCosto: number;
  total: number;
  unidades: number;
  items: ItemPedido[];
};

export type ErrorValidacion = { campo: string; codigo: string };

export type ResultadoValidacion =
  | { ok: true; pedido: PedidoCalculado }
  | { ok: false; errores: ErrorValidacion[] };

/* ------------------------------------------------------------
   Helpers de parseo estricto
   ------------------------------------------------------------ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const esUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Texto acotado. Recorta y limita el largo para no guardar payloads enormes. */
const texto = (v: unknown, max = 200): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/* ------------------------------------------------------------
   Validación + cálculo
   ------------------------------------------------------------ */

/**
 * Valida el payload que llega del navegador y devuelve el pedido con todos
 * los importes recalculados por el servidor.
 *
 * @param bruto Cuerpo del request, sin tipar y sin confianza.
 */
export function validarYCalcular(bruto: unknown): ResultadoValidacion {
  const errores: ErrorValidacion[] = [];

  if (!esObjeto(bruto)) {
    return { ok: false, errores: [{ campo: "body", codigo: "invalido" }] };
  }

  /* --- Clave de idempotencia --------------------------------------------- */
  const idempotencyKey = bruto.idempotencyKey;
  if (!esUuid(idempotencyKey)) {
    errores.push({ campo: "idempotencyKey", codigo: "uuid_invalido" });
  }

  /* --- Bundle ------------------------------------------------------------- */
  const packId = bruto.packId;
  const bundle = PRODUCTO_BUNDLES.find((b) => b.id === packId);
  if (!bundle) {
    errores.push({ campo: "packId", codigo: "bundle_invalido" });
  }

  /* --- Cantidad ----------------------------------------------------------
     Solo el pack de 1 admite cantidad. Un pack fijo con cantidad > 1 se
     RECHAZA en lugar de corregirse en silencio: el cliente está pidiendo
     algo que el catálogo no vende a ese precio.                            */
  const qtyBruta = bruto.qty ?? 1;
  let qty = 1;
  if (bundle) {
    if (!Number.isInteger(qtyBruta)) {
      errores.push({ campo: "qty", codigo: "no_entero" });
    } else if (bundle.fijo) {
      if (qtyBruta !== 1) {
        errores.push({ campo: "qty", codigo: "pack_fijo_cantidad_unica" });
      }
    } else if ((qtyBruta as number) < QTY_MIN || (qtyBruta as number) > QTY_MAX) {
      errores.push({ campo: "qty", codigo: "fuera_de_rango" });
    } else {
      qty = qtyBruta as number;
    }
  }

  /* --- Pulsera extra -----------------------------------------------------
     Es un booleano estricto. Al no aceptarse una lista de ítems del cliente,
     no existe forma de pedir dos pulseras promocionales: como máximo una.
     Cualquier otro tipo (2, "1", [..]) se rechaza en lugar de coercionarse. */
  const extraBruto = bruto.extra ?? false;
  if (typeof extraBruto !== "boolean") {
    errores.push({ campo: "extra", codigo: "debe_ser_booleano" });
  }
  const extra = extraBruto === true;

  /* --- Zona de envío ------------------------------------------------------ */
  const zona = bruto.zona;
  if (zona !== "asuncion" && zona !== "interior") {
    errores.push({ campo: "zona", codigo: "zona_invalida" });
  }

  /* --- VIP ---------------------------------------------------------------- */
  const vipBruto = bruto.vip ?? false;
  if (typeof vipBruto !== "boolean") {
    errores.push({ campo: "vip", codigo: "debe_ser_booleano" });
  }
  const vip = vipBruto === true;

  /* --- Método de pago ----------------------------------------------------- */
  const metodoPago = bruto.metodoPago;
  if (metodoPago !== "transferencia" && metodoPago !== "tarjeta") {
    errores.push({ campo: "metodoPago", codigo: "metodo_invalido" });
  }

  /* --- Contacto ----------------------------------------------------------- */
  const contactoBruto = esObjeto(bruto.contacto) ? bruto.contacto : {};
  const contacto: CamposContacto = {
    nombre: texto(contactoBruto.nombre, 120),
    telefono: texto(contactoBruto.telefono, 30),
    ciudad: texto(contactoBruto.ciudad, 80),
    direccion: texto(contactoBruto.direccion, 200),
    ubicacion: texto(contactoBruto.ubicacion, 500),
  };
  for (const [campo, mensaje] of Object.entries(validarContacto(contacto))) {
    if (mensaje) errores.push({ campo: `contacto.${campo}`, codigo: "invalido" });
  }

  if (errores.length > 0) return { ok: false, errores };

  /* --- Recálculo ---------------------------------------------------------
     Desde acá no se vuelve a mirar el payload: todo sale del catálogo.     */
  const totales = totalesCheckout(
    { packId: bundle!.id, qty, extra },
    zona as ZonaId,
    vip,
  );

  const items: ItemPedido[] = [
    {
      sku: `pack-${bundle!.id}`,
      product_name: bundle!.nombreLargo,
      bundle_id: bundle!.id,
      quantity: qty,
      unit_price: bundle!.precio,
      compare_at_price: bundle!.compare > 0 ? bundle!.compare : null,
      line_total: bundle!.precio * qty,
      is_promotional: false,
    },
  ];

  if (extra) {
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
  }

  return {
    ok: true,
    pedido: {
      idempotencyKey: idempotencyKey as string,
      contacto,
      packId: bundle!.id,
      qty,
      extra,
      zona: zona as ZonaId,
      vip,
      metodoPago: metodoPago as MetodoPago,
      paymentStatus:
        metodoPago === "tarjeta"
          ? "pendiente_pago_online"
          : "pendiente_transferencia",
      subtotal: totales.subtotal,
      descuento: totales.ahorro,
      envio: totales.envio,
      envioGratis: totales.envioGratis,
      vipCosto: totales.vipCosto,
      total: totales.total,
      unidades: totales.unidades,
      items,
    },
  };
}
