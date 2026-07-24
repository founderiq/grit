import { LINKS } from "@/lib/content";

/**
 * CTA final — fondo tinta-2, centrado. Reiteración del tagline + acciones.
 * Nota de marca: sin urgencia inventada ni descuentos agresivos.
 */
export default function CTAFinal() {
  return (
    <section id="cta" className="bg-tinta-2 text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-20 text-center md:px-10">
        <h2 className="m-0 font-archivo text-[62px] font-black uppercase leading-[0.9] tracking-[-0.03em] md:text-[80px]">
          Fe que
          <br />
          se usa<span className="text-tierra">.</span>
        </h2>

        <div className="mt-[18px] font-mono text-[12px] uppercase tracking-[0.18em] text-gris-claro">
          Fuerza en cada toque
        </div>

        <p className="mx-auto mt-[26px] max-w-[330px] text-[16px] leading-[1.6] text-gris-copy">
          85.000 Gs. Envíos a todo el país. No te quedes sin la tuya.
        </p>

        <div className="mx-auto mt-9 flex max-w-[320px] flex-col gap-[13px]">
          <a
            href={LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-hueso px-[26px] py-[17px] font-archivo text-[16px] font-bold text-tinta transition-colors hover:bg-[#e2dccf]"
          >
            Conseguí la tuya
          </a>
          <a
            href={LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 font-inter text-[14px] font-semibold text-gris-copy transition-colors hover:text-hueso"
          >
            Escribinos por WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
}
