/**
 * Lógica del checkout — funciones puras, sin React.
 *
 * Reutiliza los helpers de `lib/cart.ts` para el subtotal y el ahorro, así que
 * un mismo pedido no puede costar distinto en producto, carrito y checkout.
 */
import {
  BANCO,
  CHECKOUT,
  ENVIOS,
  ENVIO_GRATIS_DESDE,
  PRODUCTO_BUNDLES,
  VIP,
  ZONA_POR_DEFECTO,
  type BundleId,
  type ZonaId,
} from "@/lib/content";
import { QTY_MAX, QTY_MIN, calcularTotales, getBundle } from "@/lib/cart";

/* ------------------------------------------------------------
   Pedido que entra al checkout
   ------------------------------------------------------------ */

export type PedidoBase = {
  packId: BundleId;
  /** Solo tiene efecto en el pack de 1. */
  qty: number;
  extra: boolean;
};

export const PEDIDO_POR_DEFECTO: PedidoBase = {
  packId: "2",
  qty: 1,
  extra: false,
};

const esBundleId = (v: unknown): v is BundleId =>
  v === "1" || v === "2" || v === "3";

/**
 * Interpreta los query params del checkout.
 * Devuelve `null` cuando no hay un `pack` válido, para que el llamador pueda
 * caer al carrito persistido antes de usar el pack de 2.
 */
export function pedidoDesdeParams(
  params: URLSearchParams | Record<string, string | undefined>,
): PedidoBase | null {
  const leer = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) : params[k];

  const pack = leer("pack");
  if (!esBundleId(pack)) return null;

  const qtyCruda = parseInt(leer("qty") ?? "1", 10);
  const qty =
    pack === "1"
      ? Math.min(QTY_MAX, Math.max(QTY_MIN, Number.isFinite(qtyCruda) ? qtyCruda : 1))
      : 1;

  return { packId: pack, qty, extra: leer("extra") === "1" };
}

/* ------------------------------------------------------------
   Totales
   ------------------------------------------------------------ */

export type TotalesCheckout = {
  bundle: (typeof PRODUCTO_BUNDLES)[number];
  qty: number;
  extra: boolean;
  unidades: number;
  subtotal: number;
  ahorro: number;
  /** Costo del envío estándar ya con la regla de envío gratis aplicada. */
  envio: number;
  /** true cuando el pedido llega a 3 pulseras y el envío estándar es Gs. 0. */
  envioGratis: boolean;
  vipCosto: number;
  total: number;
};

/**
 * Totales del pedido.
 *
 * El envío estándar es gratis a partir de 3 pulseras, contando las unidades
 * del pack más la pulsera extra promocional. La zona se sigue eligiendo igual,
 * porque define el método y el plazo de entrega.
 *
 * El Envío Prioritario VIP se cobra siempre que esté activo, incluso cuando el
 * envío estándar sea gratis.
 */
export function totalesCheckout(
  pedido: PedidoBase,
  zona: ZonaId,
  vip: boolean,
): TotalesCheckout {
  const bundle = getBundle(pedido.packId);
  const base = calcularTotales(bundle, pedido.qty, pedido.extra);

  const envioGratis = base.unidades >= ENVIO_GRATIS_DESDE;
  const envio = envioGratis ? 0 : ENVIOS[zona].costo;
  const vipCosto = vip ? VIP.costo : 0;

  return {
    bundle,
    qty: bundle.fijo ? 1 : pedido.qty,
    extra: pedido.extra,
    unidades: base.unidades,
    subtotal: base.subtotal,
    ahorro: base.ahorro,
    envio,
    envioGratis,
    vipCosto,
    total: base.subtotal + envio + vipCosto,
  };
}

/* ------------------------------------------------------------
   Validación
   ------------------------------------------------------------ */

export type CamposContacto = {
  nombre: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  ubicacion: string;
};

export type CampoId = keyof CamposContacto;

export const CAMPOS_ORDEN: CampoId[] = [
  "nombre",
  "telefono",
  "ciudad",
  "direccion",
  "ubicacion",
];

export const CAMPOS_INICIALES: CamposContacto = {
  nombre: "",
  telefono: "",
  ciudad: "",
  direccion: "",
  ubicacion: "",
};

/** Deja solo dígitos y el `+` inicial, para validar el teléfono. */
const normalizarTelefono = (v: string) =>
  v.trim().replace(/[\s().-]/g, "");

/**
 * Formatos aceptados, ambos el mismo número:
 *   09xxxxxxxx      (10 dígitos, formato local)
 *   +5959xxxxxxxx   (prefijo internacional de Paraguay)
 */
export const TELEFONO_VALIDO = /^(09\d{8}|\+5959\d{8})$/;

const esUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export type Errores = Partial<Record<CampoId, string>>;

