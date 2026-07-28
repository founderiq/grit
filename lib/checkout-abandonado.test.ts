import { describe, expect, it } from "vitest";
import {
  normalizarWhatsapp,
  validarCaptura,
  whatsappUtil,
} from "@/lib/checkout-abandonado";

/**
 * Endpoint público de checkouts abandonados.
 *
 * Es la única superficie de escritura pública del sistema además del alta de
 * pedidos, así que lo que se prueba sobre todo es lo que NO acepta.
 */

const CLAVE = "3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34";

const BASE = {
  sessionKey: CLAVE,
  nombre: "Camila Rodríguez",
  whatsapp: "0992363483",
  ciudad: "Asunción",
  packId: "2",
  packQty: 1,
  extra: false,
  zona: "asuncion",
  paso: "contacto",
};

const cap = (over: Record<string, unknown> = {}) => validarCaptura({ ...BASE, ...over });

/* ------------------------------------------------------------------ */

describe("normalización del WhatsApp", () => {
  it("los tres formatos del mismo número dan lo mismo", () => {
    expect(normalizarWhatsapp("0992363483")).toBe("0992363483");
    expect(normalizarWhatsapp("0992 363 483")).toBe("0992363483");
    expect(normalizarWhatsapp("+595992363483")).toBe("0992363483");
    expect(normalizarWhatsapp("595992363483")).toBe("0992363483");
    expect(normalizarWhatsapp("(0992) 363-483")).toBe("0992363483");
  });

  it("un número que no se puede normalizar se guarda limpio, no se pierde", () => {
    expect(normalizarWhatsapp("021 555 444")).toBe("021555444");
  });

  it("exige suficientes dígitos como para escribirle", () => {
    expect(whatsappUtil("0992363")).toBe(false);
    expect(whatsappUtil("09923634")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe("qué se guarda y qué no", () => {
  it("una captura completa se acepta", () => {
    const r = cap();
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.captura.session_key).toBe(CLAVE);
    expect(r.captura.customer_whatsapp).toBe("0992363483");
    expect(r.captura.current_step).toBe("contacto");
  });

  it("sin nombre o sin número no se guarda nada", () => {
    expect(cap({ nombre: "" })).toEqual({ ok: false, motivo: "sin_contacto" });
    expect(cap({ nombre: "C" })).toEqual({ ok: false, motivo: "sin_contacto" });
    expect(cap({ whatsapp: "099" })).toEqual({ ok: false, motivo: "sin_contacto" });
  });

  it("exige una clave de sesión con forma de UUID", () => {
    expect(cap({ sessionKey: "abc" })).toEqual({ ok: false, motivo: "payload_invalido" });
    expect(cap({ sessionKey: 42 })).toEqual({ ok: false, motivo: "payload_invalido" });
    expect(validarCaptura(null)).toEqual({ ok: false, motivo: "payload_invalido" });
  });

  it("NO acepta status, converted_order_id ni archived_at del navegador", () => {
    const r = cap({
      status: "converted",
      converted_order_id: "11111111-1111-4111-8111-111111111111",
      converted_at: "2026-01-01T00:00:00Z",
      archived_at: null,
      archived_by: "11111111-1111-4111-8111-111111111111",
      id: "22222222-2222-4222-8222-222222222222",
    });
    if (!r.ok) throw new Error("debía ser válida");

    const claves = Object.keys(r.captura);
    expect(claves).not.toContain("status");
    expect(claves).not.toContain("converted_order_id");
    expect(claves).not.toContain("converted_at");
    expect(claves).not.toContain("archived_at");
    expect(claves).not.toContain("archived_by");
    expect(claves).not.toContain("id");
  });

  it("descarta packs, zonas y pasos que no existen, sin fallar", () => {
    const r = cap({ packId: "9", zona: "marte", paso: "checkout_final" });
    if (!r.ok) throw new Error("debía ser válida");

    expect(r.captura.pack_id).toBeNull();
    expect(r.captura.shipping_zone).toBeNull();
    expect(r.captura.current_step).toBeNull();
  });

  it("acepta los cinco pasos documentados", () => {
    for (const paso of ["contacto", "entrega", "seleccion", "pago", "review"]) {
      const r = cap({ paso });
      if (!r.ok) throw new Error("debía ser válida");
      expect(r.captura.current_step).toBe(paso);
    }
  });

  it("`extra` es un booleano estricto", () => {
    expect((cap({ extra: true }) as { captura: { has_extra: boolean } }).captura.has_extra).toBe(true);
    expect((cap({ extra: "si" }) as { captura: { has_extra: boolean } }).captura.has_extra).toBe(false);
    expect((cap({ extra: 1 }) as { captura: { has_extra: boolean } }).captura.has_extra).toBe(false);
  });

  it("la cantidad tiene que ser un entero positivo y acotado", () => {
    const leer = (v: unknown) =>
      (cap({ packQty: v }) as { captura: { pack_qty: number | null } }).captura.pack_qty;

    expect(leer(3)).toBe(3);
    expect(leer(0)).toBeNull();
    expect(leer(-1)).toBeNull();
    expect(leer(1.5)).toBeNull();
    expect(leer("2")).toBeNull();
    expect(leer(1000)).toBeNull();
  });

  it("recorta textos largos en lugar de guardarlos enteros", () => {
    const r = cap({ nombre: "a".repeat(500), ciudad: "b".repeat(500) });
    if (!r.ok) throw new Error("debía ser válida");

    expect(r.captura.customer_name.length).toBe(120);
    expect(r.captura.customer_city?.length).toBe(80);
  });

  it("colapsa saltos de línea: un dato queda en una sola línea", () => {
    const r = cap({ nombre: "Camila\n\nRodríguez" });
    if (!r.ok) throw new Error("debía ser válida");
    expect(r.captura.customer_name).toBe("Camila Rodríguez");
  });
});
