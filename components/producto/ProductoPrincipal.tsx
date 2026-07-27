import ProductoGaleria from "./ProductoGaleria";
import ProductoCompra from "./ProductoCompra";
import ProductoTestimonio from "./ProductoTestimonio";

/**
 * Primera sección de la página de producto: galería a la izquierda,
 * columna de compra a la derecha. La página arranca acá, sin hero previo.
 *
 * El testimonio aparece una sola vez: debajo de las miniaturas en desktop
 * (lo monta ProductoGaleria) y debajo de la fila de confianza en mobile.
 */
export default function ProductoPrincipal() {
  return (
    <section id="top" className="grit-on-light bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-5 pb-10 pt-5 lg:grid lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-[52px] lg:px-10 lg:pb-16 lg:pt-11">
        <ProductoGaleria />
        <div className="mt-[22px] lg:mt-0">
          <ProductoCompra />
          <ProductoTestimonio className="lg:hidden" />
        </div>
      </div>
    </section>
  );
}
