/**
 * Lecturas de la galería de /producto. SOLO servidor.
 *
 * Se lee con la service role, igual que el resto del esquema: la tabla tiene
 * RLS activo y cero políticas, así que el navegador no puede consultarla. A
 * /producto solo le llegan las URLs públicas de los archivos.
 *
 * NINGUNA LANZA
 *   `obtenerGaleriaPublica()` es el camino de una página pública: ante
 *   cualquier problema (sin configuración, tabla inexistente, error, timeout,
 *   cero filas) devuelve las fotos estáticas de /public/img/galeria.
 */
import "server-only";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";
import type { ProductoImagen } from "@/lib/content";
import {
  COLUMNAS_GALERIA,
  galeriaAdmin,
  galeriaPublica,
  GALERIA_FALLBACK,
  type FilaGaleria,
  type ImagenGaleriaAdmin,
} from "@/lib/galeria";

/**
 * Una página pública no puede quedar colgada esperando a Supabase: pasado este
 * tiempo se corta la consulta y se usa el fallback.
 */
const TIMEOUT_PUBLICO_MS = 4000;

/** Base de las URLs públicas de Storage. Misma variable que usa next.config. */
export const supabaseUrlServidor = () => process.env.SUPABASE_URL;

/** Galería de /producto. Nunca lanza y nunca devuelve una lista vacía. */
export async function obtenerGaleriaPublica(): Promise<ProductoImagen[]> {
  if (!hayConfiguracionSupabase()) return GALERIA_FALLBACK;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("product_gallery_images")
      .select(COLUMNAS_GALERIA)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .abortSignal(AbortSignal.timeout(TIMEOUT_PUBLICO_MS))
      .overrideTypes<FilaGaleria[], { merge: false }>();

    if (error) {
      // Solo el código: nada de SQL ni de credenciales en el log.
      console.error("[galeria] consulta fallida, se usa el fallback", { codigo: error.code });
      return GALERIA_FALLBACK;
    }

    const { imagenes, origen } = galeriaPublica(data, supabaseUrlServidor());
    if (origen === "fallback") console.warn("[galeria] sin filas válidas, se usa el fallback");
    return imagenes;
  } catch (e) {
    console.error("[galeria] consulta fallida, se usa el fallback", {
      tipo: e instanceof Error ? e.name : "desconocido",
    });
    return GALERIA_FALLBACK;
  }
}

/**
 * Galería completa para el panel. NO autoriza: el llamador ya verificó que
 * hay un administrador activo.
 */
export async function obtenerGaleriaAdmin(): Promise<
  { ok: true; datos: ImagenGaleriaAdmin[] } | { ok: false }
> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("product_gallery_images")
      .select(COLUMNAS_GALERIA)
      .order("sort_order", { ascending: true })
      .overrideTypes<FilaGaleria[], { merge: false }>();

    if (error) {
      console.error("[galeria] no se pudo leer la galería del panel", { codigo: error.code });
      return { ok: false };
    }

    return { ok: true, datos: galeriaAdmin(data ?? [], supabaseUrlServidor()) };
  } catch (e) {
    console.error("[galeria] no se pudo leer la galería del panel", {
      tipo: e instanceof Error ? e.name : "desconocido",
    });
    return { ok: false };
  }
}
