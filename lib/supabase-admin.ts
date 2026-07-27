/**
 * Cliente de Supabase para el SERVIDOR, con la secret key.
 *
 * `import "server-only"` hace que el build falle si algún componente de
 * cliente llega a importar este módulo: la clave no puede terminar nunca en el
 * bundle del navegador.
 *
 * Las variables NO llevan prefijo `NEXT_PUBLIC_`, a propósito. Next solo expone
 * al cliente las que lo tienen, así que `SUPABASE_URL` y `SUPABASE_SECRET_KEY`
 * quedan únicamente del lado del servidor.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Error de configuración: falta una variable de entorno del servidor. */
export class ConfiguracionFaltanteError extends Error {
  constructor(variables: string[]) {
    super(
      `Faltan variables de entorno del servidor: ${variables.join(", ")}. ` +
        "Configuralas en el entorno de despliegue, sin prefijo NEXT_PUBLIC_.",
    );
    this.name = "ConfiguracionFaltanteError";
  }
}

let cliente: SupabaseClient | null = null;

/**
 * Devuelve el cliente admin, creándolo una sola vez por proceso.
 *
 * Lanza `ConfiguracionFaltanteError` si falta configuración, para que el
 * llamador pueda responder 500 con un mensaje genérico sin filtrar detalles.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  const faltan: string[] = [];
  if (!url) faltan.push("SUPABASE_URL");
  if (!secret) faltan.push("SUPABASE_SECRET_KEY");
  if (faltan.length > 0) throw new ConfiguracionFaltanteError(faltan);

  cliente = createClient(url!, secret!, {
    auth: {
      // El cliente de servidor no tiene sesión de usuario ni la persiste.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "x-grit-cliente": "servidor" },
    },
  });

  return cliente;
}

/** `true` si el servidor tiene la configuración necesaria. No revela valores. */
export function hayConfiguracionSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
