import SectionLabel from "./ui/SectionLabel";
import FechaHoy from "./ui/FechaHoy";
import { CONTENIDO_EJEMPLO, CONTENIDO_TIPOS } from "@/lib/content";

/**
 * El contenido — fondo tinta. Explica qué se ve exactamente al tocar la
 * pulsera: un mockup de pantalla con el mensaje del día + los tres tipos
 * de contenido que rotan. Responde a la pregunta que "El ritual" deja
 * abierta ("accedés a una verdad") con un ejemplo concreto.
 */
export default function Contenido() {
  return (
    <section id="contenido" className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        {/* Encabezado + tipos de contenido */}
        <div>
          <SectionLabel dot="tierra" className="mb-[22px]">
            Lo que vas a ver
          </SectionLabel>

          <h2 className="m-0 mb-2 font-archivo text-[36px] font-extrabold uppercase leading-[1.0] tracking-[-0.02em] md:text-[44px]">
            Un mensaje.
            <br />
            No una notificación más<span className="text-tierra">.</span>
          </h2>

          <p className="m-0 mb-10 max-w-[380px] text-[15.5px] leading-[1.6] text-gris-claro">
            Nada de scroll ni publicidad. Se abre una sola pantalla, tu cable a
            tierra.
          </p>

          <div className="grid gap-7 border-t border-borde pt-8 sm:grid-cols-3 lg:grid-cols-1 lg:gap-6">
            {CONTENIDO_TIPOS.map((tipo) => (
              <div key={tipo.titulo}>
                <h3 className="m-0 mb-1.5 font-archivo text-[14px] font-bold uppercase tracking-[0.01em] text-hueso">
                  {tipo.titulo}
                </h3>
                <p className="m-0 text-[13.5px] leading-[1.6] text-gris-copy">
                  {tipo.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mockup de pantalla */}
        <div className="mt-12 lg:mt-0">
          <div className="mx-auto w-full max-w-[340px] rounded-[26px] border border-borde bg-tinta-2 p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tierra">
                {CONTENIDO_EJEMPLO.etiqueta}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gris-claro">
                <FechaHoy />
              </span>
            </div>

            <p className="m-0 mt-7 font-archivo text-[21px] font-bold leading-[1.32] tracking-[-0.01em] text-hueso">
              {CONTENIDO_EJEMPLO.texto}
            </p>
            <p className="m-0 mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-tierra">
              — {CONTENIDO_EJEMPLO.referencia}
            </p>

            <div className="mt-7 border-t border-borde pt-5">
              <p className="m-0 text-[13.5px] italic leading-[1.6] text-gris-copy">
                {CONTENIDO_EJEMPLO.accion}
              </p>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-gris-claro">
            Se renueva solo. Nada que instalar ni configurar.
          </p>
        </div>
      </div>
    </section>
  );
}
