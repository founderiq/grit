/**
 * Autorización del panel administrativo, del lado del SERVIDOR.
 *
 * Son dos comprobaciones encadenadas, y las dos ocurren en el servidor:
 *
 *   1. AUTENTICACIÓN — `supabase.auth.getUser()` con la sesión de las cookies.
 *      Se usa `getUser()` y no `getSession()` porque el primero valida el token
 *      contra Supabase Auth; el segundo confía en la cookie tal como llegó.
 *
 *   2. AUTORIZACIÓN — se busca ese `user_id` en `public.admin_users` con la
 *      service role. Sin una fila activa no se entra, por más que la cuenta
 *      exista en Auth. No se autoriza por email en ningún momento.
 *
 * El navegador no participa de la decisión: no hay ningún botón oculto que
 * revele datos, ni una consulta del cliente que se pueda repetir a mano. Con
 * RLS activo y cero políticas, `anon` y `authenticated` no pueden leer ni
 * `admin_users` ni `orders`.
 */
import "server-only";
import { resolverAcceso, type EstadoAdmin, type FilaAdmin } from "@/lib/admin-acceso";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";
import { faltanVariablesAuth, getUsuarioAutenticado } from "@/lib/supabase-server";

export type { EstadoAdmin };

/**
 * Estado del panel para el request en curso.
 *
 * Nunca lanza: cualquier problema termina en un estado que la interfaz sabe
 * mostrar. Los detalles quedan en el log del servidor, jamás en la respuesta.
 */
export async function obtenerEstadoAdmin(): Promise<EstadoAdmin> {
  /* 1 · Configuración -------------------------------------------------------
     Si falta cualquiera de las cuatro variables, ni siquiera se muestra el
     login: un formulario que no puede autenticar solo confunde.             */
  const faltan = faltanVariablesAuth();
  if (!hayConfiguracionSupabase()) faltan.push("SUPABASE_URL / SUPABASE_SECRET_KEY");

  if (faltan.length > 0) {
    // Se nombran las variables que faltan, nunca sus valores.
    console.error("[admin] configuración incompleta:", faltan.join(", "));
    return { estado: "sin_configuracion" };
  }

  /* 2 · Autenticación ------------------------------------------------------ */
  let usuario: Awaited<ReturnType<typeof getUsuarioAutenticado>>;
  try {
    usuario = await getUsuarioAutenticado();
  } catch (e) {
    console.error("[admin] no se pudo verificar la sesión", {
      tipo: e instanceof Error ? e.name : "desconocido",
    });
    return { estado: "sin_sesion" };
  }

  if (!usuario) return resolverAcceso(null, null);

  /* 3 · Autorización -------------------------------------------------------
     Con la service role, porque `authenticated` no tiene privilegios sobre
     `admin_users`. Se filtra por `user_id`, nunca por email.                */
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("role, is_active, display_name")
    .eq("user_id", usuario.id)
    .maybeSingle<FilaAdmin>();

  if (error) {
    // Falla cerrado: si no se puede comprobar el permiso, no hay permiso.
    console.error("[admin] no se pudo verificar la autorización", {
      codigo: error.code,
    });
    return { estado: "no_autorizado", email: usuario.email };
  }

  return resolverAcceso(usuario, data);
}
