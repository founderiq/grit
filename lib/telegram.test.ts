import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  construirMensaje,
  limpiar,
  notificarPedidoNuevo,
  redactar,
  type PedidoNotificacion,
} from "@/lib/telegram";

/** Token de mentira, solo para verificar que nunca se filtra. */
const TOKEN_FALSO = "123456789:AAFAKEtokenQUEnoDEBEaparecerJAMAS";
const CHAT_FALSO = "-1001234567890";

const pedido = (over: Partial<PedidoNotificacion> = {}): PedidoNotificacion => ({
  orderNumber: "GRT-20260727-000106",
  cliente: {
    nombre: "Camila Rodríguez",
    whatsapp: "0992363483",
    ciudad: "Asunción",
    direccion: "Av. España 1234",
    ubicacion: null,
  },
  items: [
    { product_name: "Pack de 2 Pulseras GRIT", quantity: 1, line_total: 199_000 },
  ],
  subtotal: 199_000,
  envio: 20_000,
  envioGratis: false,
  vip: false,
  vipCosto: 0,
  total: 219_000,
  zona: "asuncion",
  metodoPago: "transferencia",
  paymentStatus: "pendiente_transferencia",
  ...over,
});

/* ------------------------------------------------------------------ */

describe("construirMensaje", () => {
  it("pack 2 sin extra: cabecera, datos, producto y totales", () => {
    const m = construirMensaje(pedido());
    expect(m).toContain("🛒 NUEVO PEDIDO GRIT");
    expect(m).toContain("Pedido: GRT-20260727-000106");
    expect(m).toContain("Cliente: Camila Rodríguez");
    expect(m).toContain("WhatsApp: 0992363483");
    expect(m).toContain("Ciudad: Asunción");
    expect(m).toContain("Dirección: Av. España 1234");
    expect(m).toContain("• Pack de 2 Pulseras GRIT — Gs. 199.000");
    expect(m).toContain("Subtotal: Gs. 199.000");
    expect(m).toContain("Envío: Gs. 20.000 (Gran Asunción)");
    expect(m).toContain("Envío Prioritario VIP: No");
    expect(m).toContain("Método de pago: Transferencia bancaria");
    expect(m).toContain("Total: Gs. 219.000");
    expect(m).toContain("Estado: Pendiente de transferencia");
  });

  it("sin pulsera extra no aparece esa línea", () => {
    expect(construirMensaje(pedido())).not.toContain("Pulsera GRIT extra");
  });

  it("pack 2 + extra con envío gratis", () => {
    const m = construirMensaje(
      pedido({
        items: [
          { product_name: "Pack de 2 Pulseras GRIT", quantity: 1, line_total: 199_000 },
          { product_name: "Pulsera GRIT extra", quantity: 1, line_total: 70_000 },
        ],
        subtotal: 269_000,
        envio: 0,
        envioGratis: true,
        total: 269_000,
      }),
    );
    expect(m).toContain("• Pack de 2 Pulseras GRIT — Gs. 199.000");
    expect(m).toContain("• Pulsera GRIT extra — Gs. 70.000");
    expect(m).toContain("Envío: Gratis (Gran Asunción)");
    expect(m).toContain("Total: Gs. 269.000");
    expect(m).not.toContain("Envío: Gs. 0");
  });

  it("pack 3 + VIP: envío gratis pero el VIP se cobra igual", () => {
    const m = construirMensaje(
      pedido({
        items: [
          { product_name: "Pack de 3 Pulseras GRIT", quantity: 1, line_total: 269_000 },
        ],
        subtotal: 269_000,
        envio: 0,
        envioGratis: true,
        vip: true,
        vipCosto: 10_000,
        total: 279_000,
        zona: "interior",
      }),
    );
    expect(m).toContain("Envío: Gratis (Interior)");
    expect(m).toContain("Envío Prioritario VIP: Sí (Gs. 10.000)");
    expect(m).toContain("Total: Gs. 279.000");
  });

  it("muestra la cantidad cuando el pack de 1 lleva más de una unidad", () => {
    const m = construirMensaje(
      pedido({
        items: [{ product_name: "1 Pulsera GRIT", quantity: 3, line_total: 345_000 }],
      }),
    );
    expect(m).toContain("• 1 Pulsera GRIT ×3 — Gs. 345.000");
  });

  it("diferencia el método y el estado de tarjeta", () => {
    const m = construirMensaje(
      pedido({ metodoPago: "tarjeta", paymentStatus: "pendiente_pago_online" }),
    );
    expect(m).toContain("Método de pago: Tarjeta de crédito/débito");
    expect(m).toContain("Estado: Pendiente de pago online");
  });

  it("la ubicación solo aparece cuando existe", () => {
    expect(construirMensaje(pedido())).not.toContain("Ubicación:");
    expect(construirMensaje(pedido({ cliente: { ...pedido().cliente, ubicacion: "" } })))
      .not.toContain("Ubicación:");

    const conUbicacion = construirMensaje(
      pedido({
        cliente: { ...pedido().cliente, ubicacion: "https://maps.app.goo.gl/abc" },
      }),
    );
    expect(conUbicacion).toContain("Ubicación: https://maps.app.goo.gl/abc");
  });

  it("nunca supera el límite de 4096 caracteres de Telegram", () => {
    const m = construirMensaje(
      pedido({
        cliente: { ...pedido().cliente, direccion: "x".repeat(5000) },
        items: Array.from({ length: 50 }, () => ({
          product_name: "y".repeat(200),
          quantity: 1,
          line_total: 1000,
        })),
      }),
    );
    expect(m.length).toBeLessThanOrEqual(4096);
  });
});

