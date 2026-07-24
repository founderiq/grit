import SectionLabel from "./ui/SectionLabel";

/**
 * Manifiesto — fondo hueso. Frase fuerte + párrafo de apoyo.
 */
export default function Manifiesto() {
  return (
    <section className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra-oscura" className="mb-[26px]">
          El manifiesto
        </SectionLabel>

        <p className="m-0 max-w-[820px] font-archivo text-[31px] font-bold leading-[1.14] tracking-[-0.015em] md:text-[40px]">
          Un recordatorio, no es solo un accesorio. La llevás para que la FE te
          acompañe todos los días,{" "}
          <span className="text-tierra-oscura">
            para que la FE no quede solo para los domingos.
          </span>
        </p>

        <p className="m-0 mt-7 max-w-[420px] text-[16px] leading-[1.65] text-gris-oscuro">
          La mirás y volvés a la calma. En medio del trabajo, en el apuro, en un
          día caótico. Sin ruido y sin promesas grandes: Su Palabra, y vos.
        </p>
      </div>
    </section>
  );
}
