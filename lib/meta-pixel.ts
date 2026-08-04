/**
 * Meta Pixel — única integración de tracking del proyecto.
 *
 * Todo lo que toca `fbq` vive acá: la carga del script, la inicialización y
 * cada evento estándar. Ningún componente llama a `window.fbq` directo.
 *
 * REGLAS QUE SE SOSTIENEN DESDE ESTE ARCHIVO
 *
 *   1. Solo navegador. Cada función corta apenas detecta que no hay `window`,
 *      así que un componente de servidor puede importar este módulo sin
 *      riesgo (lo hace `app/layout.tsx` para el `<noscript>`).
 *   2. Una sola inicialización. `iniciado` es de módulo, así que sobrevive a
 *      re-renders, a remontajes y al doble efecto de React StrictMode.
 *   3. Sin datos personales. Los eventos llevan ids de producto, importes,
 *      moneda, cantidades y el número de pedido. Nunca nombre, teléfono,
 *      dirección, cédula ni el token de confirmación.
 *   4. Purchase no se duplica: se recuerda el número de pedido ya reportado
 *      en `localStorage`, y además viaja como `eventID` para que Meta pueda
 *      deduplicar del lado del servidor.
 */
import { EXTRA, PRODUCTO_BUNDLES, type BundleId } from "@/lib/content";
import { calcularTotales, getBundle } from "@/lib/cart";

/**
 * Pixel ID. Sale de la variable de entorno cuando está configurada, y si no
 * cae al ID del código base que entregó Meta Events Manager, para que el
 * pixel funcione aunque el deploy no tenga la variable cargada.
 */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "2195171668070768";

/** Guaraníes. Todos los importes del sitio están en esta moneda. */
export const MONEDA = "PYG";

/** Rutas donde el pixel no se carga: el panel es uso interno, no marketing. */
const RUTAS_EXCLUIDAS = ["/admin"];

export const rutaConPixel = (ruta: string): boolean =>
  META_PIXEL_ID !== "" && !RUTAS_EXCLUIDAS.some((r) => ruta.startsWith(r));

/* ------------------------------------------------------------
   Eventos y parámetros
   ------------------------------------------------------------ */

export type EventoEstandar =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Contact";

/** Línea de producto tal como la espera Meta en `contents`. */
export type ContenidoPixel = { id: string; quantity: number };

export type ParamsEvento = {
  content_ids?: string[];
  contents?: ContenidoPixel[];
  content_name?: string;
  content_type?: "product";
  value?: number;
  currency?: string;
  num_items?: number;
  order_id?: string;
};

/* ------------------------------------------------------------
   Carga del script (el código base de Meta, en TypeScript)
   ------------------------------------------------------------ */

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

type VentanaConFbq = Window & { fbq?: Fbq; _fbq?: Fbq };

const SRC_FBEVENTS = "https://connect.facebook.net/en_US/fbevents.js";

let iniciado = false;

/**
 * Instala el stub `fbq` e inyecta `fbevents.js`, igual que el snippet oficial.
 * El stub encola las llamadas que ocurran antes de que el script termine de
 * cargar, así que ningún evento se pierde por llegar temprano.
 */
function instalarFbq(): void {
  const w = window as VentanaConFbq;
  if (w.fbq) return;

  const cola: unknown[][] = [];
  const n: Fbq = Object.assign(
    function (...args: unknown[]) {
      if (n.callMethod) {
        // Reflect.apply, y no una llamada directa, para conservar el `this`
        // que espera fbevents.js — es lo que hace el snippet oficial.
        Reflect.apply(n.callMethod, n, args);
      } else {
        n.queue.push(args);
      }
    },
    { queue: cola, loaded: true, version: "2.0" },
  );
  n.push = n;

  w.fbq = n;
  if (!w._fbq) w._fbq = n;

  const script = document.createElement("script");
  script.async = true;
  script.src = SRC_FBEVENTS;

  const primero = document.getElementsByTagName("script")[0];
  if (primero?.parentNode) {
    primero.parentNode.insertBefore(script, primero);
  } else {
    document.head.appendChild(script);
  }
}

/**
 * Inicializa el pixel una sola vez por carga de página.
 *
 * A diferencia del snippet de Meta, acá `init` NO dispara PageView: lo manda
 * `trackPageView()` desde <MetaPixel />, que es quien también cubre los
 * cambios de ruta del App Router. Así la primera vista y las navegaciones
 * siguen exactamente el mismo camino y no hay un PageView de más.
 */
