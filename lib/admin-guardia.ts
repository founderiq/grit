/**
 * Puerta única de las escrituras del panel. SOLO servidor.
 *
 * Todas las Server Actions administrativas empiezan por acá, sin excepción:
 *
 *   1. Hay configuración de Supabase del lado del servidor.
 *   2. `obtenerEstadoAdmin()` valida la sesión contra Supabase Auth (no contra
 *      la cookie) y exige una fila ACTIVA en `admin_users`.
 *
 * Que esté en un solo lugar es el punto: ninguna acción nueva puede olvidarse
 * de autorizar, y la regla de quién es administrador sigue viviendo en
 * `lib/admin-auth.ts` sin duplicarse.
 *
 * Devuelve el `user_id` de la sesión verificada. Ese —y no lo que mande el
 * navegador— es el que se guarda en `created_by`, `changed_by`, `archived_by` y
 * `updated_by`.
 */
import "server-only";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";

export type Guardia =
  | { ok: false; motivo: "sin_configuracion" | "no_autorizado" }
  | {
      ok: true;
      adminId: string;
      supabase: ReturnType<typeof getSupabaseAdmin>;
    };

export async function autorizarAdmin(): Promise<Guardia> {
  if (!hayConfiguracionSupabase()) {
    console.error("[admin] configuración de Supabase incompleta");
    return { ok: false, motivo: "sin_configuracion" };
  }

  const acceso = await obtenerEstadoAdmin();
  if (acceso.estado !== "autorizado") {
    return { ok: false, motivo: "no_autorizado" };
  }

  return { ok: true, adminId: acceso.userId, supabase: getSupabaseAdmin() };
}
