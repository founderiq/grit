import Image from "next/image";
import SectionLabel from "./ui/SectionLabel";
import ProductSpec from "./ui/ProductSpec";
import { PRODUCT_SPECS } from "@/lib/content";

/**
 * El producto — fondo hueso. Dos fotos (muñeca + detalle cruz),
 * descripción emotiva y tabla de especificaciones.
 * Desktop: imágenes a la izquierda, copy + specs a la derecha.
 */
export default function Producto() {
  return (
    <section id="producto" className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          El producto
        </SectionLabel>

        <h2 className="m-0 mb-[26px] font-archivo text-[34px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] md:text-[44px]">
          Es lo que <span className="text-tierra-oscura">representa.</span>
        </h2>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-14">
          {/* Fotos de producto */}
          <div className="mb-[26px] grid grid-cols-[1.3fr_1fr] gap-[10px] lg:mb-0">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[6px]">
              <Image
                src="/img/producto-muneca.jpg"
                alt="Pulsera Grit puesta en la muñeca — uso real"
                fill
                sizes="(max-width: 1024px) 55vw, 28vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[6px]">
              <Image
                src="/img/producto-cruz.jpg"
                alt="Detalle de la cruz bordada en la pulsera Grit"
                fill
                sizes="(max-width: 1024px) 42vw, 22vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Copy + specs */}
          <div>
            <p className="m-0 mb-7 text-[16.5px] leading-[1.6] text-gris-tinta">
              La cruz va bordada en hilo, no estampada: no se despega ni se
              borra. Resiste el agua. Liviana y elástica, hecha para que la uses
              todos los días y te olvides de que la tenés puesta.
            </p>

            <div className="border-t-2 border-tinta">
              {PRODUCT_SPECS.map((spec) => (
                <ProductSpec
                  key={spec.label}
                  label={spec.label}
                  valor={spec.valor}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