export function initMetaPixel(): void {
  if (iniciado || typeof window === "undefined" || META_PIXEL_ID === "") return;

  instalarFbq();
  (window as VentanaConFbq).fbq?.("init", META_PIXEL_ID);
  iniciado = true;
}

/** Envía un evento estándar. No hace nada si el pixel no se inicializó. */
export function track(
  evento: EventoEstandar,
  params?: ParamsEvento,
  opciones?: { eventID: string },
): void {
  if (!iniciado || typeof window === "undefined") return;

  const fbq = (window as VentanaConFbq).fbq;
  if (!fbq) return;

  if (opciones) {
    fbq("track", evento, params ?? {}, opciones);
  } else if (params) {
    fbq("track", evento, params);
  } else {
    fbq("track", evento);
  }
}

/* ------------------------------------------------------------
   SKUs y armado de parámetros
   ------------------------------------------------------------ */

/** Mismo SKU que guarda `order_items`, para que el catálogo cierre. */
export const skuDeBundle = (id: BundleId): string => `pack-${id}`;
export const SKU_EXTRA = "pulsera-extra";

export type PedidoPixel = { packId: BundleId; qty: number; extra: boolean };

/** Líneas del pedido: el pack elegido y, si está, la pulsera promocional. */
export function contenidosDePedido(pedido: PedidoPixel): ContenidoPixel[] {
  const bundle = getBundle(pedido.packId);
  const contenidos: ContenidoPixel[] = [
    { id: skuDeBundle(pedido.packId), quantity: bundle.fijo ? 1 : pedido.qty },
  ];
  if (pedido.extra) contenidos.push({ id: SKU_EXTRA, quantity: 1 });
  return contenidos;
}

/**
 * Parámetros de ecommerce de un pedido.
 *
 * @param valor Importe real que corresponde al momento del evento.
 * @param unidades Pulseras del pedido, contando la extra.
 */
export function paramsDePedido(
  pedido: PedidoPixel,
  valor: number,
  unidades: number,
): ParamsEvento {
  const contents = contenidosDePedido(pedido);
  return {
    content_ids: contents.map((c) => c.id),
    contents,
    content_name: getBundle(pedido.packId).nombreLargo,
    content_type: "product",
    value: valor,
    currency: MONEDA,
    num_items: unidades,
  };
}

/* ------------------------------------------------------------
   Eventos
   ------------------------------------------------------------ */

/**
 * PageView. Recuerda la última ruta reportada, así que un remontaje, un
 * re-render o el doble efecto de StrictMode no generan un segundo evento.
 */
let ultimaRuta: string | null = null;

export function trackPageView(ruta: string): void {
  if (ultimaRuta === ruta) return;
  ultimaRuta = ruta;
  track("PageView");
}

/** ViewContent — visualización de la página de producto. */
export function trackViewContent(bundleId: BundleId): void {
  const bundle = getBundle(bundleId);
  const totales = calcularTotales(bundle);

  track("ViewContent", {
    content_ids: [skuDeBundle(bundleId)],
    contents: [{ id: skuDeBundle(bundleId), quantity: 1 }],
    content_name: bundle.nombreLargo,
    content_type: "product",
    value: totales.subtotal,
    currency: MONEDA,
    num_items: totales.unidades,
  });
}

/** AddToCart de un pack — se llama recién cuando el carrito ya lo aceptó. */
export function trackAddToCartBundle(bundleId: BundleId, qty = 1): void {
  const bundle = getBundle(bundleId);
  const totales = calcularTotales(bundle, qty);

  track("AddToCart", {
    content_ids: [skuDeBundle(bundleId)],
    contents: [{ id: skuDeBundle(bundleId), quantity: bundle.fijo ? 1 : qty }],
    content_name: bundle.nombreLargo,
    content_type: "product",
    value: totales.subtotal,
    currency: MONEDA,
    num_items: totales.unidades,
  });
}

/** AddToCart de la pulsera promocional del carrito. */
export function trackAddToCartExtra(): void {
  track("AddToCart", {
    content_ids: [SKU_EXTRA],
    contents: [{ id: SKU_EXTRA, quantity: 1 }],
    content_name: EXTRA.nombre,
    content_type: "product",
    value: EXTRA.precio,
    currency: MONEDA,
    num_items: 1,
  });
}

