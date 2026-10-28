/**
 * Galería administrable de /producto — reglas puras.
 *
 * Sin red, sin Supabase, sin `next/*`: lo usan el servidor (validar lo que
 * sube el panel, armar la galería pública) y el navegador (el gestor del
 * panel), y se testea sin infraestructura.
 *
 * ALCANCE
 *   Solo la galería GENERAL de /producto. Las fotos de los modelos de pulsera
 *   (Negro, Azul, Verde, Gris, Rosa, Floral) siguen en `lib/content.ts` y
 *   `/public/img/variants`, y no pasan por acá.
 *
 * FALLBACK
 *   `PRODUCTO_GALERIA` (las diez fotos de /public/img/galeria) queda como red
 *   de seguridad: si Supabase falla, la consulta da error o la tabla está
 *   vacía, /producto muestra esas fotos. La galería nunca queda vacía.
 */
import { PRODUCTO_GALERIA, type ProductoImagen } from "@/lib/content";

/* ------------------------------------------------------------
   Constantes
   ------------------------------------------------------------ */

/** Bucket de Supabase Storage. Lectura pública, escritura solo del servidor. */
export const GALERIA_BUCKET = "product-gallery";

export const MIME_PERMITIDOS = ["image/webp", "image/jpeg", "image/png"] as const;
export type MimeGaleria = (typeof MIME_PERMITIDOS)[number];

const EXTENSION: Record<MimeGaleria, "webp" | "jpg" | "png"> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Lo más pesado que se acepta ELEGIR en el panel, antes de optimizar. */
export const MAX_BYTES_ORIGINAL = 20 * 1024 * 1024;

/**
 * Lo más pesado que se acepta GUARDAR. Igual al `file_size_limit` del bucket.
 * Una foto optimizada por el panel pesa unos cientos de KB.
 */
export const MAX_BYTES_GUARDADO = 3 * 1024 * 1024;

/**
 * Lado mayor de la versión que se guarda. La galería se ve a ~500×500 en
 * desktop y a todo el ancho en mobile; 1200px cubre pantallas de alta densidad
 * sin cargar fotos crudas de cámara. Next/Image genera los tamaños de cada
 * pantalla a partir de esta versión.
 */
export const LADO_OPTIMIZADO = 1200;

/** Tope que acepta el servidor: margen sobre LADO_OPTIMIZADO, no un permiso. */
export const LADO_MAX_SERVIDOR = 1600;

/** Debajo de esto la foto se vería pixelada en la galería. */
export const LADO_MIN = 200;

export const MAX_ALT = 300;

/* ------------------------------------------------------------
   Tipos
   ------------------------------------------------------------ */

/** Fila de `public.product_gallery_images`, tal como la devuelve PostgREST. */
export type FilaGaleria = {
  id: string;
  storage_path: string | null;
  static_path: string | null;
  sort_order: number;
  alt_text: string | null;
  is_active: boolean;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
};

export const COLUMNAS_GALERIA =
  "id, storage_path, static_path, sort_order, alt_text, is_active, width, height, size_bytes";

/** Una imagen tal como la ve el panel. */
export type ImagenGaleriaAdmin = {
  id: string;
  src: string;
  /** Texto alternativo guardado, sin el fallback genérico. */
  alt: string | null;
  posicion: number;
  activa: boolean;
  ancho: number | null;
  alto: number | null;
  bytes: number | null;
  /** `estatica` = registrada por el seed, vive en /public/img/galeria. */
  origen: "storage" | "estatica";
};

/* ------------------------------------------------------------
   Rutas y URLs
   ------------------------------------------------------------ */

const RE_RUTA_STORAGE =
  /^galeria\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;
const RE_RUTA_ESTATICA = /^\/img\/galeria\/[a-z0-9_-]+\.(webp|jpg|jpeg|png)$/;

/** Mismas reglas que las constraints de la tabla. */
export const esRutaStorage = (v: unknown): v is string =>
  typeof v === "string" && RE_RUTA_STORAGE.test(v);
export const esRutaEstatica = (v: unknown): v is string =>
  typeof v === "string" && RE_RUTA_ESTATICA.test(v);

/**
 * Ruta nueva dentro del bucket. Cada subida tiene nombre propio y nunca se
 * reutiliza: un reemplazo no puede quedar tapado por la caché de la versión
 * anterior, ni en el CDN de Storage ni en el optimizador de imágenes.
 */
export function rutaNueva(uuid: string, mime: MimeGaleria): string {
  return `galeria/${uuid.toLowerCase()}.${EXTENSION[mime]}`;
}

/** URL pública de un objeto del bucket, o `null` si la base no es válida. */
export function urlPublicaStorage(supabaseUrl: string | undefined, ruta: string): string | null {
  if (!supabaseUrl) return null;
  try {
    const { origin } = new URL(supabaseUrl);
    return `${origin}/storage/v1/object/public/${GALERIA_BUCKET}/${ruta}`;
  } catch {
    return null;
  }
}

