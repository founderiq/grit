/**
 * Escrituras de la galería de /producto. SOLO servidor.
 *
 * NO autorizan: las llama `app/admin/galeria/acciones.ts` después de
 * `autorizarAdmin()`, con el cliente de service role y el `user_id` de la
 * sesión verificada. Quedan acá, separadas de la Server Action, para poder
 * testear el orden de las operaciones con un Supabase simulado.
 *
 * EL ORDEN ES LA GARANTÍA
 *   Storage y la base no comparten transacción, así que el orden de los pasos
 *   decide qué puede salir mal:
 *
 *   · Subir     → 1) archivo nuevo  2) fila. Si la fila falla, se borra el
 *                 archivo recién subido.
 *   · Reemplazar→ 1) archivo nuevo  2) la fila apunta al nuevo  3) recién
 *                 entonces se borra el viejo. Nunca se borra primero.
 *   · Eliminar  → 1) se borra la fila  2) recién entonces el archivo.
 *
 *   En el peor caso (Storage falla en el último paso) queda un archivo
 *   huérfano en el bucket, que no se ve en ningún lado. Nunca queda una fila
 *   apuntando a un archivo que no existe.
 *
 *   Los archivos del seed (/public/img/galeria) no se borran nunca: son el
 *   fallback y viven en el repositorio.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN } from "@/lib/admin-content";
import {
  esRutaStorage,
  GALERIA_BUCKET,
  MAX_BYTES_GUARDADO,
  normalizarAlt,
  rutaNueva,
  validarArchivo,
  validarOrden,
  type ErrorArchivo,
} from "@/lib/galeria";
import { esUuid } from "@/lib/pedidos";

export type ContextoGaleria = { supabase: SupabaseClient; adminId: string };

export type ResultadoGaleria = { ok: true; mensaje: string } | { ok: false; error: string };

type CodigoError =
  | ErrorArchivo
  | "alt_invalido"
  | "no_existe"
  | "ultima"
  | "orden_desactualizado"
  | "no_autorizado"
  | "datos_invalidos"
  | "error_interno";

const E = ADMIN.galeria.errores;

const falla = (codigo: CodigoError): ResultadoGaleria => ({
  ok: false,
  error: (E as Record<string, string>)[codigo] ?? E.error_interno,
});

/** Errores de las funciones SQL que tienen un mensaje propio. */
function codigoRpc(error: { code?: string } | null): CodigoError {
  switch (error?.code) {
    case "42501":
      return "no_autorizado";
    case "P0002":
      return "no_existe";
    case "23514":
      return "ultima";
    case "40001":
      return "orden_desactualizado";
    default:
      return "error_interno";
  }
}

const primera = <T>(data: unknown): T | null =>
  (Array.isArray(data) ? (data[0] ?? null) : (data ?? null)) as T | null;

/**
 * Ruta que devuelven `gallery_replace_image` y `gallery_delete_image`. Son
 * funciones escalares (`returns text`), así que PostgREST manda la ruta sola;
 * se aceptan también las formas de fila por si cambia la serialización.
 */
function rutaDevuelta(data: unknown): string | null {
  const v = primera<unknown>(data);
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const s = Object.values(v)[0];
    return typeof s === "string" ? s : null;
  }
  return null;
}

/* ------------------------------------------------------------
   Archivo
   ------------------------------------------------------------ */

type ArchivoValido = {
  bytes: Uint8Array;
  mime: Parameters<typeof rutaNueva>[1];
  ancho: number;
  alto: number;
};

async function leerArchivo(
  archivo: unknown,
): Promise<{ ok: true; archivo: ArchivoValido } | { ok: false; error: ErrorArchivo }> {
  if (!(archivo instanceof Blob) || archivo.size === 0) return { ok: false, error: "sin_archivo" };
  // Antes de leerlo: un archivo enorme no se carga en memoria para nada.
  if (archivo.size > MAX_BYTES_GUARDADO) return { ok: false, error: "muy_grande" };

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const v = validarArchivo({ bytes, tipoDeclarado: archivo.type });
  if (!v.ok) return v;

  return { ok: true, archivo: { bytes, mime: v.mime, ancho: v.ancho, alto: v.alto } };
}

/** Sube a una ruta nueva. Nunca sobrescribe (`upsert: false`). */
async function subirArchivo(
  supabase: SupabaseClient,
  a: ArchivoValido,
): Promise<string | null> {
  const ruta = rutaNueva(randomUUID(), a.mime);

  const { data, error } = await supabase.storage.from(GALERIA_BUCKET).upload(ruta, a.bytes, {
    contentType: a.mime,
    // La ruta no se reutiliza nunca, así que el archivo puede cachearse para
    // siempre: un reemplazo es otra URL.
    cacheControl: "31536000",
    upsert: false,
  });

  // Storage confirma la escritura devolviendo la ruta guardada.
  if (error || data?.path !== ruta) {
    console.error("[galeria] no se pudo subir el archivo", {
      codigo: (error as { statusCode?: string } | null)?.statusCode ?? error?.name ?? "sin_ruta",
    });
    return null;
  }
  return ruta;
}

