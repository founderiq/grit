import SectionLabel from "./ui/SectionLabel";
import RitualStep from "./ui/RitualStep";
import { RITUAL_STEPS } from "@/lib/content";

/**
 * El ritual — fondo tinta-2. Ciclo Tap → Reflexionar → Progreso.
 * Mobile: timeline vertical. Desktop: encabezado a la izquierda, pasos a la derecha.
 */
export default function Ritual() {
  return (
    <section id="ritual" className="bg-tinta-2 text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* Encabezado */}
        <div>
          <SectionLabel dot="tierra" className="mb-[22px]">
            El ritual
          </SectionLabel>

          <h2 className="m-0 mb-2 font-archivo text-[36px] font-extrabold uppercase leading-[1.0] tracking-[-0.02em] md:text-[44px]">
            Un gesto.
            <br />
            Todos los días<span className="text-tierra">.</span>
          </h2>

          <p className="m-0 mb-10 max-w-[330px] text-[15.5px] leading-[1.6] text-gris-claro">
            Acercás el celular a la cruz y en segundos tenés la Palabra para hoy.
          </p>
        </div>

        {/* Pasos */}
        <div>
          <div className="flex flex-col">
            {RITUAL_STEPS.map((step, i) => (
              <RitualStep
                key={step.numero}
                numero={step.numero}
                titulo={step.titulo}
                etiqueta={step.etiqueta}
                descripcion={step.descripcion}
                activo={step.activo}
                ultimo={i === RITUAL_STEPS.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