export function validarContacto(campos: CamposContacto): Errores {
  const e: Errores = {};
  const c = CHECKOUT.campos;

  const nombre = campos.nombre.trim();
  if (nombre.length < 3 || !/^[\p{L}\s'’-]+$/u.test(nombre)) {
    e.nombre = c.nombre.error;
  }

  if (!TELEFONO_VALIDO.test(normalizarTelefono(campos.telefono))) {
    e.telefono = c.telefono.error;
  }

  if (campos.ciudad.trim().length === 0) e.ciudad = c.ciudad.error;
  if (campos.direccion.trim().length < 5) e.direccion = c.direccion.error;

  const ubicacion = campos.ubicacion.trim();
  if (ubicacion.length > 0 && !esUrl(ubicacion)) {
    e.ubicacion = c.ubicacion.error;
  }

  return e;
}

/* ------------------------------------------------------------
   Datos bancarios
   ------------------------------------------------------------ */

/** Las seis líneas del banco, una por renglón, como `Etiqueta: valor`. */
export function textoDatosBancarios(): string {
  return BANCO.map(({ etiqueta, valor }) => `${etiqueta}: ${valor}`).join("\n");
}

/**
 * Copia al portapapeles. Cae a `document.execCommand` cuando la Clipboard API
 * no está disponible (contexto no seguro, permisos denegados, navegadores
 * viejos). Devuelve si la copia se concretó.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Sigue con el fallback.
  }

  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------
   Método de pago
   ------------------------------------------------------------ */

export type MetodoPago = "transferencia" | "tarjeta";

/**
 * Normaliza el teléfono antes de mandarlo al servidor: sin espacios, puntos,
 * guiones ni paréntesis. El servidor lo vuelve a validar igual.
 */
export const telefonoNormalizado = (v: string) => normalizarTelefono(v);

/* ------------------------------------------------------------
   Envío del pedido al servidor
   ------------------------------------------------------------ */

/**
 * Cuánto se espera al servidor antes de rendirse.
 *
 * El endpoint espera a que Supabase confirme el pedido, y eso es lo único que
 * espera: el aviso por Telegram y la conversión del checkout abandonado quedan
 * para después de la respuesta. Veinte segundos es muy por encima de lo normal;
 * está para que una red caída no deje el botón girando para siempre.
 */
export const TIMEOUT_PEDIDO_MS = 20_000;

/** Lo que el navegador manda al endpoint. Sin un solo importe. */
export type SolicitudPedido = {
  idempotencyKey: string;
  /**
   * Clave del checkout abandonado de esta sesión, si existe. El servidor la usa
   * para marcar esa fila como convertida. Es opcional: sin ella el pedido se
   * crea igual.
   */
  sessionKey?: string | null;
  packId: BundleId;
  qty: number;
  extra: boolean;
  zona: ZonaId;
  vip: boolean;
  metodoPago: MetodoPago;
  contacto: CamposContacto;
};

export type PedidoCreado = {
  orderNumber: string;
  confirmationToken: string;
  total: number;
  paymentMethod: MetodoPago;
  paymentStatus: string;
  redirectUrl: string;
};

export type ResultadoEnvio =
  | { ok: true; pedido: PedidoCreado }
  | { ok: false; codigo: string };

/**
 * Registra el pedido en `POST /api/pedidos`.
 *
 * El cuerpo lleva **solo la configuración elegida y el contacto**: ni
 * subtotal, ni ahorro, ni envío, ni total, ni precios. El servidor recalcula
 * todo desde el catálogo, así que manipular importes en el navegador no
 * cambia lo que se guarda.
 *
 * La respuesta llega con el pedido ya creado y `redirectUrl` apuntando a
 * /gracias con el token de confirmación.
 */
export async function submitOrder(
  solicitud: SolicitudPedido,
): Promise<ResultadoEnvio> {
  let respuesta: Response;
  try {
    respuesta = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(solicitud),
      signal: AbortSignal.timeout(TIMEOUT_PEDIDO_MS),
    });
  } catch (e) {
    // Se distingue el corte por tiempo de la falta de red: el mensaje que ve el
    // comprador no puede ser el mismo. Si venció el tiempo, el pedido PUEDE
    // haberse creado, y la clave de idempotencia hace que reintentar sea
    // seguro: el segundo intento devuelve el mismo pedido, no otro.
    const vencio =
      e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { ok: false, codigo: vencio ? "tiempo_agotado" : "sin_conexion" };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    const codigo =
      typeof cuerpo === "object" && cuerpo !== null && "error" in cuerpo
        ? String((cuerpo as { error: unknown }).error)
        : "error_interno";
    return { ok: false, codigo };
  }

  return { ok: true, pedido: cuerpo as PedidoCreado };
}

export { ZONA_POR_DEFECTO };
