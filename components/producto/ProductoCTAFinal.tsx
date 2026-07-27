import Image from "next/image";
import { PRODUCTO_CTA_FINAL } from "@/lib/content";

/**
 * CTA final — sección clara con una tarjeta full-bleed de foto y scrim.
 * El botón vuelve al selector de bundles (#comprar) más arriba en la página.
 */
export default function ProductoCTAFinal() {
  return (
    <section id="cta" className="grit-on-light bg-hueso">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:px-10 lg:py-seccion">
        <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-hero px-6 py-14 text-center lg:min-h-[420px] lg:px-10">
          <Image
            src="/img/producto.jpg"
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 1120px"
            className="object-cover"
          />
          {/* Gradiente de protección: existe para que el texto tenga
              contraste sobre la foto, no como decoración. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.55),rgba(20,17,15,0.78))]"
          />

          <div className="relative max-w-[640px]">
            <h2 className="m-0 font-archivo text-[28px] font-black uppercase leading-[1.02] tracking-[-0.02em] text-hueso lg:text-[46px] lg:tracking-[-0.03em]">
              {PRODUCTO_CTA_FINAL.titulo}
              <span className="text-tierra">.</span>
            </h2>

            <p className="m-0 mx-auto mt-5 max-w-[380px] text-[14px] leading-[1.6] text-gris-copy lg:text-[15px]">
              {PRODUCTO_CTA_FINAL.sub}
            </p>

            <a href="#comprar" className="btn-hueso mt-8 inline-flex">
              {PRODUCTO_CTA_FINAL.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
