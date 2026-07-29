/**
 * Cliente de Supabase para el NAVEGADOR, con la publishable key.
 *
 * Es el único cliente que puede vivir en el bundle del cliente, y se usa
 * exclusivamente para Auth: iniciar sesión, cerrar sesión y refrescar el token.
 * No lee ni escribe tablas: `anon` y `authenticated` no tienen ningún
 * privilegio sobre el esquema de Grit (RLS activo y cero políticas), así que
 * todos los datos del panel llegan desde el servidor.
 *
 * La publishable key es pública por diseño —viaja en cada request del
 * navegador— y por eso lleva prefijo `NEXT_PUBLIC_`. La `SUPABASE_SECRET_KEY`
 * jamás se importa acá: vive solo en `lib/supabase-admin.ts`, que está marcado
 * con `server-only`.
 *
 * `@supabase/ssr` guarda la sesión en cookies (no en localStorage) para que el
 * servidor pueda leerla en cada request.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Error de configuración pública faltante. No revela ningún valor. */
export class ConfiguracionAuthFaltanteError extends Error {
  constructor(variables: string[]) {
    super(`Faltan variables públicas de Supabase: ${variables.join(", ")}.`);
    this.name = "ConfiguracionAuthFaltanteError";
  }
}

/**
 * Las variables se leen por su nombre completo y literal, no armando la clave
 * dinámicamente: Next reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de build
 * y solo reconoce la forma literal.
 */
export function faltanVariablesAuth(): string[] {
  const faltan: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) faltan.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    faltan.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return faltan;
}

let cliente: SupabaseClient | null = null;

/** Devuelve el cliente del navegador, creándolo una sola vez por pestaña. */
export function getSupabaseBrowser(): SupabaseClient {
  if (cliente) return cliente;

  const faltan = faltanVariablesAuth();
  if (faltan.length > 0) throw new ConfiguracionAuthFaltanteError(faltan);

  cliente = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  return cliente;
}
