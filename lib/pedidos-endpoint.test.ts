import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pruebas de integración de `POST /api/pedidos`.
 *
 * Se mockean Supabase y `fetch` — no se toca ni la base real ni la API de
 * Telegram. Lo que se verifica es el contrato del endpoint: cuándo notifica,
 * cuándo no, y que un fallo de Telegram jamás afecte al comprador.
 */

const TOKEN_FALSO = "987654321:BBotroTOKENfalsoQUEnoDEBEfiltrarse";

/* --- Supabase mockeado ------------------------------------------------- */
const rpcMock = vi.fn();
const single = vi.fn();

vi.mock("@/lib/supabase-admin", async () => {
  const real = await vi.importActual<typeof import("@/lib/supabase-admin")>(
    "@/lib/supabase-admin",
  );
  return {
    ...real,
    getSupabaseAdmin: () => ({ rpc: rpcMock }),
    hayConfiguracionSupabase: () => true,
  };
});

const { POST } = await import("@/app/api/pedidos/route");

/* --- Helpers ------------------------------------------------------------ */

const CUERPO_OK = {
  idempotencyKey: "3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34",
  packId: "2",
  qty: 1,
  extra: false,
  zona: "asuncion",
  vip: false,
  metodoPago: "transferencia",
  contacto: {
    nombre: "Camila Rodríguez",
    telefono: "0992363483",
    ciudad: "Asunción",
    direccion: "Av. España 1234",
  },
};

