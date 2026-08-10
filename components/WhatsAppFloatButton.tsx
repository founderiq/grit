import { LINKS } from "@/lib/content";

/** Mensaje prellenado del botón flotante — texto exacto pedido por GRIT. */
const MENSAJE_FLOTANTE =
  "¡Hola! 👋 Me interesa la pulsera GRIT 🖤 ¿Me ayudan a hacer mi pedido?";

const HREF = `https://wa.me/${LINKS.whatsappNumero}?text=${encodeURIComponent(MENSAJE_FLOTANTE)}`;

/**
 * Botón flotante de WhatsApp — solo en Home y /producto (ver uso en
 * app/page.tsx y app/producto/page.tsx). No va en checkout ni en /gracias.
 *
 * `z-40` queda entre el header (`z-header` = 30) y el overlay del carrito
 * (`z-overlay` = 50), para no taparse con la navegación ni quedar debajo del
 * carrito cuando está abierto. El padding extra respeta el safe area de
 * iPhone (home indicator / notch en horizontal).
 */
export default function WhatsAppFloatButton() {
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-transform duration-control ease-grit hover:bg-[#20BD5A] lg:hover:scale-105"
      style={{
        right: "calc(1rem + env(safe-area-inset-right))",
        bottom: "calc(1rem + env(safe-area-inset-bottom))",
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width={30}
        height={30}
        fill="#FFFFFF"
        aria-hidden="true"
      >
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.31.652 4.47 1.783 6.307L4 29l7.86-1.74A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75c-1.97 0-3.8-.57-5.35-1.55l-.383-.24-4.66 1.03 1.01-4.55-.25-.39A9.71 9.71 0 0 1 5.25 15c0-5.93 4.82-10.75 10.754-10.75S26.75 9.07 26.75 15 21.94 24.75 16.004 24.75Zm5.87-7.99c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.26-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.32.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.82.67.77.24 1.46.21 2.02.13.62-.09 1.9-.78 2.16-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
