import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCTO_GALERIA, PRODUCTO_MODELOS } from "@/lib/content";
import {
  detectarMime,
  dimensionesOptimizadas,
  esRutaEstatica,
  esRutaStorage,
  galeriaAdmin,
  galeriaPublica,
  GALERIA_FALLBACK,
  leerDimensiones,
  mismoOrden,
  mover,
  normalizarAlt,
  rutaNueva,
  srcDeFila,
  urlPublicaStorage,
  validarArchivo,
  validarOrden,
  type FilaGaleria,
} from "@/lib/galeria";

const SUPA = "https://abcdefgh.supabase.co";
const UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const fila = (p: Partial<FilaGaleria> & Pick<FilaGaleria, "id" | "sort_order">): FilaGaleria => ({
  storage_path: null,
  static_path: null,
  alt_text: null,
  is_active: true,
  width: null,
  height: null,
  size_bytes: null,
  ...p,
});

/* --- Cabeceras mínimas de cada formato -------------------------------- */

function png(ancho: number, alto: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, ancho);
  new DataView(b.buffer).setUint32(20, alto);
  return b;
}

function jpeg(ancho: number, alto: number): Uint8Array {
  // SOI, un APP0 de relleno y el SOF0 con alto y ancho.
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)];
  const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, alto >> 8, alto & 0xff, ancho >> 8, ancho & 0xff, 3, ...new Array(9).fill(0)];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

function webpVp8x(ancho: number, alto: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  b.set([..."VP8X"].map((c) => c.charCodeAt(0)), 12);
  const w = ancho - 1;
  const h = alto - 1;
  b.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 24);
  return b;
}

function webpVp8l(ancho: number, alto: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  b.set([..."VP8L"].map((c) => c.charCodeAt(0)), 12);
  b[20] = 0x2f;
  const bits = ((ancho - 1) & 0x3fff) | (((alto - 1) & 0x3fff) << 14);
  new DataView(b.buffer).setUint32(21, bits >>> 0, true);
  return b;
}

/* ====================================================================== */