/** Borra un objeto del bucket. Un fallo deja un huérfano, nunca una referencia rota. */
async function borrarArchivo(supabase: SupabaseClient, ruta: string, motivo: string) {
  if (!esRutaStorage(ruta)) return;
  try {
    const { error } = await supabase.storage.from(GALERIA_BUCKET).remove([ruta]);
    if (error) console.warn("[galeria] archivo huérfano en Storage", { motivo, ruta });
  } catch {
    console.warn("[galeria] archivo huérfano en Storage", { motivo, ruta });
  }
}

/* ------------------------------------------------------------
   Operaciones
   ------------------------------------------------------------ */

/** Sube una imagen nueva al final de la galería. */
export async function subirImagenGaleria(
  { supabase, adminId }: ContextoGaleria,
  entrada: { archivo: unknown; alt: unknown },
): Promise<ResultadoGaleria> {
  const alt = normalizarAlt(entrada.alt);
  if (alt === undefined) return falla("alt_invalido");

  const leido = await leerArchivo(entrada.archivo);
  if (!leido.ok) return falla(leido.error);
  const a = leido.archivo;

  const ruta = await subirArchivo(supabase, a);
  if (!ruta) return falla("error_interno");

  const { data, error } = await supabase.rpc("gallery_add_image", {
    p_storage_path: ruta,
    p_alt_text: alt,
    p_width: a.ancho,
    p_height: a.alto,
    p_size_bytes: a.bytes.length,
    p_admin: adminId,
  });

  if (error) {
    console.error("[galeria] no se pudo registrar la imagen", { codigo: error.code });
    await borrarArchivo(supabase, ruta, "alta_fallida");
    return falla(codigoRpc(error));
  }

  const fila = primera<{ sort_order?: number }>(data);
  return {
    ok: true,
    mensaje: fila?.sort_order
      ? ADMIN.galeria.mensajes.subida(fila.sort_order)
      : ADMIN.galeria.mensajes.subidaSinPosicion,
  };
}

/** Cambia el archivo de una imagen, conservando su posición. */
export async function reemplazarImagenGaleria(
  { supabase, adminId }: ContextoGaleria,
  entrada: { id: unknown; archivo: unknown; alt: unknown },
): Promise<ResultadoGaleria> {
  if (!esUuid(entrada.id)) return falla("datos_invalidos");

  const alt = normalizarAlt(entrada.alt);
  if (alt === undefined) return falla("alt_invalido");

  const leido = await leerArchivo(entrada.archivo);
  if (!leido.ok) return falla(leido.error);
  const a = leido.archivo;

  // 1 · El archivo nuevo, primero. El viejo sigue intacto.
  const ruta = await subirArchivo(supabase, a);
  if (!ruta) return falla("error_interno");

  // 2 · La fila pasa a apuntar al nuevo, en la misma posición.
  const { data, error } = await supabase.rpc("gallery_replace_image", {
    p_id: entrada.id,
    p_storage_path: ruta,
    p_alt_text: alt,
    p_width: a.ancho,
    p_height: a.alto,
    p_size_bytes: a.bytes.length,
    p_admin: adminId,
  });

  if (error) {
    console.error("[galeria] no se pudo reemplazar la imagen", { codigo: error.code });
    // La fila sigue apuntando al archivo viejo: se descarta el nuevo.
    await borrarArchivo(supabase, ruta, "reemplazo_fallido");
    return falla(codigoRpc(error));
  }

  // 3 · Recién ahora, con la fila ya en el archivo nuevo, se borra el viejo.
  //     Si era del seed (/public), no hay nada que borrar.
  const anterior = rutaDevuelta(data);
  if (anterior && anterior !== ruta) await borrarArchivo(supabase, anterior, "reemplazado");

  return { ok: true, mensaje: ADMIN.galeria.mensajes.reemplazada };
}

/** Quita una imagen de la galería y renumera las demás. */
export async function eliminarImagenGaleria(
  { supabase, adminId }: ContextoGaleria,
  entrada: { id: unknown },
): Promise<ResultadoGaleria> {
  if (!esUuid(entrada.id)) return falla("datos_invalidos");

  // 1 · La fila. Desde acá /producto ya no la referencia.
  const { data, error } = await supabase.rpc("gallery_delete_image", {
    p_id: entrada.id,
    p_admin: adminId,
  });

  if (error) {
    console.error("[galeria] no se pudo eliminar la imagen", { codigo: error.code });
    return falla(codigoRpc(error));
  }

  // 2 · El archivo, solo si estaba en Storage.
  const ruta = rutaDevuelta(data);
  if (ruta) await borrarArchivo(supabase, ruta, "eliminada");

  return { ok: true, mensaje: ADMIN.galeria.mensajes.eliminada };
}

/** Guarda el orden completo de la galería. La posición 1 es la principal. */
export async function reordenarGaleria(
  { supabase, adminId }: ContextoGaleria,
  entrada: { ids: unknown },
): Promise<ResultadoGaleria> {
  const ids = validarOrden(entrada.ids);
  if (!ids) return falla("datos_invalidos");

  const { error } = await supabase.rpc("gallery_reorder", { p_ids: ids, p_admin: adminId });

  if (error) {
    console.error("[galeria] no se pudo guardar el orden", { codigo: error.code });
    return falla(codigoRpc(error));
  }

  return { ok: true, mensaje: ADMIN.galeria.mensajes.ordenGuardado };
}