/** InitiateCheckout — entrada real al checkout, no el click del botón. */
export function trackInitiateCheckout(
  pedido: PedidoPixel,
  valor: number,
  unidades: number,
): void {
  track("InitiateCheckout", paramsDePedido(pedido, valor, unidades));
}

/** AddPaymentInfo — método de pago elegido o confirmado. */
export function trackAddPaymentInfo(
  pedido: PedidoPixel,
  valor: number,
  unidades: number,
): void {
  track("AddPaymentInfo", paramsDePedido(pedido, valor, unidades));
}

/** Contact — click para iniciar la conversación por WhatsApp. */
export function trackContact(): void {
  track("Contact");
}

/* ------------------------------------------------------------
   Purchase — con control de duplicados por número de pedido
   ------------------------------------------------------------ */

const CLAVE_PURCHASE = "grit:pixel:purchase:v1";
/** Cuántos pedidos se recuerdan. Alcanza de sobra para un mismo navegador. */
const MAX_RECORDADOS = 20;

/** Respaldo en memoria para cuando localStorage está bloqueado. */
const reportadosEnMemoria = new Set<string>();

function leerReportados(): string[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE_PURCHASE);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function recordarReportado(orderId: string): void {
  reportadosEnMemoria.add(orderId);
  try {
    const previos = leerReportados().filter((id) => id !== orderId);
    const siguientes = [orderId, ...previos].slice(0, MAX_RECORDADOS);
    window.localStorage.setItem(CLAVE_PURCHASE, JSON.stringify(siguientes));
  } catch {
    // Modo privado o cuota llena: queda el respaldo en memoria, que ya cubre
    // el re-render y el doble clic dentro de la misma carga de página.
  }
}

/** `true` si este pedido ya se reportó antes, en esta carga o en otra. */
export function purchaseYaReportado(orderId: string): boolean {
  if (typeof window === "undefined") return true;
  if (reportadosEnMemoria.has(orderId)) return true;
  return leerReportados().includes(orderId);
}

export type DatosPurchase = {
  /** Número de pedido — es la clave de deduplicación. */
  orderId: string;
  /** Total realmente cobrado, ya con envío y VIP. */
  valor: number;
  contents: ContenidoPixel[];
  /** Pulseras del pedido. */
  unidades: number;
  contentName?: string;
};

/**
 * Purchase. Solo se llama desde /gracias, con el pedido ya leído de la base:
 * si el servidor no lo encontró, esta función nunca corre.
 *
 * Devuelve `false` cuando el evento no se envió por estar duplicado —
 * re-render, doble montaje, recarga de la página o volver a abrir el enlace
 * de confirmación.
 */
export function trackPurchase(datos: DatosPurchase): boolean {
  if (typeof window === "undefined" || !datos.orderId) return false;
  if (purchaseYaReportado(datos.orderId)) return false;

  // Se marca ANTES de enviar: si algo falla después, el riesgo aceptado es
  // perder un evento, nunca contar la compra dos veces.
  recordarReportado(datos.orderId);

  track(
    "Purchase",
    {
      content_ids: datos.contents.map((c) => c.id),
      contents: datos.contents,
      content_name: datos.contentName,
      content_type: "product",
      value: datos.valor,
      currency: MONEDA,
      num_items: datos.unidades,
      order_id: datos.orderId,
    },
    // Mismo pedido = mismo eventID: Meta deduplica aunque el evento llegue
    // desde dos navegadores distintos.
    { eventID: `purchase-${datos.orderId}` },
  );

  return true;
}

/* ------------------------------------------------------------
   Ítems guardados del pedido → parámetros del pixel
   ------------------------------------------------------------ */

export type ItemGuardado = {
  sku: string;
  quantity: number;
  bundle_id: string | null;
};

/**
 * Traduce las líneas guardadas en `order_items` a lo que espera el pixel.
 *
 * `num_items` cuenta pulseras, no líneas: un pack de 2 son 2 pulseras. Se
 * resuelve con el catálogo, igual que el resto del sistema de precios.
 */
export function datosDeItems(items: ItemGuardado[]): {
  contents: ContenidoPixel[];
  unidades: number;
} {
  const contents = items.map((i) => ({ id: i.sku, quantity: i.quantity }));

  const unidades = items.reduce((total, i) => {
    const bundle = PRODUCTO_BUNDLES.find((b) => b.id === i.bundle_id);
    return total + (bundle ? bundle.unidades * i.quantity : i.quantity);
  }, 0);

  return { contents, unidades };
}
