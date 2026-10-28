/**
 * Optimización de imágenes de la galería, en el NAVEGADOR del administrador.
 *
 * Solo se importa desde componentes de cliente: usa `createImageBitmap` y
 * `<canvas>`, que no existen en el servidor.
 *
 * POR QUÉ ACÁ Y NO EN EL SERVIDOR
 *   Una foto de celular pesa 3–10 MB. Optimizarla antes de enviarla hace que
 *   viajen unos cientos de KB en vez de varios MB, entra cómoda en el límite de
 *   las Server Actions y no agrega dependencias nativas al servidor. El
 *   servidor igual vuelve a validar todo (tipo real, peso y dimensiones) y
 *   rechaza lo que no pasó por acá.
 *
 * QUÉ HACE
 *   · Lado mayor a LADO_OPTIMIZADO (1200px) como mucho, SIN recortar y sin
 *     deformar: se conserva la proporción. Nunca agranda.
 *   · Respeta la orientación EXIF (fotos de celular giradas).
 *   · Reescribe el archivo en WebP (o JPEG si el navegador no codifica WebP):
 *     de paso se descartan los metadatos, incluida la ubicación GPS.
 *   · Si aun así pesara demasiado, baja la calidad de a poco.
 */
import {
  detectarMime,
  dimensionesOptimizadas,
  LADO_MIN,
  MAX_BYTES_GUARDADO,
  MAX_BYTES_ORIGINAL,
  MIME_PERMITIDOS,
} from "@/lib/galeria";

export type ImagenOptimizada = {
  archivo: File;
  ancho: number;
  alto: number;
  original: { ancho: number; alto: number; bytes: number };
};

export type ErrorOptimizacion =
  | "tipo_no_permitido"
  | "muy_grande"
  | "no_es_imagen"
  | "muy_chica"
  | "no_se_pudo_optimizar";

const CALIDADES = [0.9, 0.82, 0.72, 0.6];

/** Decodifica respetando la orientación EXIF. */
async function decodificar(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    // Navegadores sin createImageBitmap para este formato: <img> también
    // aplica la orientación EXIF por defecto.
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const aBlob = (canvas: HTMLCanvasElement, tipo: string, calidad: number) =>
  new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, calidad));

export async function optimizarImagen(
  archivo: File,
): Promise<{ ok: true; imagen: ImagenOptimizada } | { ok: false; error: ErrorOptimizacion }> {
  // Algunos sistemas no informan el tipo: en ese caso decide la cabecera.
  if (archivo.type && !(MIME_PERMITIDOS as readonly string[]).includes(archivo.type)) {
    return { ok: false, error: "tipo_no_permitido" };
  }
  if (archivo.size > MAX_BYTES_ORIGINAL) return { ok: false, error: "muy_grande" };

  // El tipo real, por los primeros bytes: una extensión cambiada no pasa.
  const cabecera = new Uint8Array(await archivo.slice(0, 32).arrayBuffer());
  if (!detectarMime(cabecera)) return { ok: false, error: "no_es_imagen" };

  let fuente: ImageBitmap | HTMLImageElement;
  try {
    fuente = await decodificar(archivo);
  } catch {
    return { ok: false, error: "no_es_imagen" };
  }

  const anchoOriginal = "naturalWidth" in fuente ? fuente.naturalWidth : fuente.width;
  const altoOriginal = "naturalHeight" in fuente ? fuente.naturalHeight : fuente.height;

  try {
    if (!anchoOriginal || !altoOriginal) return { ok: false, error: "no_es_imagen" };
    if (Math.min(anchoOriginal, altoOriginal) < LADO_MIN) return { ok: false, error: "muy_chica" };

    const { ancho, alto } = dimensionesOptimizadas(anchoOriginal, altoOriginal);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "no_se_pudo_optimizar" };

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const dibujar = (fondoBlanco: boolean) => {
      ctx.clearRect(0, 0, ancho, alto);
      // JPEG no tiene transparencia: sin fondo, lo transparente saldría negro.
      if (fondoBlanco) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, ancho, alto);
      }
      ctx.drawImage(fuente, 0, 0, ancho, alto);
    };

    dibujar(false);
    let tipo: "image/webp" | "image/jpeg" = "image/webp";

    for (const calidad of CALIDADES) {
      let blob = await aBlob(canvas, tipo, calidad);

      // Un navegador que no codifica WebP devuelve PNG en silencio.
      if (blob && blob.type !== tipo && tipo === "image/webp") {
        tipo = "image/jpeg";
        dibujar(true);
        blob = await aBlob(canvas, tipo, calidad);
      }

      if (blob && blob.type === tipo && blob.size <= MAX_BYTES_GUARDADO) {
        const nombre = `galeria.${tipo === "image/webp" ? "webp" : "jpg"}`;
        return {
          ok: true,
          imagen: {
            archivo: new File([blob], nombre, { type: tipo }),
            ancho,
            alto,
            original: { ancho: anchoOriginal, alto: altoOriginal, bytes: archivo.size },
          },
        };
      }
    }

    return { ok: false, error: "no_se_pudo_optimizar" };
  } finally {
    if ("close" in fuente) fuente.close();
  }
}
