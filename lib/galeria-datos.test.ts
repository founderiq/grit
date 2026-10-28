import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCTO_GALERIA } from "@/lib/content";

/**
 * Lectura pública de la galería: lo que /producto recibe en cada escenario.
 * El punto central es el fallback: ningún error externo puede dejar la
 * galería vacía.
 */

let respuesta: () => Promise<{ data: unknown; error: { code: string } | null }>;
let configurado = true;

/** Cadena mínima de PostgREST: from().select().eq().order().abortSignal().overrideTypes() */
const cadena = () => {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "abortSignal"]) c[m] = () => c;
  c.overrideTypes = () => respuesta();
  return c;
};

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: () => cadena() }),
  hayConfiguracionSupabase: () => configurado,
}));

const { obtenerGaleriaPublica, obtenerGaleriaAdmin } = await import("@/lib/galeria-datos");

const SUPA = "https://abcdefgh.supabase.co";
const RUTA = "galeria/0f8fad5b-d9cb-469f-a165-70867728950e.webp";

beforeEach(() => {
  configurado = true;
  process.env.SUPABASE_URL = SUPA;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
});

describe("obtenerGaleriaPublica", () => {
  it("devuelve la galería administrada, en orden y con URLs públicas", async () => {
    respuesta = async () => ({
      data: [
        { id: "b", sort_order: 2, static_path: "/img/galeria/galeria-01.webp", storage_path: null, alt_text: "Original", is_active: true },
        { id: "a", sort_order: 1, static_path: null, storage_path: RUTA, alt_text: "Nueva", is_active: true },
      ],
      error: null,
    });

    expect(await obtenerGaleriaPublica()).toEqual([
      { src: `${SUPA}/storage/v1/object/public/product-gallery/${RUTA}`, alt: "Nueva" },
      { src: "/img/galeria/galeria-01.webp", alt: "Original" },
    ]);
  });

  it("CASO E · si la consulta da error, usa las fotos estáticas", async () => {
    respuesta = async () => ({ data: null, error: { code: "PGRST205" } });
    expect(await obtenerGaleriaPublica()).toBe(PRODUCTO_GALERIA);
  });

  it("si Supabase no responde (timeout o red caída), usa las fotos estáticas", async () => {
    respuesta = async () => {
      throw new DOMException("The operation was aborted", "TimeoutError");
    };
    expect(await obtenerGaleriaPublica()).toBe(PRODUCTO_GALERIA);
  });

  it("si todavía no hay filas, usa las fotos estáticas", async () => {
    respuesta = async () => ({ data: [], error: null });
    expect(await obtenerGaleriaPublica()).toBe(PRODUCTO_GALERIA);
  });

  it("sin configuración de Supabase ni siquiera consulta", async () => {
    configurado = false;
    respuesta = async () => {
      throw new Error("no debería consultarse");
    };
    expect(await obtenerGaleriaPublica()).toBe(PRODUCTO_GALERIA);
  });
});

describe("obtenerGaleriaAdmin", () => {
  it("informa el error en vez de inventar una galería", async () => {
    respuesta = async () => ({ data: null, error: { code: "42P01" } });
    expect(await obtenerGaleriaAdmin()).toEqual({ ok: false });
  });

  it("incluye las inactivas, marcadas", async () => {
    respuesta = async () => ({
      data: [{ id: "a", sort_order: 1, static_path: null, storage_path: RUTA, alt_text: null, is_active: false }],
      error: null,
    });
    const r = await obtenerGaleriaAdmin();
    expect(r).toMatchObject({ ok: true, datos: [{ id: "a", activa: false, origen: "storage" }] });
  });
});
