import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import ProductoPrincipal from "@/components/producto/ProductoPrincipal";
import ProductoPasos from "@/components/producto/ProductoPasos";
import ProductoRecordatorio from "@/components/producto/ProductoRecordatorio";
import ProductoBeneficios from "@/components/producto/ProductoBeneficios";
import ProductoIncluye from "@/components/producto/ProductoIncluye";
import ProductoRegalo from "@/components/producto/ProductoRegalo";
import ProductoCTAFinal from "@/components/producto/ProductoCTAFinal";

export const metadata: Metadata = {
  title: "Comprar Pulsera Grit",
  description:
    "Tu versículo diario en la muñeca: acercás el celular a la cruz y ahí está. Tejido premium, cruz bordada, sin app ni mensualidad. 85.000 Gs. Envíos a todo Paraguay.",
  alternates: { canonical: "/producto" },
  openGraph: {
    title: "Comprar Pulsera Grit",
    description:
      "Acercás el celular a la cruz y ahí está el versículo de hoy. Tejido premium, cruz bordada, sin app. 85.000 Gs. Envíos a todo Paraguay.",
    url: "/producto",
    images: [{ url: "/img/producto.jpg", width: 1536, height: 1024 }],
  },
};

/**
 * Página de producto — venta directa de la Pulsera Grit.
 * Arranca en la galería + compra (sin hero previo).
 */
export default function ProductoPage() {
  return (
    <>
      <Header />
      <main>
        <ProductoPrincipal />
        <ProductoPasos />
        <ProductoRecordatorio />
        <ProductoBeneficios />
        <ProductoIncluye />
        <ProductoRegalo />
        <FAQ />
        <ProductoCTAFinal />
      </main>
      <Footer />
    </>
  );
}
