"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
   * Botón de carrito con contador. Se pasa solo en /producto y /checkout.
   * Lo conecta la FASE 3, cuando exista CartContext: `{ count, onOpen }`.
   * Mientras no se pase no se renderiza ningún control de carrito — no se
   * deja en pantalla un botón que no hace nada.
   */
  cart?: { count: number; onOpen: () => void };
};

export default function Header({
  variant = "dark",
  nav = NAV_LANDING,
  cta = { href: "/producto", label: "Comprar" },
  cart,
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
            <Image
              src="/img/logo-dark.svg"
              alt="Grit"
              width={114}
              height={24}
              priority
              className="h-5 w-auto lg:h-6"
            />
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

            {cart && (
              <button
                type="button"
                onClick={cart.onOpen}
                aria-label={`Abrir carrito, ${cart.count} artículos`}
                className="relative flex h-11 w-11 items-center justify-center text-tinta"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 7h14l-1.2 11.1A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.9L5 7Z" />
                  <path d="M9 7V5.6A3 3 0 0 1 12 3a3 3 0 0 1 3 2.6V7" />
                </svg>
                {cart.count > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-tierra px-1 font-mono text-[9px] text-hueso">
                    {cart.count}
                  </span>
                )}
              </button>
            )}

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
          <Image
            src="/img/logo-light.svg"
            alt="Grit"
            width={90}
            height={19}
            priority
            className="h-[19px] w-auto"
          />
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
          <Link href={cta.href} className="btn-tierra">
            {cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
