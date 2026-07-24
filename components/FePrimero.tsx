import SectionLabel from "./ui/SectionLabel";
import CrossIcon from "./ui/CrossIcon";

/**
 * Por qué fe primero — fondo tinta. Justifica la primera categoría
 * sin tono religioso-excluyente.
 */
export default function FePrimero() {
  return (
    <section className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra" className="mb-[26px]">
          Por qué existe Grit
        </SectionLabel>

        <CrossIcon width={34} className="mb-[22px]" />

        <div className="max-w-[760px]">
          <p className="m-0 font-archivo text-[27px] font-bold leading-[1.16] tracking-[-0.015em] md:text-[32px]">
            Grit nace de la fe. No como estrategia, como punto de partida.
          </p>

          <p className="m-0 mt-[26px] text-[16px] leading-[1.65] text-gris-copy">
            Creemos que la fe no se sostiene sola. Se sostiene cuando la volvés a
            tocar todos los días, aunque sea treinta segundos entre una cosa y
            la otra.
          </p>

          <p className="m-0 mt-[18px] text-[16px] leading-[1.65] text-gris-claro">
            Esta pulsera no te hace mejor cristiano. Solo te acerca Su Palabra en
            el medio del día, que es donde más falta hace.
          </p>
        </div>
      </div>
    </section>
  );
}
