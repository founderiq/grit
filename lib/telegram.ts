/**
 * Aviso de nuevo pedido por Telegram.
 *
 * `import "server-only"` hace que el build falle si un componente de cliente
 * llega a importar este módulo: el token del bot no puede terminar nunca en el
 * bundle del navegador.
 *
 * El mensaje se manda como **texto plano, sin `parse_mode`**. Es la opción más
 * segura: sin Markdown ni HTML no hay forma de que el nombre o la dirección de
 * un cliente rompan el formato ni inyecten marcado. Igual se sanitizan los
 * datos del cliente (ver `limpiar`), porque en texto plano el riesgo que queda
 * es que un salto de línea permita falsificar una línea del mensaje.
 */
import "server-only";
import { ENVIOS, VIP, fmtGs } from "@/lib/content";

const API = "https://api.telegram.org";

/** Telegram corta los mensajes en 4096 caracteres. */
const LARGO_MAXIMO = 4096;

/** Cuánto se espera a Telegram antes de rendirse y seguir. */
const TIMEOUT_MS = 5000;

export type ItemNotificacion = {
  product_name: string;
  quantity: number;
  line_total: number;
};

export type PedidoNotificacion = {
  orderNumber: string;
  cliente: {
    nombre: string;
    whatsapp: string;
    ciudad: string;
    direccion: string;
    ubicacion?: string | null;
  };
  items: ItemNotificacion[];
  subtotal: number;
  envio: number;
  envioGratis: boolean;
  vip: boolean;
  vipCosto: number;
  total: number;
  zona: string;
  metodoPago: "transferencia" | "tarjeta";
  paymentStatus: string;
};

export type ResultadoNotificacion =
  | { ok: true }
  | { ok: false; motivo: "sin_configuracion" | "timeout" | "respuesta_error" | "error_red" };

/* ------------------------------------------------------------
   Sanitización
   ------------------------------------------------------------ */

/**
 * Deja un dato del cliente en una sola línea y sin caracteres de control.
 *
 * Sin esto, alguien podría registrarse como `Juan\nTotal: Gs. 1` y falsificar
 * una línea del aviso. Al colapsar los saltos de línea, todo lo que escribe el
 * cliente queda confinado a su propia línea.
 */
export function limpiar(valor: string, max = 120): string {
  return (
    valor
      // Saltos de línea y tabulaciones → espacio.
      .replace(/[\r\n\t\v\f]+/g, " ")
      // Resto de caracteres de control, más los invisibles de dirección bidi,
      // que también sirven para disfrazar texto.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e\ufeff]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, max)
  );
}

/* ------------------------------------------------------------
   Mensaje
   ------------------------------------------------------------ */

const ESTADOS: Record<string, string> = {
  pendiente_transferencia: "Pendiente de transferencia",
  pendiente_pago_online: "Pendiente de pago online",
  pagado: "Pagado",
  fallido: "Fallido",
  cancelado: "Cancelado",
};

const METODOS: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  tarjeta: "Tarjeta de crédito/débito",
};

/**
 * Arma el aviso en texto plano.
 *
 * Todos los importes salen de lo que el servidor recalculó y guardó, nunca de
 * lo que mandó el navegador.
 */
export function construirMensaje(p: PedidoNotificacion): string {
  const zona = ENVIOS[p.zona as keyof typeof ENVIOS]?.corto ?? p.zona;

  const lineas: string[] = [
    "🛒 NUEVO PEDIDO GRIT",
    "",
    `Pedido: ${limpiar(p.orderNumber, 40)}`,
    `Cliente: ${limpiar(p.cliente.nombre)}`,
    `WhatsApp: ${limpiar(p.cliente.whatsapp, 30)}`,
    `Ciudad: ${limpiar(p.cliente.ciudad, 80)}`,
    `Dirección: ${limpiar(p.cliente.direccion, 200)}`,
  ];

  // La ubicación solo aparece cuando el cliente la cargó.
  const ubicacion = limpiar(p.cliente.ubicacion ?? "", 500);
  if (ubicacion) lineas.push(`Ubicación: ${ubicacion}`);

  lineas.push("", "Productos:");
  for (const item of p.items) {
    const cantidad = item.quantity > 1 ? ` ×${item.quantity}` : "";
    lineas.push(
      `• ${limpiar(item.product_name, 80)}${cantidad} — ${fmtGs(item.line_total)}`,
    );
  }

  lineas.push(
    "",
    `Subtotal: ${fmtGs(p.subtotal)}`,
    `Envío: ${p.envioGratis ? "Gratis" : fmtGs(p.envio)} (${zona})`,
    `${VIP.nombre}: ${p.vip ? `Sí (${fmtGs(p.vipCosto)})` : "No"}`,
    `Método de pago: ${METODOS[p.metodoPago] ?? p.metodoPago}`,
    `Total: ${fmtGs(p.total)}`,
    "",
    `Estado: ${ESTADOS[p.paymentStatus] ?? p.paymentStatus}`,
  );

  return lineas.join("\n").slice(0, LARGO_MAXIMO);
}

/* ------------------------------------------------------------
   Envío
   ------------------------------------------------------------ */

/**
 * Quita el token de cualquier texto antes de que llegue a un log.
 *
 * La URL de la API lleva el token adentro, así que un mensaje de error de
 * `fetch` puede contenerlo. Nada se registra sin pasar por acá.
 */
export function redactar(texto: string, token?: string): string {
  if (!token) return texto;
  return texto.split(token).join("***");
}

/**
 * Manda el aviso al grupo. **Nunca lanza**: devuelve el resultado para que el
 * llamador decida, porque un fallo de Telegram no debe afectar al pedido.
 */
export async function notificarPedidoNuevo(
  pedido: PedidoNotificacion,
): Promise<ResultadoNotificacion> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Se nombra la variable que falta, nunca su valor.
    const faltan = [
      !token ? "TELEGRAM_BOT_TOKEN" : null,
      !chatId ? "TELEGRAM_CHAT_ID" : null,
    ].filter(Boolean);
    console.error("[telegram] configuración incompleta:", faltan.join(", "));
    return { ok: false, motivo: "sin_configuracion" };
  }

  try {
    const respuesta = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: construirMensaje(pedido),
        // Sin parse_mode: texto plano, sin marcado que se pueda inyectar.
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      console.error("[telegram] la API respondió con error", {
        status: respuesta.status,
        pedido: pedido.orderNumber,
      });
      return { ok: false, motivo: "respuesta_error" };
    }

    return { ok: true };
  } catch (e) {
    const esTimeout =
      e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");

    // Solo el nombre del error y un mensaje ya redactado: el token de la URL
    // nunca llega al log.
    console.error("[telegram] no se pudo enviar el aviso", {
      tipo: e instanceof Error ? e.name : "desconocido",
      detalle: redactar(e instanceof Error ? e.message : "", token),
      pedido: pedido.orderNumber,
    });

    return { ok: false, motivo: esTimeout ? "timeout" : "error_red" };
  }
}
