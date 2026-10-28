"use server";

/**
 * Escrituras de la galería de /producto: subir, reemplazar, eliminar y
 * reordenar.
 *
 * Igual que el resto del panel, son Server Actions que empiezan por
 * `autorizarAdmin()`: sesión validada contra Supabase Auth y fila ACTIVA en
 * `admin_users`, en cada llamada. Haber abierto /admin/galeria hace un rato no
 * alcanza. El `user_id` que se guarda sale de esa sesión, nunca del navegador.
 *
 * Del navegador se usa únicamente: el archivo (que se vuelve a validar byte a
 * byte), la descripción opcional, el id de la imagen y el orden de ids.
 *
 * PUBLICACIÓN SIN DEPLOY
 *   Después de cada cambio, `revalidatePath("/producto")` invalida la versión
 *   cacheada de la página: el próximo visitante ya recibe la galería nueva.
 *   Cada acción devuelve la galería actualizada para que el panel la muestre
 *   sin otra ida y vuelta.
 */

import { revalidatePath } from "next/cache";
import { autorizarAdmin } from "@/lib/admin-guardia";
import { ADMIN } from "@/lib/admin-content";
import { obtenerGaleriaAdmin } from "@/lib/galeria-datos";
import {
  eliminarImagenGaleria,
  reemplazarImagenGaleria,
  reordenarGaleria,
  subirImagenGaleria,
  type ContextoGaleria,
  type ResultadoGaleria,
} from "@/lib/galeria-mutaciones";
import type { ImagenGaleriaAdmin } from "@/lib/galeria";

export type ResultadoAccionGaleria = ResultadoGaleria & {
  /** La galería después del intento. Ausente si no se pudo releer. */
  imagenes?: ImagenGaleriaAdmin[];
};

async function ejecutar(
  operacion: (ctx: ContextoGaleria) => Promise<ResultadoGaleria>,
): Promise<ResultadoAccionGaleria> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) {
    return {
      ok: false,
      error:
        guardia.motivo === "no_autorizado"
          ? ADMIN.galeria.errores.no_autorizado
          : ADMIN.galeria.errores.error_interno,
    };
  }

  const resultado = await operacion({ supabase: guardia.supabase, adminId: guardia.adminId });

  if (resultado.ok) {
    revalidatePath("/producto");
    revalidatePath("/admin/galeria");
  }

  // También tras un error: si otra persona cambió la galería, el panel se
  // pone al día en lugar de seguir mostrando una lista vieja.
  const galeria = await obtenerGaleriaAdmin();
  return galeria.ok ? { ...resultado, imagenes: galeria.datos } : resultado;
}

export async function subirImagen(datos: FormData): Promise<ResultadoAccionGaleria> {
  return ejecutar((ctx) =>
    subirImagenGaleria(ctx, { archivo: datos.get("archivo"), alt: datos.get("alt") }),
  );
}

export async function reemplazarImagen(datos: FormData): Promise<ResultadoAccionGaleria> {
  return ejecutar((ctx) =>
    reemplazarImagenGaleria(ctx, {
      id: datos.get("id"),
      archivo: datos.get("archivo"),
      alt: datos.get("alt"),
    }),
  );
}

export async function eliminarImagen(entrada: { id: unknown }): Promise<ResultadoAccionGaleria> {
  return ejecutar((ctx) => eliminarImagenGaleria(ctx, { id: entrada.id }));
}

export async function guardarOrdenGaleria(entrada: {
  ids: unknown;
}): Promise<ResultadoAccionGaleria> {
  return ejecutar((ctx) => reordenarGaleria(ctx, { ids: entrada.ids }));
}
