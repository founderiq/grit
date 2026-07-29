import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refresco de la sesión del panel.
 *
 * El access token de Supabase dura una hora. Un Server Component puede leer
 * cookies pero no escribirlas, así que sin este middleware la sesión se caería
 * al expirar el token aunque el refresh token siguiera siendo válido, y el
 * administrador tendría que volver a entrar cada hora.
 *
 * Acá sí hay una respuesta donde escribir: `supabase.auth.getUser()` renueva el
 * token si hace falta y las cookies nuevas viajan en la respuesta.
 *
 * ALCANCE
 *   El `matcher` limita el middleware a /admin. La landing, /producto,
 *   /checkout, /gracias y la API no lo ejecutan nunca, así que ni Auth ni
 *   Supabase entran en su camino.
 *
 * NO ES LA AUTORIZACIÓN
 *   Este middleware solo mantiene viva la sesión. Quién puede ver el panel lo
 *   decide `obtenerEstadoAdmin()` en el servidor, contra `admin_users`.
 */
export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Sin configuración no hay nada que refrescar. La página muestra el aviso.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aEscribir) => {
        for (const { name, value } of aEscribir) {
          request.cookies.set(name, value);
        }
        // La respuesta se rehace con el request ya actualizado para que el
        // Server Component vea las cookies nuevas en este mismo request.
        response = NextResponse.next({ request });
        for (const { name, value, options } of aEscribir) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    // Efecto buscado: si el token expiró, esto lo renueva y dispara setAll.
    await supabase.auth.getUser();
  } catch {
    // Auth caído no debe dejar el panel inaccesible con un error del edge:
    // se sigue, y la página resuelve el estado como corresponda.
  }

  return response;
}
