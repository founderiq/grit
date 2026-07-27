import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import Header, { type NavLink } from "@/components/Header";
import CartButton from "@/components/cart/CartButton";
import CartRoot from "@/components/cart/CartRoot";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import { IconShield } from "@/components/ui/ProductoIcons";
import { CHECKOUT, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description:
    "Completá tus datos para confirmar tu pedido de GRIT de forma rápida y segura.",
  // El checkout no se indexa ni aparece en el sitemap.
  robots: { index: false, follow: false },
};

const NAV_CHECKOUT: NavLink[] = [
  { href: "/producto", label: "Producto" },
  { href: "/producto#como-funciona", label: "Cómo funciona" },
  { href: "/producto#preguntas", label: "Preguntas" },
];

/**
 * Checkout de compra directa, en modo claro.
 *
 * Shell de servidor: barra de anuncio, header, encabezado y footer. El
 * formulario y el resumen viven en <CheckoutClient />, que es el que necesita
 * estado. El carrito lo provee el layout de (shop), compartido con /producto.
 */
export default function CheckoutPage() {
  return (
    <CartRoot>
      <div className="bg-tinta px-5 py-[9px] text-center">
        <p className="m-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-copy lg:text-[10px]">
          <span className="lg:hidden">{CHECKOUT.barraCorta}</span>
          <span className="hidden lg:inline">{CHECKOUT.barra}</span>
        </p>
      </div>

      <Header
        variant="light"
        nav={NAV_CHECKOUT}
        cta={{ href: "/producto#comprar", label: "Comprar" }}
        cartSlot={<CartButton />}
      />

      <main className="grit-on-light bg-hueso text-tinta">
        <div className="mx-auto max-w-contenido px-5 pb-12 pt-6 lg:px-10 lg:pb-seccion lg:pt-11">
          <h1 className="m-0 font-archivo text-[26px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[38px]">
            {CHECKOUT.titulo}
            <span className="text-tierra-oscura">.</span>
          </h1>
          <p className="m-0 mb-7 mt-3 max-w-[520px] text-[13.5px] leading-[1.6] text-gris-oscuro lg:text-[15px]">
            {CHECKOUT.sub}
          </p>

          {/* useSearchParams necesita un límite de Suspense para que la ruta
              siga siendo prerenderizable. */}
          <Suspense fallback={null}>
            <CheckoutClient />
          </Suspense>
        </div>
      </main>

      <footer className="grit-on-light border-t border-borde-claro bg-hueso">
        <div className="mx-auto flex max-w-contenido flex-wrap items-center justify-between gap-4 px-5 py-7 lg:px-10">
          <Link href="/" aria-label="Grit — inicio" className="flex min-h-11 items-center">
            <Image
              src="/img/logo-dark.svg"
              alt="Grit"
              width={90}
              height={18}
              className="h-4 w-auto lg:h-[18px]"
            />
          </Link>

          <p className="m-0 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro lg:text-[9.5px]">
            {CHECKOUT.footerLegal}
          </p>

          <a
            href={LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro transition-colors duration-control hover:text-tinta lg:text-[9.5px]"
          >
            <IconShield width={13} aria-hidden="true" />
            WhatsApp · {LINKS.whatsappVisible}
          </a>
        </div>
      </footer>
    </CartRoot>
  );
}