/** De dónde se sirve una fila. `null` si la fila no apunta a nada válido. */
export function srcDeFila(
  fila: Pick<FilaGaleria, "storage_path" | "static_path">,
  supabaseUrl: string | undefined,
): string | null {
  if (esRutaStorage(fila.storage_path)) return urlPublicaStorage(supabaseUrl, fila.storage_path);
  if (esRutaEstatica(fila.static_path)) return fila.static_path;
  return null;
}

/** Alt de respaldo para una foto subida sin descripción. */
export const altGenerico = (posicion: number) =>
  `Pulsera NFC GRIT — foto ${posicion} de la galería`;

/* ------------------------------------------------------------
   Galería pública y panel
   ------------------------------------------------------------ */

export const GALERIA_FALLBACK: ProductoImagen[] = PRODUCTO_GALERIA;

/**
 * Las filas de la base, convertidas en la galería de /producto.
 *
 * Solo las activas, por posición. Una fila que no apunta a un archivo válido
 * se descarta en vez de mostrar una imagen rota. Si no queda ninguna, la
 * galería es el fallback estático: nunca vacía.
 */
export function galeriaPublica(
  filas: FilaGaleria[] | null | undefined,
  supabaseUrl: string | undefined,
): { imagenes: ProductoImagen[]; origen: "base" | "fallback" } {
  const imagenes: ProductoImagen[] = [];

  for (const fila of [...(filas ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!fila.is_active) continue;
    const src = srcDeFila(fila, supabaseUrl);
    if (!src) continue;
    imagenes.push({ src, alt: fila.alt_text?.trim() || altGenerico(imagenes.length + 1) });
  }

  return imagenes.length > 0
    ? { imagenes, origen: "base" }
    : { imagenes: GALERIA_FALLBACK, origen: "fallback" };
}

/** Las filas, como las muestra el panel. Las inválidas no se ocultan: se avisan. */
export function galeriaAdmin(
  filas: FilaGaleria[],
  supabaseUrl: string | undefined,
): ImagenGaleriaAdmin[] {
  return [...filas]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      id: f.id,
      src: srcDeFila(f, supabaseUrl) ?? "",
      alt: f.alt_text?.trim() || null,
      posicion: f.sort_order,
      activa: f.is_active,
      ancho: f.width,
      alto: f.height,
      bytes: f.size_bytes,
      origen: f.storage_path ? "storage" : "estatica",
    }));
}

/* ------------------------------------------------------------
   Orden
   ------------------------------------------------------------ */

/** Mueve el elemento de `desde` a `hasta` y corre el resto. No muta. */
export function mover<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  if (
    desde === hasta ||
    desde < 0 ||
    hasta < 0 ||
    desde >= copia.length ||
    hasta >= copia.length
  ) {
    return copia;
  }
  const [item] = copia.splice(desde, 1);
  copia.splice(hasta, 0, item as T);
  return copia;
}

export const mismoOrden = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida un orden que llega del navegador: un array de UUIDs sin repetidos.
 * Que coincida con la galería actual lo verifica la base, en la misma
 * transacción que lo aplica.
 */
export function validarOrden(entrada: unknown): string[] | null {
  if (!Array.isArray(entrada) || entrada.length === 0 || entrada.length > 200) return null;
  if (!entrada.every((v) => typeof v === "string" && RE_UUID.test(v))) return null;
  const ids = entrada.map((v: string) => v.toLowerCase());
  return new Set(ids).size === ids.length ? ids : null;
}

/* ------------------------------------------------------------
   Texto alternativo
   ------------------------------------------------------------ */

/**
 * Normaliza la descripción opcional. `null` = sin descripción;
 * `undefined` = inválida (demasiado larga o de otro tipo).
 */
export function normalizarAlt(entrada: unknown): string | null | undefined {
  if (entrada === null || entrada === undefined) return null;
  if (typeof entrada !== "string") return undefined;
  const limpio = entrada.replace(/\s+/g, " ").trim();
  if (limpio.length === 0) return null;
  return limpio.length > MAX_ALT ? undefined : limpio;
}

/* ------------------------------------------------------------
   Archivos: tipo real y dimensiones
   ------------------------------------------------------------ */

const ascii = (b: Uint8Array, desde: number, largo: number) =>
  String.fromCharCode(...b.subarray(desde, desde + largo));

/**
 * Tipo REAL del archivo según sus primeros bytes, no según lo que diga el
 * navegador ni la extensión. `null` si no es JPEG, PNG ni WebP.
 */
export function detectarMime(b: Uint8Array): MimeGaleria | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    ascii(b, 1, 3) === "PNG" &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

const u16be = (b: Uint8Array, i: number) => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
const u16le = (b: Uint8Array, i: number) => (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8);
const u24le = (b: Uint8Array, i: number) => u16le(b, i) | ((b[i + 2] ?? 0) << 16);
const u32be = (b: Uint8Array, i: number) => ((u16be(b, i) << 16) >>> 0) + u16be(b, i + 2);