describe("sanitización de datos del cliente", () => {
  it("un nombre con saltos de línea no puede falsificar líneas del mensaje", () => {
    const m = construirMensaje(
      pedido({
        cliente: {
          ...pedido().cliente,
          nombre: "Juan\nTotal: Gs. 1\nEstado: Pagado",
        },
      }),
    );
    // El texto inyectado queda confinado a la línea de Cliente.
    expect(m).toContain("Cliente: Juan Total: Gs. 1 Estado: Pagado");
    // Y el total y el estado reales siguen siendo los del servidor.
    expect(m).toContain("Total: Gs. 219.000");
    expect(m).toContain("Estado: Pendiente de transferencia");
    expect(m.split("\n").filter((l) => l.startsWith("Total: "))).toHaveLength(1);
    expect(m.split("\n").filter((l) => l.startsWith("Estado: "))).toHaveLength(1);
  });

  it("neutraliza retornos de carro, tabs y caracteres de control", () => {
    expect(limpiar("a\r\nb\tc  d")).toBe("a b c d");
  });

  it("elimina invisibles bidi y de ancho cero", () => {
    // U+200B espacio de ancho cero · U+202E override bidi
    expect(limpiar("Ca\u200bmi\u202ela")).toBe("Camila");
  });

  it("no rompe con acentos, ñ ni emoji", () => {
    const m = construirMensaje(
      pedido({
        cliente: {
          ...pedido().cliente,
          nombre: "Ñandutí Ávila 🙂",
          ciudad: "Ypacaraí",
          direccion: "Av. Mcal. López c/ Perú, casa №5",
        },
      }),
    );
    expect(m).toContain("Cliente: Ñandutí Ávila 🙂");
    expect(m).toContain("Ciudad: Ypacaraí");
    expect(m).toContain("Dirección: Av. Mcal. López c/ Perú, casa №5");
  });

  it("marcado de Markdown y HTML queda como texto literal", () => {
    const m = construirMensaje(
      pedido({
        cliente: {
          ...pedido().cliente,
          nombre: "*negrita* _cursiva_ [link](http://x) <b>bold</b>",
        },
      }),
    );
    // Se manda sin parse_mode, así que no hay nada que escapar: viaja literal.
    expect(m).toContain("Cliente: *negrita* _cursiva_ [link](http://x) <b>bold</b>");
  });
});

describe("redactar", () => {
  it("reemplaza el token allí donde aparezca", () => {
    const texto = `fetch failed for https://api.telegram.org/bot${TOKEN_FALSO}/sendMessage`;
    const limpio = redactar(texto, TOKEN_FALSO);
    expect(limpio).not.toContain(TOKEN_FALSO);
    expect(limpio).toContain("***");
  });

  it("sin token devuelve el texto tal cual", () => {
    expect(redactar("hola", undefined)).toBe("hola");
  });
});

/* ------------------------------------------------------------------ */

describe("notificarPedidoNuevo", () => {
  const fetchMock = vi.fn();
  let errores: unknown[][] = [];

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    errores = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errores.push(args);
    });
    process.env.TELEGRAM_BOT_TOKEN = TOKEN_FALSO;
    process.env.TELEGRAM_CHAT_ID = CHAT_FALSO;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  /** Ningún log puede contener el token. */
  const sinTokenEnLogs = () =>
    expect(JSON.stringify(errores)).not.toContain(TOKEN_FALSO);

  it("envía el mensaje a la API oficial, en texto plano", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const r = await notificarPedidoNuevo(pedido());
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN_FALSO}/sendMessage`);
    expect(opciones.method).toBe("POST");

    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.chat_id).toBe(CHAT_FALSO);
    expect(cuerpo.text).toContain("NUEVO PEDIDO GRIT");
    // Texto plano: sin parse_mode.
    expect(cuerpo).not.toHaveProperty("parse_mode");
    // Y con timeout, para no colgar la respuesta al comprador.
    expect(opciones.signal).toBeDefined();
  });

  it("si falta configuración no llama a la API y avisa qué variable falta", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const r = await notificarPedidoNuevo(pedido());
    expect(r).toEqual({ ok: false, motivo: "sin_configuracion" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(errores)).toContain("TELEGRAM_BOT_TOKEN");
    sinTokenEnLogs();
  });

  it("si la API responde con error, devuelve el motivo sin lanzar", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });

    const r = await notificarPedidoNuevo(pedido());
    expect(r).toEqual({ ok: false, motivo: "respuesta_error" });
    sinTokenEnLogs();
  });

  it("si la red falla, no lanza y el token no aparece en el log", async () => {
    fetchMock.mockRejectedValue(
      new Error(
        `request to https://api.telegram.org/bot${TOKEN_FALSO}/sendMessage failed`,
      ),
    );

    const r = await notificarPedidoNuevo(pedido());
    expect(r).toEqual({ ok: false, motivo: "error_red" });
    sinTokenEnLogs();
    expect(JSON.stringify(errores)).toContain("***");
  });

  it("distingue el timeout de otros errores de red", async () => {
    const e = new Error("The operation was aborted due to timeout");
    e.name = "TimeoutError";
    fetchMock.mockRejectedValue(e);

    const r = await notificarPedidoNuevo(pedido());
    expect(r).toEqual({ ok: false, motivo: "timeout" });
    sinTokenEnLogs();
  });

  it("nunca lanza, pase lo que pase", async () => {
    fetchMock.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(notificarPedidoNuevo(pedido())).resolves.toMatchObject({ ok: false });
  });

  it("el cuerpo enviado no contiene el token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notificarPedidoNuevo(pedido());
    expect(fetchMock.mock.calls[0]![1].body).not.toContain(TOKEN_FALSO);
  });
});
