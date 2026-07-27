"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { ADMIN } from "@/lib/admin-content";

/**
 * Botón "Salir".
 *
 * `signOut()` borra las cookies de sesión desde el navegador —que es donde
 * `@supabase/ssr` las escribió— y `router.refresh()` hace que el servidor
 * vuelva a evaluar el acceso: sin sesión, /admin muestra el login.
 *
 * Si `signOut()` falla (red caída), igual se refresca: la sesión local queda
 * limpia y el servidor decide.
 */
export default function CerrarSesion() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);

    try {
      await getSupabaseBrowser().auth.signOut();
    } catch {
      /* Sin detalle al usuario: el refresh de abajo resuelve el estado real. */
    }

    router.refresh();
  }

  return (
    <Button type="button" variant="dark" size="sm" onClick={salir} loading={saliendo}>
      {saliendo ? ADMIN.sesion.saliendo : ADMIN.sesion.salir}
    </Button>
  );
}