/** Marcadores JPEG "start of frame", que llevan el alto y el ancho. */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/**
 * Ancho y alto leídos de la cabecera del archivo, sin decodificarlo.
 * `null` si la cabecera no se puede leer: para el servidor, eso no es una
 * imagen válida.
 */
export function leerDimensiones(
  b: Uint8Array,
  mime: MimeGaleria,
): { ancho: number; alto: number } | null {
  let ancho = 0;
  let alto = 0;

  if (mime === "image/png") {
    if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
    ancho = u32be(b, 16);
    alto = u32be(b, 20);
  } else if (mime === "image/webp") {
    if (b.length < 30) return null;
    const chunk = ascii(b, 12, 4);
    if (chunk === "VP8 ") {
      // Frame tag (3 bytes) + código de inicio 9d 01 2a + 14 bits de cada lado.
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      ancho = u16le(b, 26) & 0x3fff;
      alto = u16le(b, 28) & 0x3fff;
    } else if (chunk === "VP8L") {
      if (b[20] !== 0x2f) return null;
      const bits = ((b[21] ?? 0) | ((b[22] ?? 0) << 8) | ((b[23] ?? 0) << 16) | ((b[24] ?? 0) << 24)) >>> 0;
      ancho = (bits & 0x3fff) + 1;
      alto = ((bits >>> 14) & 0x3fff) + 1;
    } else if (chunk === "VP8X") {
      ancho = u24le(b, 24) + 1;
      alto = u24le(b, 27) + 1;
    } else {
      return null;
    }
  } else {
    // JPEG: se recorren los segmentos hasta el primer SOF.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marcador = b[i + 1] ?? 0;
      if (marcador === 0xff) {
        i += 1; // byte de relleno
        continue;
      }
      if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marcador === 0xd9 || marcador === 0xda) return null; // fin o datos sin SOF
      if (SOF.has(marcador)) {
        alto = u16be(b, i + 5);
        ancho = u16be(b, i + 7);
        break;
      }
      const largo = u16be(b, i + 2);
      if (largo < 2) return null;
      i += 2 + largo;
    }
  }

  return ancho > 0 && alto > 0 ? { ancho, alto } : null;
}

export type ErrorArchivo =
  | "sin_archivo"
  | "muy_grande"
  | "tipo_no_permitido"
  | "no_es_imagen"
  | "tipo_no_coincide"
  | "muy_chica"
  | "dimensiones";

/**
 * Validación del SERVIDOR de un archivo que llega del panel.
 *
 * No confía en nada que diga el navegador: el tipo se deduce de los bytes, y
 * tiene que coincidir con el declarado; las dimensiones salen de la cabecera.
 * Un archivo que no pasó por la optimización del panel (más de
 * LADO_MAX_SERVIDOR o más de MAX_BYTES_GUARDADO) se rechaza.
 */
export function validarArchivo(entrada: {
  bytes: Uint8Array;
  tipoDeclarado: string;
}):
  | { ok: true; mime: MimeGaleria; ancho: number; alto: number }
  | { ok: false; error: ErrorArchivo } {
  const { bytes, tipoDeclarado } = entrada;

  if (bytes.length === 0) return { ok: false, error: "sin_archivo" };
  if (bytes.length > MAX_BYTES_GUARDADO) return { ok: false, error: "muy_grande" };
  if (!(MIME_PERMITIDOS as readonly string[]).includes(tipoDeclarado)) {
    return { ok: false, error: "tipo_no_permitido" };
  }

  const mime = detectarMime(bytes);
  if (!mime) return { ok: false, error: "no_es_imagen" };
  if (mime !== tipoDeclarado) return { ok: false, error: "tipo_no_coincide" };

  const dim = leerDimensiones(bytes, mime);
  if (!dim) return { ok: false, error: "no_es_imagen" };
  if (Math.min(dim.ancho, dim.alto) < LADO_MIN) return { ok: false, error: "muy_chica" };
  if (Math.max(dim.ancho, dim.alto) > LADO_MAX_SERVIDOR) return { ok: false, error: "dimensiones" };

  return { ok: true, mime, ...dim };
}

/* ------------------------------------------------------------
   Optimización (cálculo puro; el dibujo vive en galeria-optimizar.ts)
   ------------------------------------------------------------ */

/**
 * Tamaño de la versión optimizada: el lado mayor queda en `max` como mucho y
 * se conserva la proporción. Nunca agranda ni recorta.
 */
export function dimensionesOptimizadas(
  ancho: number,
  alto: number,
  max = LADO_OPTIMIZADO,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= max) return { ancho, alto };
  const escala = max / mayor;
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

/** `184 KB`, `1,2 MB`. */
export function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toLocaleString("es-PY", { maximumFractionDigits: 1 })} MB`;
}
