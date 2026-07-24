"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Header sticky. Al hacer scroll intensifica el fondo y el blur (backdrop-filter)
 * para separar la nav del contenido. En desktop suma enlaces de navegación.
 */
const NAV_LINKS = [
  { href: "/#ritual", label: "El ritual" },
  { href: "/#contenido", label: "El contenido" },
  { href: "/#producto", label: "Producto" },
  { href: "/#faq", label: "FAQ" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            {NAV_LINKS.map((link) => (
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
          <Link href="/producto" className="btn-tierra">
            Comprar
          </Link>
        </nav>
      </div>
    </header>
  );
}
