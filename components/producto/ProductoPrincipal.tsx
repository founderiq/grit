import ProductoGaleria from "./ProductoGaleria";
import ProductoCompra from "./ProductoCompra";

/**
 * Primera sección de la página de producto: galería a la izquierda,
 * título + selector de compra a la derecha. Sin hero previo.
 */
export default function ProductoPrincipal() {
  return (
    <section id="top" className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] pb-seccion pt-[26px] md:px-10 md:pt-12 lg:grid lg:grid-cols-2 lg:items-start lg:gap-16">
        <ProductoGaleria />
        <div className="mt-8 lg:mt-0">
          <ProductoCompra />
        </div>
      </div>
    </section>
  );
}