const pedir = (cuerpo: unknown = CUERPO_OK) =>
  POST(
    new Request("http://localhost/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
  );

const filaCreada = (over: Record<string, unknown> = {}) => ({
  data: {
    id: "11111111-2222-3333-4444-555555555555",
    order_number: "GRT-20260727-000106",
    confirmation_token: "9c1e5d8a-0b6f-4e34-9a7f-3f1a6c8e2b4d",
    total: 219_000,
    payment_method: "transferencia",
    payment_status: "pendiente_transferencia",
    is_duplicate: false,
    ...over,
  },
  error: null,
});

const fetchMock = vi.fn();
let errores: unknown[][] = [];

beforeEach(() => {
  rpcMock.mockReset();
  single.mockReset();
  rpcMock.mockReturnValue({ single });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  errores = [];
  vi.spyOn(console, "error").mockImplementation((...a) => errores.push(a));
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_FALSO;
  process.env.TELEGRAM_CHAT_ID = "-100999";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

/* ------------------------------------------------------------------ */

describe("notificación de pedidos nuevos", () => {
  it("un pedido nuevo intenta enviar la notificación", async () => {
    single.mockResolvedValue(filaCreada());

    const res = await pedir();
    expect(res.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cuerpo = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(cuerpo.text).toContain("GRT-20260727-000106");
    expect(cuerpo.text).toContain("Cliente: Camila Rodríguez");
  });

  it("un pedido duplicado NO vuelve a notificar", async () => {
    single.mockResolvedValue(filaCreada({ is_duplicate: true }));

    const res = await pedir();
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reintentar con la misma clave notifica una sola vez", async () => {
    single.mockResolvedValueOnce(filaCreada({ is_duplicate: false }));
    single.mockResolvedValueOnce(filaCreada({ is_duplicate: true }));
    single.mockResolvedValueOnce(filaCreada({ is_duplicate: true }));

    await pedir();
    await pedir();
    await pedir();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("el mensaje usa los importes del servidor, no los del navegador", async () => {
    single.mockResolvedValue(filaCreada());

    // El cliente intenta imponer un total de Gs. 1.
    await pedir({ ...CUERPO_OK, total: 1, subtotal: 1, envio: 0 });

    const texto = JSON.parse(fetchMock.mock.calls[0]![1].body).text;
    expect(texto).toContain("Subtotal: Gs. 199.000");
    expect(texto).toContain("Envío: Gs. 20.000");
    expect(texto).toContain("Total: Gs. 219.000");
    expect(texto).not.toContain("Gs. 1\n");
  });
});

describe("Telegram caído no afecta al comprador", () => {
  it("si la API de Telegram responde error, el endpoint igual devuelve éxito", async () => {
    single.mockResolvedValue(filaCreada());
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const res = await pedir();
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.orderNumber).toBe("GRT-20260727-000106");
    expect(json.redirectUrl).toContain("/gracias?token=");
    // Nada del fallo de Telegram se le cuenta al comprador.
    expect(JSON.stringify(json)).not.toMatch(/telegram/i);
  });

  it("si la red falla, el endpoint igual devuelve éxito", async () => {
    single.mockResolvedValue(filaCreada());
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await pedir();
    expect(res.status).toBe(201);
    expect((await res.json()).orderNumber).toBe("GRT-20260727-000106");
  });

  it("si faltan las variables de Telegram, el pedido igual se registra", async () => {
    single.mockResolvedValue(filaCreada());
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const res = await pedir();
    expect(res.status).toBe(201);
    expect((await res.json()).orderNumber).toBe("GRT-20260727-000106");
    expect(fetchMock).not.toHaveBeenCalled();
    // El log nombra las variables que faltan, sin valores.
    expect(JSON.stringify(errores)).toContain("TELEGRAM_BOT_TOKEN");
  });

  it("un timeout de Telegram no rompe la respuesta", async () => {
    single.mockResolvedValue(filaCreada());
    const e = new Error("timed out");
    e.name = "TimeoutError";
    fetchMock.mockRejectedValue(e);

    const res = await pedir();
    expect(res.status).toBe(201);
  });
});

describe("el token nunca sale del servidor", () => {
  it("no aparece en la respuesta ni en los logs, aunque el error lo contenga", async () => {
    single.mockResolvedValue(filaCreada());
    fetchMock.mockRejectedValue(
      new Error(`connect ETIMEDOUT https://api.telegram.org/bot${TOKEN_FALSO}/sendMessage`),
    );

    const res = await pedir();
    const texto = await res.text();

    expect(texto).not.toContain(TOKEN_FALSO);
    expect(JSON.stringify(errores)).not.toContain(TOKEN_FALSO);
    expect(JSON.stringify(errores)).toContain("***");
  });

  it("tampoco aparece en una respuesta exitosa", async () => {
    single.mockResolvedValue(filaCreada());
    const res = await pedir();
    expect(await res.text()).not.toContain(TOKEN_FALSO);
  });
});

describe("contrato del endpoint sin cambios", () => {
  it("no expone el UUID interno del pedido", async () => {
    single.mockResolvedValue(filaCreada());
    const json = await (await pedir()).json();

    expect(json).toEqual({
      orderNumber: "GRT-20260727-000106",
      confirmationToken: "9c1e5d8a-0b6f-4e34-9a7f-3f1a6c8e2b4d",
      total: 219_000,
      paymentMethod: "transferencia",
      paymentStatus: "pendiente_transferencia",
      redirectUrl: "/gracias?token=9c1e5d8a-0b6f-4e34-9a7f-3f1a6c8e2b4d",
    });
    expect(json).not.toHaveProperty("id");
  });

  it("payload inválido → 400 y no notifica", async () => {
    const res = await pedir({ ...CUERPO_OK, packId: "9" });
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si falla la creación del pedido → 500 genérico y no notifica", async () => {
    single.mockResolvedValue({ data: null, error: { code: "23505", message: "detalle interno" } });

    const res = await pedir();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "error_interno" });
    expect(JSON.stringify(json)).not.toContain("detalle interno");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("manda la cantidad de pulseras para el snapshot de costo", async () => {
    single.mockResolvedValue(filaCreada());

    // Pack de 2 + pulsera extra promocional = 3 pulseras.
    await pedir({ ...CUERPO_OK, packId: "2", extra: true });
    expect(rpcMock.mock.calls[0]![1].p_units).toBe(3);

    rpcMock.mockClear();
    // Pack de 1 con cantidad 2 = 2 pulseras.
    await pedir({ ...CUERPO_OK, packId: "1", qty: 2, extra: false });
    expect(rpcMock.mock.calls[0]![1].p_units).toBe(2);
  });

  it("no manda costos ni el snapshot: eso lo calcula la base", async () => {
    single.mockResolvedValue(filaCreada());
    // El cliente intenta imponer su propio costo de producto.
    await pedir({ ...CUERPO_OK, product_cost_total: 0, logistics_cost: 0, source: "manual" });

    const enviado = rpcMock.mock.calls[0]![1];
    expect(enviado).not.toHaveProperty("p_product_cost_total");
    expect(enviado).not.toHaveProperty("p_logistics_cost");
    expect(enviado).not.toHaveProperty("p_source");
  });

  it("tarjeta se registra como pendiente_pago_online", async () => {
    single.mockResolvedValue(
      filaCreada({ payment_method: "tarjeta", payment_status: "pendiente_pago_online" }),
    );

    await pedir({ ...CUERPO_OK, metodoPago: "tarjeta" });

    const enviado = rpcMock.mock.calls[0]![1];
    expect(enviado.p_payment_status).toBe("pendiente_pago_online");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).text).toContain(
      "Estado: Pendiente de pago online",
    );
  });
});
