/**
 * CTA final de la página de producto — fondo tinta, centrado.
 * El botón vuelve al selector de compra (#comprar) más arriba en la página.
 */
export default function ProductoCTAFinal() {
  return (
    <section id="cta" className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-20 text-center md:px-10">
        <h2 className="m-0 font-archivo text-[42px] font-black uppercase leading-[1.02] tracking-[-0.02em] md:text-[58px]">
          Empezá tu hábito diario
          <br />
          de fe con GRIT<span className="text-tierra">.</span>
        </h2>

        <p className="mx-auto mt-[22px] max-w-[360px] text-[16px] leading-[1.6] text-gris-copy">
          Sin descuentos agresivos. Sin urgencia inventada. Cuando estés
          listo, está acá.
        </p>

        <a href="#comprar" className="btn-hueso mt-9 inline-flex">
          Comprar ahora
        </a>
      </div>
    </section>
  );
}
