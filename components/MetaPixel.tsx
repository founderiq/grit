"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  initMetaPixel,
  rutaConPixel,
  trackContact,
  trackPageView,
} from "@/lib/meta-pixel";

/** Cualquier enlace a wa.me cuenta como inicio de conversación. */
const ES_WHATSAPP = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i;

/** Ventana en la que un segundo click a WhatsApp se considera el mismo. */
const MS_ANTIRREBOTE = 1_000;

/**
 * Punto único de montaje del Meta Pixel. Vive en el layout raíz, así que se
 * monta una sola vez y sobrevive a las navegaciones del App Router.
 *
 * QUÉ HACE
 *   · Inicializa el pixel en el navegador, una sola vez (`initMetaPixel`).
 *   · Dispara PageView en la primera carga y en cada cambio real de ruta.
 *     El App Router no recarga la página al navegar, así que sin esto una SPA
 *     reportaría una sola vista por sesión. La deduplicación por ruta vive en
 *     `trackPageView`.
 *   · Dispara Contact cuando se hace click en un enlace de WhatsApp. Se
 *     resuelve con un listener delegado en `document` para no tener que tocar
 *     los componentes de servidor que pintan esos enlaces (Hero, Footer, FAQ,
 *     CTA final, checkout y /gracias): ni el marcado ni el diseño cambian.
 *
 * No renderiza nada.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const activo = rutaConPixel(pathname ?? "/");

  useEffect(() => {
    if (!activo) return;
    initMetaPixel();
    trackPageView(pathname ?? "/");
  }, [activo, pathname]);

  useEffect(() => {
    if (!activo) return;

    let ultimoClick = 0;

    const onClick = (evento: MouseEvent) => {
      const destino = evento.target;
      if (!(destino instanceof Element)) return;

      const enlace = destino.closest("a[href]");
      if (!enlace) return;
      if (!ES_WHATSAPP.test(enlace.getAttribute("href") ?? "")) return;

      // Un doble click sobre el mismo botón es una sola conversación.
      const ahora = Date.now();
      if (ahora - ultimoClick < MS_ANTIRREBOTE) return;
      ultimoClick = ahora;

      trackContact();
    };

    // En captura: el evento se registra aunque algún handler propio detenga
    // la propagación más adelante.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [activo]);

  return null;
}
