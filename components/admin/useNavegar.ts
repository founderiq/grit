"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Mueve el estado del panel a la URL.
 *
 * Los filtros, el rango, la pestaña y la página viven en query params y no en
 * estado de React. Así el servidor puede filtrar en SQL en vez de mandar
 * pedidos que nadie va a ver, el estado del panel se puede compartir o
 * recargar, y el botón atrás del navegador funciona.
 *
 * Los parámetros actuales llegan por props desde el Server Component en lugar
 * de leerse con `useSearchParams()`: es una dependencia menos y evita que un
 * control quede desincronizado con lo que el servidor realmente usó.
 *
 * `useTransition` deja marcar el control como ocupado mientras el servidor
 * responde, sin bloquear la interfaz.
 */
export function useNavegar(params: Record<string, string>) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  const ir = useCallback(
    (cambios: Record<string, string | null>) => {
      const p = new URLSearchParams(params);

      for (const [clave, valor] of Object.entries(cambios)) {
        // `null` y cadena vacía borran el parámetro: la URL se queda solo con
        // lo que difiere del estado por defecto.
        if (valor === null || valor === "") p.delete(clave);
        else p.set(clave, valor);
      }

      const qs = p.toString();
      // `replace` y no `push`: cambiar un filtro no debería llenar el historial
      // de pasos intermedios. `scroll: false` mantiene la vista donde está.
      iniciar(() => router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false }));
    },
    [params, router],
  );

  return { ir, pendiente };
}
