import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Manifiesto from "@/components/Manifiesto";
import Ritual from "@/components/Ritual";
import Contenido from "@/components/Contenido";
import Producto from "@/components/Producto";
import FePrimero from "@/components/FePrimero";
import Comunidad from "@/components/Comunidad";
import CTAFinal from "@/components/CTAFinal";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

/**
 * Landing de Grit — una sola página, mobile-first.
 * Orden de secciones según el sistema visual Grit v2.
 */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifiesto />
        <Ritual />
        <Contenido />
        <Producto />
        <FePrimero />
        <Comunidad />
        <CTAFinal />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
