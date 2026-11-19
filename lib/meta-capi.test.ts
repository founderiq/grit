import { describe, expect, it } from "vitest";
import {
  ACTION_SOURCE,
  CLAVE_METADATA,
  EDAD_MAXIMA_MS,
  ENVIANDO_VENCE_MS,
  armarEvento,
  conRegistro,
  estadoDeRegistro,
  evaluarEnvio,
  eventIdDePedido,
  leerRegistro,
  normalizarTelefono,
  normalizarTexto,
  partirNombre,
  sha256,
  type EntradaEvaluacion,
  type RegistroMeta,
} from "@/lib/meta-capi";
import { vistaMeta } from "@/lib/meta-capi-datos";

const AHORA = new Date("2026-11-19T15:00:00.000Z");

const registro = (parcial: Partial<RegistroMeta>): RegistroMeta => ({
  status: "sent",
  event_id: "purchase-GRT-20261119-000042",
  event_time: 1763560000,
  attempts: 1,
  started_at: AHORA.toISOString(),
  sent_at: AHORA.toISOString(),
  error: null,
  fbtrace_id: null,
  events_received: 1,
  ...parcial,
});

/* ------------------------------------------------------------------ */

describe("hashing — vectores publicados por Meta", () => {
  it("first name 'mary'", () => {
    expect(sha256("mary")).toBe("6915771be1c5aa0c886870b6951b03d7eafc121fea0e80a5ea83beb7c449f4ec");
  });
  it("teléfono 16505551212", () => {
    expect(sha256("16505551212")).toBe(
      "e323ec626319ca94ee8bff2e4c87cf613be6ea19919ed1364124e16807ab3176",
    );
  });
  it("país 'us'", () => {
    expect(sha256("us")).toBe("79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621");
  });
  it("conserva la tilde en UTF-8 ('valéry')", () => {
    expect(sha256(normalizarTexto("Valéry"))).toBe(
      "08e1996b5dd49e62a4b4c010d44e4345592a863bb9f8e3976219bac29417149c",
    );
  });
});

