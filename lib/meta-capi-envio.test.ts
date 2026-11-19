import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configuracionMeta,
  enviarEventos,
  modoActual,
  sanear,
} from "@/lib/meta-capi-envio";
import { armarEvento } from "@/lib/meta-capi";

/**
 * Envío a Graph API con `fetch` mockeado: no se toca Meta. Lo que se verifica
 * es el contrato — modo prueba, que el token nunca viaje en la URL ni aparezca
 * en un error, y que ninguna falla lance.
 */

const TOKEN = "EAAtokenFALSOqueNOdebeFILTRARSE123";

const VERSION = "v27.0";

const env = (extra: Record<string, string>) =>
  ({
    META_CAPI_ACCESS_TOKEN: TOKEN,
    META_DATASET_ID: "2195171668070768",
    META_GRAPH_API_VERSION: VERSION,
    ...extra,
  }) as unknown as NodeJS.ProcessEnv;

const evento = armarEvento(
  {
    orderNumber: "GRT-20261119-000042",
    total: 189000,
    items: [{ sku: "pack-2", quantity: 1, bundle_id: "2" }],
    cliente: { nombre: "María González", whatsapp: "0994320994", ciudad: "Asunción" },
  },
  1763560000,
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("configuracionMeta", () => {
  it("con test code: modo prueba, en cualquier entorno", () => {
    const cfg = configuracionMeta(env({ META_CAPI_TEST_EVENT_CODE: "TEST123", VERCEL_ENV: "preview" }));
    expect(cfg).toMatchObject({ ok: true, modo: "test", testCode: "TEST123" });
  });

  it("sin test code: envío real SOLO en producción", () => {
    expect(configuracionMeta(env({ VERCEL_ENV: "production" }))).toMatchObject({
      ok: true,
      modo: "live",
      testCode: null,
    });
    expect(configuracionMeta(env({ VERCEL_ENV: "preview" }))).toMatchObject({
      ok: false,
      motivo: "live_fuera_de_produccion",
    });
    expect(configuracionMeta(env({}))).toMatchObject({ ok: false, motivo: "live_fuera_de_produccion" });
  });

  it.each(["META_CAPI_ACCESS_TOKEN", "META_DATASET_ID", "META_GRAPH_API_VERSION"])(
    "si falta %s: no configurado, informa solo el NOMBRE",
    (variable) => {
      const cfg = configuracionMeta(
        env({ VERCEL_ENV: "production", META_CAPI_TEST_EVENT_CODE: "T", [variable]: "" }),
      );
      expect(cfg).toEqual({ ok: false, motivo: "sin_configuracion", faltan: [variable] });
      expect(JSON.stringify(cfg)).not.toContain(TOKEN);
    },
  );

  it("sin ninguna variable: informa las tres", () => {
    expect(configuracionMeta({} as NodeJS.ProcessEnv)).toEqual({
      ok: false,
      motivo: "sin_configuracion",
      faltan: ["META_CAPI_ACCESS_TOKEN", "META_DATASET_ID", "META_GRAPH_API_VERSION"],
    });
  });

  it("formatos inválidos cuentan como faltantes (no hay valores por defecto)", () => {
    expect(
      configuracionMeta(env({ VERCEL_ENV: "production", META_DATASET_ID: "abc" })),
    ).toMatchObject({ ok: false, faltan: ["META_DATASET_ID"] });
    expect(
      configuracionMeta(env({ VERCEL_ENV: "production", META_GRAPH_API_VERSION: "27" })),
    ).toMatchObject({ ok: false, faltan: ["META_GRAPH_API_VERSION"] });
  });

  it("no usa el Pixel ID como respaldo del dataset", () => {
    const cfg = configuracionMeta({
      META_CAPI_ACCESS_TOKEN: TOKEN,
      META_GRAPH_API_VERSION: VERSION,
      NEXT_PUBLIC_META_PIXEL_ID: "2195171668070768",
      META_CAPI_TEST_EVENT_CODE: "T",
    } as unknown as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({ ok: false, faltan: ["META_DATASET_ID"] });
  });

  it("usa la versión configurada; acepta 'v27.0' o '27.0'", () => {
    const conV = configuracionMeta(env({ VERCEL_ENV: "production" }));
    expect(conV.ok && conV.version).toBe("v27.0");

    const sinV = configuracionMeta(env({ VERCEL_ENV: "production", META_GRAPH_API_VERSION: "27.0" }));
    expect(sinV.ok && sinV.version).toBe("v27.0");
  });

  it("modoActual refleja el entorno", () => {
    expect(modoActual(env({ META_CAPI_TEST_EVENT_CODE: "T" }))).toEqual({
      configurado: true,
      modo: "test",
    });
    expect(modoActual({} as NodeJS.ProcessEnv).configurado).toBe(false);
  });
});

describe("enviarEventos", () => {
  const cfgPrueba = configuracionMeta(env({ META_CAPI_TEST_EVENT_CODE: "TEST123" }));
  if (!cfgPrueba.ok) throw new Error("configuración de prueba inválida");

  it("POST al dataset con data, token y test_event_code en el CUERPO", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1, fbtrace_id: "AbC" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await enviarEventos([evento], cfgPrueba);
    expect(r).toEqual({ ok: true, eventsReceived: 1, fbtraceId: "AbC" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://graph.facebook.com/${VERSION}/2195171668070768/events`);
    expect(String(url)).not.toContain(TOKEN);
    expect(init.method).toBe("POST");

    const cuerpo = new URLSearchParams(init.body as string);
    expect(cuerpo.get("access_token")).toBe(TOKEN);
    expect(cuerpo.get("test_event_code")).toBe("TEST123");
    const data = JSON.parse(cuerpo.get("data")!);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ event_name: "Purchase", action_source: "chat" });
  });

  it("en modo real no manda test_event_code", async () => {
    const cfgReal = configuracionMeta(env({ VERCEL_ENV: "production" }));
    if (!cfgReal.ok) throw new Error("configuración real inválida");

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await enviarEventos([evento], cfgReal);
    const cuerpo = new URLSearchParams(fetchMock.mock.calls[0]![1].body as string);
    expect(cuerpo.has("test_event_code")).toBe(false);
  });

  it("error de Meta: mensaje corto, sin el token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: `Invalid OAuth access token ${TOKEN}`,
              code: 190,
              fbtrace_id: "Xyz",
            },
          }),
          { status: 400 },
        ),
      ),
    );

    const r = await enviarEventos([evento], cfgPrueba);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).not.toContain(TOKEN);
      expect(r.error).toContain("código 190");
      expect(r.fbtraceId).toBe("Xyz");
    }
  });

  it("un 200 sin todos los eventos recibidos es un error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 0 }), { status: 200 })),
    );
    const r = await enviarEventos([evento], cfgPrueba);
    expect(r.ok).toBe(false);
  });

  it("caída de red o timeout: no lanza", async () => {
    const timeout = Object.assign(new Error("timeout"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    expect(await enviarEventos([evento], cfgPrueba)).toEqual({
      ok: false,
      error: "Meta no respondió a tiempo.",
      fbtraceId: null,
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const r = await enviarEventos([evento], cfgPrueba);
    expect(r).toMatchObject({ ok: false, error: "No se pudo conectar con Meta." });
  });

  it("respuesta que no es JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
    expect(await enviarEventos([evento], cfgPrueba)).toMatchObject({
      ok: false,
      error: "Respuesta HTTP 502.",
    });
  });
});

describe("sanear", () => {
  it("quita el token y recorta", () => {
    expect(sanear(`a ${TOKEN} b`, TOKEN)).toBe("a *** b");
    expect(sanear("x".repeat(500), TOKEN)).toHaveLength(200);
  });
});
