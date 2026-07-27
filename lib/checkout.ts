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
   Payload del pedido
   ------------------------------------------------------------ */

export type MetodoPago = "transferencia" | "tarjeta";

export type OrderPayload = {
  contacto: {
    nombre: string;
    telefono: string;
    ciudad: string;
    direccion: string;
    ubicacion?: string;
  };
  items: { sku: string; cantidad: number; precioUnitario: number }[];
  envio: { zona: ZonaId; costo: number; gratis: boolean; vip: boolean };
  total: number;
  metodoPago: MetodoPago;
};

/**
 * Arma el payload que la FASE 5 va a mandar al endpoint de pedidos.
 * Es una función pura: no hace red, no persiste y no conoce ninguna URL.
 */
export function construirPayload(
  campos: CamposContacto,
  totales: TotalesCheckout,
  zona: ZonaId,
  vip: boolean,
  metodoPago: MetodoPago,
): OrderPayload {
  const items = [
    {
      sku: `pack-${totales.bundle.id}`,
      cantidad: totales.qty,
      precioUnitario: totales.bundle.precio,
    },
  ];

  if (totales.extra) {
    items.push({ sku: "pulsera-extra", cantidad: 1, precioUnitario: 70_000 });
  }

  const ubicacion = campos.ubicacion.trim();

  return {
    contacto: {
      nombre: campos.nombre.trim(),
      telefono: normalizarTelefono(campos.telefono),
      ciudad: campos.ciudad.trim(),
      direccion: campos.direccion.trim(),
      ...(ubicacion ? { ubicacion } : {}),
    },
    items,
    envio: {
      zona,
      costo: totales.envio,
      gratis: totales.envioGratis,
      vip,
    },
    total: totales.total,
    metodoPago,
  };
}

/* ------------------------------------------------------------
   Punto de conexión de la FASE 5
   ------------------------------------------------------------ */

/**
 * ⚠️ STUB — LA FASE 5 CONECTA ACÁ.
 *
 * En la fase 5 esta función debe, en este orden:
 *   1. POSTear `payload` al endpoint de pedidos y esperar la respuesta con el
 *      id/referencia del pedido. El pedido tiene que quedar registrado ANTES
 *      de cualquier redirección, para que exista aunque el pago se abandone.
 *   2. Persistir el estado `pendiente_transferencia` o `pendiente_pago_online`
 *      según `payload.metodoPago`, y marcarlo `pagado` desde el callback del
 *      proveedor.
 *   3. Devolver la `paymentUrl` del servidor cuando el método es `tarjeta`.
 *      La URL NUNCA se construye en el cliente, y la referencia del pedido
 *      viaja con ella para que el proveedor pueda reconciliar.
 *   4. Proteger contra doble submit con la referencia del pedido.
 *
 * Hoy no existe endpoint, ni proveedor de pagos, ni base de datos, así que
 * esta función no hace nada a propósito: no registra pedidos, no simula
 * éxito, no redirige y no inventa URLs. El checkout valida el formulario y
 * arma el payload; ahí termina el alcance de la fase 4.
 */
export async function submitOrder(payload: OrderPayload): Promise<void> {
  void payload;
}

export { ZONA_POR_DEFECTO };