describe("normalizarTelefono", () => {
  it.each([
    ["0994320994", "595994320994"],
    ["0994 320 994", "595994320994"],
    ["(0994) 320-994", "595994320994"],
    ["+595 994 320 994", "595994320994"],
    ["595994320994", "595994320994"],
    ["00595994320994", "595994320994"],
    ["+595 0994 320 994", "595994320994"],
    ["994320994", "595994320994"],
    ["021 123 456", "59521123456"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  it("respeta un número de otro país escrito con +", () => {
    expect(normalizarTelefono("+54 9 11 2345 6789")).toBe("5491123456789");
  });

  it.each(["", "abc", "12345", "0994 32", "+595 12"])("rechaza %j", (entrada) => {
    expect(normalizarTelefono(entrada)).toBeNull();
  });
});

describe("normalizarTexto y partirNombre", () => {
  it("minúsculas, sin espacios ni puntuación, con tildes", () => {
    expect(normalizarTexto("San Lorenzo")).toBe("sanlorenzo");
    expect(normalizarTexto(" Asunción. ")).toBe("asunción");
    expect(normalizarTexto("Ñemby 2")).toBe("ñemby");
  });

  it("dos palabras: nombre y apellido", () => {
    expect(partirNombre("María González")).toEqual({ fn: "maría", ln: "gonzález" });
  });

  it("tres o más palabras: solo el nombre (el apellido es ambiguo)", () => {
    expect(partirNombre("María José González Benítez")).toEqual({ fn: "maría", ln: null });
  });

  it("una palabra o vacío", () => {
    expect(partirNombre("  Juan ")).toEqual({ fn: "juan", ln: null });
    expect(partirNombre("   ")).toEqual({ fn: null, ln: null });
  });
});

/* ------------------------------------------------------------------ */

describe("registro en metadata", () => {
  it("conRegistro conserva modelos, origen y el otro modo", () => {
    const previa = {
      origen: "panel_admin",
      unidades: 2,
      modelos: ["negro", "azul"],
      [CLAVE_METADATA]: { test: registro({}) },
    };
    const nueva = conRegistro(previa, "live", registro({ status: "error", error: "x" }));

    expect(nueva.origen).toBe("panel_admin");
    expect(nueva.modelos).toEqual(["negro", "azul"]);
    expect(leerRegistro(nueva, "test")?.status).toBe("sent");
    expect(leerRegistro(nueva, "live")?.status).toBe("error");
    // No muta la original.
    expect(leerRegistro(previa, "live")).toBeNull();
  });

  it("tolera metadata vacía, nula o rota", () => {
    expect(leerRegistro(null, "live")).toBeNull();
    expect(leerRegistro({}, "live")).toBeNull();
    expect(leerRegistro({ [CLAVE_METADATA]: "roto" }, "live")).toBeNull();
    expect(leerRegistro({ [CLAVE_METADATA]: { live: { status: "otro" } } }, "live")).toBeNull();
    expect(conRegistro(null, "live", registro({}))).toHaveProperty(CLAVE_METADATA);
  });

  it("estadoDeRegistro: un 'enviando' vencido pasa a error", () => {
    const reciente = registro({ status: "sending", started_at: AHORA.toISOString() });
    const viejo = registro({
      status: "sending",
      started_at: new Date(AHORA.getTime() - ENVIANDO_VENCE_MS - 1).toISOString(),
    });
    expect(estadoDeRegistro(null, AHORA)).toBe("no_enviado");
    expect(estadoDeRegistro(reciente, AHORA)).toBe("enviando");
    expect(estadoDeRegistro(viejo, AHORA)).toBe("error");
    expect(estadoDeRegistro(registro({}), AHORA)).toBe("enviado");
  });
});

/* ------------------------------------------------------------------ */

const base: EntradaEvaluacion = {
  source: "manual",
  paymentStatus: "pagado",
  archivado: false,
  telefono: "0994 320 994",
  pagadoEn: "2026-11-19T12:00:00.000Z",
  registro: null,
  ahora: AHORA,
};

describe("evaluarEnvio", () => {
  it("un pedido manual pagado se puede enviar, con event_time = momento del pago", () => {
    const r = evaluarEnvio(base);
    expect(r).toEqual({ ok: true, eventTime: Date.parse("2026-11-19T12:00:00.000Z") / 1000 });
  });

  it("NUNCA envía un pedido web, aunque esté pagado", () => {
    expect(evaluarEnvio({ ...base, source: "web" })).toEqual({ ok: false, motivo: "no_manual" });
    expect(evaluarEnvio({ ...base, source: "" })).toEqual({ ok: false, motivo: "no_manual" });
  });

  it.each(["pendiente_transferencia", "pendiente_pago_online", "cancelado", "fallido"])(
    "no envía un pedido %s",
    (estado) => {
      expect(evaluarEnvio({ ...base, paymentStatus: estado })).toEqual({
        ok: false,
        motivo: "no_pagado",
      });
    },
  );

  it("no envía un pedido archivado", () => {
    expect(evaluarEnvio({ ...base, archivado: true })).toEqual({ ok: false, motivo: "archivado" });
  });

  it("no reenvía una venta ya enviada", () => {
    expect(evaluarEnvio({ ...base, registro: registro({}) })).toEqual({
      ok: false,
      motivo: "ya_enviado",
    });
  });

  it("no envía mientras hay un envío en curso, pero sí cuando venció", () => {
    const enCurso = registro({ status: "sending", started_at: AHORA.toISOString() });
    expect(evaluarEnvio({ ...base, registro: enCurso })).toEqual({
      ok: false,
      motivo: "envio_en_curso",
    });

    const vencido = registro({
      status: "sending",
      started_at: new Date(AHORA.getTime() - ENVIANDO_VENCE_MS - 1).toISOString(),
    });
    expect(evaluarEnvio({ ...base, registro: vencido }).ok).toBe(true);
  });

  it("permite reintentar después de un error", () => {
    expect(evaluarEnvio({ ...base, registro: registro({ status: "error" }) }).ok).toBe(true);
  });

  it("exige un teléfono utilizable", () => {
    expect(evaluarEnvio({ ...base, telefono: "123" })).toEqual({
      ok: false,
      motivo: "sin_telefono",
    });
  });

  it("exige saber cuándo se pagó", () => {
    expect(evaluarEnvio({ ...base, pagadoEn: null })).toEqual({
      ok: false,
      motivo: "sin_fecha_pago",
    });
  });

  it("bloquea pagos de más de 7 días (Meta rechazaría el request entero)", () => {
    const viejo = new Date(AHORA.getTime() - EDAD_MAXIMA_MS - 1000).toISOString();
    expect(evaluarEnvio({ ...base, pagadoEn: viejo })).toEqual({
      ok: false,
      motivo: "fuera_de_ventana",
    });
  });

  it("un pago 'en el futuro' (reloj) se manda con la hora actual", () => {
    const r = evaluarEnvio({ ...base, pagadoEn: "2026-11-19T16:00:00.000Z" });
    expect(r).toEqual({ ok: true, eventTime: AHORA.getTime() / 1000 });
  });
});

/* ------------------------------------------------------------------ */

describe("armarEvento", () => {
  const evento = armarEvento(
    {
      orderNumber: "GRT-20261119-000042",
      total: 189000,
      items: [{ sku: "pack-2", quantity: 1, bundle_id: "2", product_name: "Pack x2" }],
      cliente: { nombre: "María González", whatsapp: "0994 320 994", ciudad: "Asunción" },
    },
    1763560000,
  );

  it("Purchase con action_source chat y event_id determinístico", () => {
    expect(evento.event_name).toBe("Purchase");
    expect(evento.action_source).toBe(ACTION_SOURCE);
    expect(evento.action_source).toBe("chat");
    expect(evento.event_time).toBe(1763560000);
    expect(evento.event_id).toBe("purchase-GRT-20261119-000042");
    expect(evento.event_id).toBe(eventIdDePedido("GRT-20261119-000042"));
  });

  it("custom_data con el total real en PYG y los mismos SKUs que el Pixel", () => {
    expect(evento.custom_data).toMatchObject({
      value: 189000,
      currency: "PYG",
      content_type: "product",
      content_ids: ["pack-2"],
      contents: [{ id: "pack-2", quantity: 1 }],
      order_id: "GRT-20261119-000042",
      content_name: "Pack x2",
    });
    expect(evento.custom_data.num_items).toBeGreaterThan(0);
  });

  it("user_data viaja hasheado y normalizado", () => {
    expect(evento.user_data).toEqual({
      ph: [sha256("595994320994")],
      fn: [sha256("maría")],
      ln: [sha256("gonzález")],
      ct: [sha256("asunción")],
      country: [sha256("py")],
    });
  });

  it("ningún dato personal viaja en claro, y no hay IP ni user agent", () => {
    const texto = JSON.stringify(evento);
    for (const claro of ["María", "maría", "González", "0994", "595994320994", "Asunción"]) {
      expect(texto).not.toContain(claro);
    }
    expect(evento.user_data).not.toHaveProperty("client_ip_address");
    expect(evento.user_data).not.toHaveProperty("client_user_agent");
  });

  it("omite lo que no se puede normalizar en lugar de inventarlo", () => {
    const e = armarEvento(
      {
        orderNumber: "GRT-1",
        total: 1,
        items: [],
        cliente: { nombre: "María José Pérez Ruiz", whatsapp: "x", ciudad: "" },
      },
      1,
    );
    expect(e.user_data).toEqual({ fn: [sha256("maría")], country: [sha256("py")] });
  });
});

/* ------------------------------------------------------------------ */

describe("vistaMeta — lo que ve el panel", () => {
  const prueba = {
    META_CAPI_ACCESS_TOKEN: "token-de-prueba",
    META_DATASET_ID: "123",
    META_GRAPH_API_VERSION: "v27.0",
    META_CAPI_TEST_EVENT_CODE: "TEST123",
    VERCEL_ENV: "preview",
  } as unknown as NodeJS.ProcessEnv;

  const entrada = {
    source: "manual",
    paymentStatus: "pagado",
    archivado: false,
    telefono: "0994320994",
    pagadoEn: "2026-11-19T12:00:00.000Z",
    metadata: {},
    ahora: AHORA,
    env: prueba,
  };

  it("un pedido web no tiene bloque Meta", () => {
    expect(vistaMeta({ ...entrada, source: "web" })).toBeNull();
  });

  it("manual pagado sin enviar: botón habilitado, modo prueba en Preview", () => {
    expect(vistaMeta(entrada)).toMatchObject({
      modo: "test",
      estado: "no_enviado",
      bloqueo: null,
      enviadoEnVivo: false,
    });
  });

  it("pendiente: botón bloqueado con el motivo", () => {
    expect(vistaMeta({ ...entrada, paymentStatus: "pendiente_transferencia" })?.bloqueo).toMatch(
      /Pagado/,
    );
  });

  it("un envío de prueba no cuenta como enviado en producción", () => {
    const metadata = { [CLAVE_METADATA]: { test: registro({}) } };
    const produccion = {
      META_CAPI_ACCESS_TOKEN: "token-de-prueba",
      META_DATASET_ID: "123",
      META_GRAPH_API_VERSION: "v27.0",
      VERCEL_ENV: "production",
    } as unknown as NodeJS.ProcessEnv;

    expect(vistaMeta({ ...entrada, metadata })?.estado).toBe("enviado");
    expect(vistaMeta({ ...entrada, metadata, env: produccion })).toMatchObject({
      modo: "live",
      estado: "no_enviado",
      bloqueo: null,
    });
  });

  it("en Preview avisa si el pedido ya se envió de verdad", () => {
    const metadata = { [CLAVE_METADATA]: { live: registro({}) } };
    expect(vistaMeta({ ...entrada, metadata })?.enviadoEnVivo).toBe(true);
  });

  it("error guardado: muestra el motivo y deja reintentar", () => {
    const metadata = {
      [CLAVE_METADATA]: { test: registro({ status: "error", error: "Invalid parameter" }) },
    };
    expect(vistaMeta({ ...entrada, metadata })).toMatchObject({
      estado: "error",
      error: "Invalid parameter",
      bloqueo: null,
    });
  });

  it("sin configuración: bloqueado", () => {
    expect(vistaMeta({ ...entrada, env: {} as NodeJS.ProcessEnv })?.bloqueo).toMatch(
      /no está configurado/,
    );
  });
});