describe("detectarMime y leerDimensiones", () => {
  it("lee las diez fotos reales de la galería (WebP 500×500)", () => {
    for (let i = 1; i <= 10; i++) {
      const n = String(i).padStart(2, "0");
      const bytes = new Uint8Array(readFileSync(`public/img/galeria/galeria-${n}.webp`));
      expect(detectarMime(bytes)).toBe("image/webp");
      expect(leerDimensiones(bytes, "image/webp")).toEqual({ ancho: 500, alto: 500 });
    }
  });

  it("lee PNG, JPEG y las variantes de WebP", () => {
    expect(detectarMime(png(800, 600))).toBe("image/png");
    expect(leerDimensiones(png(800, 600), "image/png")).toEqual({ ancho: 800, alto: 600 });

    expect(detectarMime(jpeg(1200, 900))).toBe("image/jpeg");
    expect(leerDimensiones(jpeg(1200, 900), "image/jpeg")).toEqual({ ancho: 1200, alto: 900 });

    expect(leerDimensiones(webpVp8x(1200, 1500), "image/webp")).toEqual({ ancho: 1200, alto: 1500 });
    expect(leerDimensiones(webpVp8l(640, 480), "image/webp")).toEqual({ ancho: 640, alto: 480 });
  });

  it("no reconoce archivos que no son imágenes", () => {
    const texto = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(detectarMime(texto)).toBeNull();
    expect(detectarMime(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF
    expect(detectarMime(new Uint8Array())).toBeNull();
  });

  it("una cabecera truncada no tiene dimensiones", () => {
    expect(leerDimensiones(png(800, 600).subarray(0, 18), "image/png")).toBeNull();
    expect(leerDimensiones(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg")).toBeNull();
  });
});

describe("validarArchivo (servidor)", () => {
  it("acepta una imagen optimizada", () => {
    expect(validarArchivo({ bytes: webpVp8x(1200, 900), tipoDeclarado: "image/webp" })).toEqual({
      ok: true,
      mime: "image/webp",
      ancho: 1200,
      alto: 900,
    });
  });

  it("rechaza tipos no permitidos aunque los bytes sean de imagen", () => {
    expect(validarArchivo({ bytes: png(800, 600), tipoDeclarado: "image/gif" })).toEqual({
      ok: false,
      error: "tipo_no_permitido",
    });
  });

  it("rechaza un archivo disfrazado: el tipo sale de los bytes", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(validarArchivo({ bytes: html, tipoDeclarado: "image/png" })).toEqual({
      ok: false,
      error: "no_es_imagen",
    });
    expect(validarArchivo({ bytes: png(800, 600), tipoDeclarado: "image/jpeg" })).toEqual({
      ok: false,
      error: "tipo_no_coincide",
    });
  });

  it("rechaza vacíos, pesados, muy chicos y sin optimizar", () => {
    expect(validarArchivo({ bytes: new Uint8Array(), tipoDeclarado: "image/png" })).toMatchObject({
      error: "sin_archivo",
    });
    const pesado = new Uint8Array(3 * 1024 * 1024 + 1);
    pesado.set(png(800, 600));
    expect(validarArchivo({ bytes: pesado, tipoDeclarado: "image/png" })).toMatchObject({
      error: "muy_grande",
    });
    expect(validarArchivo({ bytes: png(150, 900), tipoDeclarado: "image/png" })).toMatchObject({
      error: "muy_chica",
    });
    expect(validarArchivo({ bytes: png(4032, 3024), tipoDeclarado: "image/png" })).toMatchObject({
      error: "dimensiones",
    });
  });
});

describe("rutas y URLs", () => {
  it("cada subida tiene una ruta propia dentro de galeria/", () => {
    const ruta = rutaNueva(UUID.toUpperCase(), "image/webp");
    expect(ruta).toBe(`galeria/${UUID}.webp`);
    expect(esRutaStorage(ruta)).toBe(true);
    expect(rutaNueva(UUID, "image/jpeg")).toMatch(/\.jpg$/);
  });

  it("no acepta rutas con travesía ni fuera de las carpetas previstas", () => {
    expect(esRutaStorage("../secretos.webp")).toBe(false);
    expect(esRutaStorage(`otra/${UUID}.webp`)).toBe(false);
    expect(esRutaEstatica("/img/galeria/galeria-01.webp")).toBe(true);
    expect(esRutaEstatica("/img/variants/grit-azul.webp")).toBe(false);
    expect(esRutaEstatica("/img/galeria/../producto.jpg")).toBe(false);
    expect(esRutaEstatica("https://otro.sitio/img/galeria/x.webp")).toBe(false);
  });

  it("arma la URL pública del bucket con el origen de Supabase", () => {
    expect(urlPublicaStorage(`${SUPA}/`, `galeria/${UUID}.webp`)).toBe(
      `${SUPA}/storage/v1/object/public/product-gallery/galeria/${UUID}.webp`,
    );
    expect(urlPublicaStorage(undefined, "x")).toBeNull();
    expect(urlPublicaStorage("no es una url", "x")).toBeNull();
  });

  it("una fila sirve desde Storage o desde /public, nunca desde otro lado", () => {
    expect(srcDeFila({ storage_path: `galeria/${UUID}.png`, static_path: null }, SUPA)).toContain(
      "/storage/v1/object/public/product-gallery/",
    );
    expect(srcDeFila({ storage_path: null, static_path: "/img/galeria/galeria-03.webp" }, SUPA)).toBe(
      "/img/galeria/galeria-03.webp",
    );
    expect(srcDeFila({ storage_path: "../x", static_path: null }, SUPA)).toBeNull();
  });
});

describe("galeriaPublica", () => {
  it("respeta el orden: la posición 1 es la principal", () => {
    const { imagenes, origen } = galeriaPublica(
      [
        fila({ id: "b", sort_order: 2, static_path: "/img/galeria/galeria-01.webp", alt_text: "A" }),
        fila({ id: "c", sort_order: 3, static_path: "/img/galeria/galeria-02.webp", alt_text: "B" }),
        fila({ id: "a", sort_order: 1, static_path: "/img/galeria/galeria-03.webp", alt_text: "C" }),
      ],
      SUPA,
    );
    expect(origen).toBe("base");
    expect(imagenes.map((i) => i.alt)).toEqual(["C", "A", "B"]);
  });

  it("omite inactivas y filas sin archivo válido, y completa el alt", () => {
    const { imagenes } = galeriaPublica(
      [
        fila({ id: "a", sort_order: 1, storage_path: `galeria/${UUID}.webp` }),
        fila({ id: "b", sort_order: 2, static_path: "/img/galeria/galeria-02.webp", is_active: false }),
        fila({ id: "c", sort_order: 3, storage_path: "basura" }),
      ],
      SUPA,
    );
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]!.alt).toBe("Pulsera NFC GRIT — foto 1 de la galería");
  });

  it("sin filas (o sin filas válidas) usa las fotos estáticas: nunca vacía", () => {
    for (const filas of [null, undefined, [], [fila({ id: "x", sort_order: 1, is_active: false, static_path: "/img/galeria/galeria-01.webp" })]]) {
      const r = galeriaPublica(filas, SUPA);
      expect(r.origen).toBe("fallback");
      expect(r.imagenes).toBe(GALERIA_FALLBACK);
      expect(r.imagenes.length).toBeGreaterThan(0);
    }
  });

  it("el fallback son las diez fotos de /public/img/galeria, no las de los modelos", () => {
    expect(GALERIA_FALLBACK).toBe(PRODUCTO_GALERIA);
    expect(GALERIA_FALLBACK).toHaveLength(10);
    const modelos = new Set(PRODUCTO_MODELOS.map((m) => m.src));
    expect(GALERIA_FALLBACK.every((i) => esRutaEstatica(i.src) && !modelos.has(i.src))).toBe(true);
  });
});

describe("galeriaAdmin", () => {
  it("expone posición, origen y metadatos para el panel", () => {
    const [img] = galeriaAdmin(
      [fila({ id: "a", sort_order: 1, storage_path: `galeria/${UUID}.webp`, width: 1200, height: 900, size_bytes: 1234, alt_text: "  " })],
      SUPA,
    );
    expect(img).toMatchObject({ id: "a", posicion: 1, origen: "storage", alt: null, ancho: 1200, alto: 900, bytes: 1234 });
  });
});

describe("orden", () => {
  it("mover: C a la posición 1 deja C → A → B", () => {
    expect(mover(["A", "B", "C"], 2, 0)).toEqual(["C", "A", "B"]);
    expect(mover(["A", "B", "C"], 0, 2)).toEqual(["B", "C", "A"]);
    expect(mover(["A", "B", "C"], 1, 1)).toEqual(["A", "B", "C"]);
    expect(mover(["A", "B", "C"], 5, 0)).toEqual(["A", "B", "C"]);
  });

  it("mover no muta la lista original", () => {
    const original = ["A", "B", "C"];
    mover(original, 2, 0);
    expect(original).toEqual(["A", "B", "C"]);
  });

  it("mismoOrden", () => {
    expect(mismoOrden(["a", "b"], ["a", "b"])).toBe(true);
    expect(mismoOrden(["a", "b"], ["b", "a"])).toBe(false);
    expect(mismoOrden(["a"], ["a", "b"])).toBe(false);
  });

  it("validarOrden exige UUIDs sin repetidos", () => {
    const otro = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
    expect(validarOrden([UUID.toUpperCase(), otro])).toEqual([UUID, otro]);
    expect(validarOrden([UUID, UUID])).toBeNull();
    expect(validarOrden([])).toBeNull();
    expect(validarOrden(["1; drop table"])).toBeNull();
    expect(validarOrden("no-array")).toBeNull();
  });
});

describe("normalizarAlt", () => {
  it("limpia espacios y trata el vacío como sin descripción", () => {
    expect(normalizarAlt("  Pulsera   en la muñeca ")).toBe("Pulsera en la muñeca");
    expect(normalizarAlt("   ")).toBeNull();
    expect(normalizarAlt(null)).toBeNull();
  });

  it("rechaza descripciones demasiado largas o de otro tipo", () => {
    expect(normalizarAlt("x".repeat(301))).toBeUndefined();
    expect(normalizarAlt(42)).toBeUndefined();
  });
});

describe("dimensionesOptimizadas", () => {
  it("achica conservando la proporción, sin recortar", () => {
    expect(dimensionesOptimizadas(4032, 3024)).toEqual({ ancho: 1200, alto: 900 });
    expect(dimensionesOptimizadas(3024, 4032)).toEqual({ ancho: 900, alto: 1200 });
    expect(dimensionesOptimizadas(3000, 3000)).toEqual({ ancho: 1200, alto: 1200 });
  });

  it("nunca agranda", () => {
    expect(dimensionesOptimizadas(500, 500)).toEqual({ ancho: 500, alto: 500 });
  });
});
