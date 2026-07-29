import type { Metadata } from "next";
import Header, { type NavLink } from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import CartButton from "@/components/cart/CartButton";
import CartRoot from "@/components/cart/CartRoot";
import ProductoPrincipal from "@/components/producto/ProductoPrincipal";
import ProductoVidaReal from "@/components/producto/ProductoVidaReal";
import ProductoPasos from "@/components/producto/ProductoPasos";
import ProductoRecordatorio from "@/components/producto/ProductoRecordatorio";
import ProductoBeneficios from "@/components/producto/ProductoBeneficios";
import ProductoOpiniones from "@/components/producto/ProductoOpiniones";
import ProductoIncluye from "@/components/producto/ProductoIncluye";
import ProductoRegalo from "@/components/producto/ProductoRegalo";
import ProductoCTAFinal from "@/components/producto/ProductoCTAFinal";

export const metadata: Metadata = {
  title: "Comprar Pulsera NFC GRIT",
  description:
    "Un recordatorio diario de fe en la muñeca: acercás el celular, tocás y recibís un versículo para tu día. Sin app, sin batería. Desde Gs. 115.000. Envíos a todo Paraguay.",
  alternates: { canonical: "/producto" },
  openGraph: {
    title: "Comprar Pulsera NFC GRIT",
    description:
      "Acercás el celular, tocás y recibís un versículo para tu día. Sin app, sin batería. Desde Gs. 115.000. Envíos a todo Paraguay.",
    url: "/producto",
    images: [{ url: "/img/producto.jpg", width: 1536, height: 1024 }],
  },
};

const NAV_PRODUCTO: NavLink[] = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#opiniones", label: "Opiniones" },
  { href: "#preguntas", label: "Preguntas" },
];

/**
 * Página de producto — venta directa de la Pulsera NFC GRIT.
 * Arranca en la galería + compra, sin hero previo. El orden de secciones es
 * el aprobado en el Product Experience handoff.
 */
export default function ProductoPage() {
  return (
    <CartRoot>
      <Header
        variant="light"
        nav={NAV_PRODUCTO}
        cta={{ href: "#comprar", label: "Comprar" }}
        cartSlot={<CartButton />}
      />
      <main>
        <ProductoPrincipal />
        <ProductoVidaReal />
        <ProductoPasos />
        <ProductoRecordatorio />
        <ProductoBeneficios />
        <ProductoOpiniones />
        <ProductoIncluye />
        <ProductoRegalo />
        <FAQ variant="producto" />
        <ProductoCTAFinal />
      </main>
      <Footer variant="producto" />
    </CartRoot>
  );
}
