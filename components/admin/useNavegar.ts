"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDetalle } from "@/components/admin/DrawerPedidos";

/**
 * Mueve el estado del panel a la URL.
 *
 * Los filtros, el rango, la pestaña y la página viven en query params y no en
 * estado de React. Así el servidor puede filtrar en SQL en vez de mandar
 * pedidos que nadie va a ver, el estado del panel se puede compartir o
 * recargar, y el botón atrás del navegador funciona.
 *
 * Los parámetros actuales llegan por props desde el Server Component en lugar
 * de leerse de `window.location`: son los que el servidor REALMENTE usó para
 * renderizar esta pantalla, así que ningún control puede quedar desincronizado
 * con lo que se está viendo.
 *
 * EL PEDIDO ABIERTO ES LA EXCEPCIÓN, y por eso se agrega acá explícitamente.
 * El drawer lo pone y lo saca de la URL con `history.pushState`, sin volver al
 * servidor, de modo que el servidor puede no haberlo visto nunca. Si no se lo
 * volviera a agregar, cambiar un filtro con el detalle abierto borraría
 * `?pedido` mientras la capa sigue en pantalla.
 *
 * POR QUÉ EL "OCUPADO" NO ES `useTransition`
 *   Lo era, y el panel se podía trabar: si la navegación del App Router se
 *   demora o se queda a mitad de camino —pasa con dos cambios de filtro
 *   encimados—, la transición nunca termina y todos los controles quedan
 *   deshabilitados para siempre, sin forma de reintentar.
 *
 *   Ahora el estado de ocupado es propio: se prende al navegar, se apaga en
 *   cuanto llegan parámetros nuevos del servidor —o sea, cuando la navegación
 *   realmente aterrizó— y, por las dudas, tiene un tope de tiempo. Un viaje que
 *   se cuelga deja de bloquear el panel: quien lo está usando puede volver a
 *   intentarlo.
 */

/** Tope del estado ocupado. Es una red de seguridad, no un timeout real. */
const MAX_OCUPADO_MS = 4000;

export function useNavegar(params: Record<string, string>) {
  const router = useRouter();
  const { abiertoId } = useDetalle();
  const [pendiente, setPendiente] = useState(false);

  // Firma de los parámetros que el servidor usó para este render. Cuando
  // cambia, la navegación llegó.
  const firma = JSON.stringify(params);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPendiente(false);
    if (reloj.current) clearTimeout(reloj.current);
    return () => {
      if (reloj.current) clearTimeout(reloj.current);
    };
  }, [firma]);

  const ir = useCallback(
    (cambios: Record<string, string | null>) => {
      const p = new URLSearchParams(params);

      // El drawer manda sobre `pedido`, siempre.
      if (abiertoId) p.set("pedido", abiertoId);
      else p.delete("pedido");

      for (const [clave, valor] of Object.entries(cambios)) {
        // `null` y cadena vacía borran el parámetro: la URL se queda solo con
        // lo que difiere del estado por defecto.
        if (valor === null || valor === "") p.delete(clave);
        else p.set(clave, valor);
      }

      const qs = p.toString();
      const destino = qs ? `/admin?${qs}` : "/admin";
      if (destino === `/admin${window.location.search}`) return;

      setPendiente(true);
      if (reloj.current) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => setPendiente(false), MAX_OCUPADO_MS);

      // `replace` y no `push`: cambiar un filtro no debería llenar el historial
      // de pasos intermedios. `scroll: false` mantiene la vista donde está.
      router.replace(destino, { scroll: false });
    },
    [abiertoId, params, router],
  );

  return { ir, pendiente };
}
