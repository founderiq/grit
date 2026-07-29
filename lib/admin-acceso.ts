/**
 * Regla de acceso al panel administrativo — función pura.
 *
 * Vive en su propio módulo, sin importar `next/headers` ni Supabase, para que
 * la decisión de "quién entra" se pueda leer y testear de un vistazo, sin
 * infraestructura.
 *
 * LA REGLA
 *   Tener cuenta en Supabase Auth NO alcanza. Para entrar hace falta, además,
 *   una fila en `public.admin_users` con `is_active = true`. La autorización no
 *   mira el email: mira el `user_id`, que es lo único que Auth garantiza.
 */

/** Fila de `public.admin_users` para el usuario del request, o `null`. */
export type FilaAdmin = {
  role: string;
  is_active: boolean;
  display_name: string | null;
};

export type UsuarioAuth = {
  id: string;
  email: string | null;
};

export type EstadoAdmin =
  /** El entorno no tiene configurado Supabase. Nunca se muestra el login. */
  | { estado: "sin_configuracion" }
  /** Nadie autenticado: se muestra el login dentro de /admin. */
  | { estado: "sin_sesion" }
  /** Autenticado, pero sin permiso: se muestra "Acceso no autorizado". */
  | { estado: "no_autorizado"; email: string | null }
  /** Autenticado y autorizado: se muestra el panel. */
  | {
      estado: "autorizado";
      /**
       * `user_id` de Supabase Auth. Es lo que se guarda como `changed_by` /
       * `archived_by` / `created_by` en cada escritura del panel: la identidad
       * la pone el servidor a partir de la sesión verificada, nunca el
       * navegador.
       */
      userId: string;
      email: string | null;
      nombre: string | null;
      role: string;
    };

/**
 * Decide el estado del panel a partir del usuario autenticado y su fila de
 * `admin_users`.
 *
 * Falla cerrado: cualquier caso que no sea "hay usuario Y hay fila activa"
 * termina fuera del panel.
 *
 * @param usuario Usuario verificado por Supabase Auth, o `null`.
 * @param fila    Fila de `admin_users` de ese usuario, o `null` si no tiene.
 */
export function resolverAcceso(
  usuario: UsuarioAuth | null,
  fila: FilaAdmin | null,
): EstadoAdmin {
  if (!usuario) return { estado: "sin_sesion" };

  if (!fila || fila.is_active !== true) {
    return { estado: "no_autorizado", email: usuario.email };
  }

  return {
    estado: "autorizado",
    userId: usuario.id,
    email: usuario.email,
    // `display_name` es opcional: si está vacío, la interfaz cae al email.
    nombre: fila.display_name?.trim() || null,
    role: fila.role,
  };
}
