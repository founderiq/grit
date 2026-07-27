/**
 * Cliente de Supabase para el SERVIDOR con la sesión del usuario.
 *
 * Usa la misma publishable key que el navegador —no la secret key— pero lee la
 * sesión desde las cookies del request. Sirve para una sola cosa: preguntarle
 * a Supabase Auth quién es el usuario de este request.
 *
 * `import "server-only"` hace que el build falle si un componente de cliente
 * lo importa: `next/headers` no existe en el navegador y el error sería mucho
 * menos claro.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConfiguracionAuthFaltanteError, faltanVariablesAuth } from "@/lib/supabase-browser";

export { ConfiguracionAuthFaltanteError, faltanVariablesAuth };

/**
 * Crea el cliente de servidor atado a las cookies del request en curso.
 *
 * No se cachea entre requests a propósito: cada request tiene su propia sesión.
 */
export async function createSupabaseServer(): Promise<SupabaseClient> {
  const faltan = faltanVariablesAuth();
  if (faltan.length > 0) throw new ConfiguracionAuthFaltanteError(faltan);

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (aEscribir) => {
          // Un Server Component no puede escribir cookies: Next lanza al
          // intentarlo. Se ignora ese caso porque el refresco real lo hace el
          // middleware de /admin, que sí tiene una respuesta donde escribir.
          try {
            for (const { name, value, options } of aEscribir) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* Server Component en modo solo lectura: lo resuelve el middleware. */
          }
        },
      },
    },
  );
}

/**
 * Usuario autenticado de este request, o `null`.
 *
 * Se usa `getUser()` y no `getSession()`: `getUser()` valida el token contra
 * Supabase Auth, mientras que `getSession()` confía en la cookie tal como
 * llegó. Para autorizar, lo único aceptable es la versión verificada.
 */
export async function getUsuarioAutenticado(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
