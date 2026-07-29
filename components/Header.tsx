"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

/**
 * Header sticky, compartido por la landing y las rutas de ecommerce.
 *
 * `variant="dark"` (default) reproduce exactamente el header previo a la
 * parametrización: fondo tinta translúcido que se intensifica al hacer scroll.
 * `variant="light"` es el header de /producto y /checkout: fondo hueso, logo
 * en tinta y hairline claro.
 */
export type NavLink = { href: string; label: string };

const NAV_LANDING: NavLink[] = [
  { href: "/#ritual", label: "El ritual" },
  { href: "/#contenido", label: "El contenido" },
  { href: "/#producto", label: "Producto" },
  { href: "/#faq", label: "FAQ" },
];

type HeaderProps = {
  variant?: "dark" | "light";
  nav?: NavLink[];
  cta?: { href: string; label: string };
  /**
   * Botón de carrito, ya renderizado. Solo lo pasan /producto y /checkout;
   * la landing no lo lleva. Se recibe como slot en lugar de leer el contexto
   * acá para que el módulo del carrito no entre en el bundle de la landing.
   */
  cartSlot?: React.ReactNode;
};

export default function Header({
  variant = "dark",
  nav = NAV_LANDING,
  cta = { href: "/producto", label: "Comprar" },
  cartSlot,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (variant === "light") {
    return (
      <header className="grit-on-light sticky top-0 z-header border-b border-borde-claro bg-hueso">
        <div className="mx-auto flex max-w-contenido items-center justify-between px-5 py-4 lg:px-10">
          {/* min-h-11 = 44px de área táctil sin agrandar el logo. */}
          <Link
            href="/"
            aria-label="Grit — inicio"
            className="flex min-h-11 items-center"
          >
            <Logo variante="header" sobre="claro" prioridad />
          </Link>

          <nav className="flex items-center gap-4 lg:gap-8">
            <ul className="m-0 hidden list-none items-center gap-8 p-0 lg:flex">
              {nav.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex min-h-11 items-center font-inter text-[14px] font-medium text-gris-tinta transition-colors duration-control hover:text-tinta"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {cartSlot}

            {/* Botón `sm` del sistema. specs/05 lo admite a 30px solo en el
                header de desktop; en mobile se promueve a 44px de alto. */}
            <a
              href={cta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-pill bg-tinta px-[17px] py-[9px] font-inter text-[12px] font-semibold text-hueso transition-colors duration-control hover:bg-tinta-2 lg:min-h-0"
            >
              {cta.label}
            </a>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        scrolled
          ? "border-borde bg-tinta/90 backdrop-blur-lg"
          : "border-transparent bg-tinta/70 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-contenido items-center justify-between px-[22px] py-4 md:px-10">
        <Link href="/" aria-label="Grit — inicio" className="flex items-center">
          <Logo variante="header" sobre="oscuro" prioridad />
        </Link>

        <nav className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            {nav.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-inter text-[13.5px] font-medium text-gris-copy transition-colors hover:text-hueso"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {/* Mismo par de tokens que `.btn-naranja` / `Button variant="primary"`
              (bg-naranja / hover:bg-naranja-oscura / text-tinta): es el acento
              INTERACTIVO del sistema, el mismo que "Comprar ahora" en el
              ecommerce. El tamaño de píldora de nav se mantiene tal cual
              estaba — no es el CTA de ancho completo del checkout. */}
          <Link
            href={cta.href}
            className="inline-flex items-center justify-center rounded-full bg-naranja px-[17px] py-[9px] font-inter text-[12px] font-semibold text-tinta transition-colors duration-200 hover:bg-naranja-oscura"
          >
            {cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
