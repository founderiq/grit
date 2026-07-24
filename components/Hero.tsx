import Image from "next/image";
import Link from "next/link";
import SectionLabel from "./ui/SectionLabel";
import { LINKS } from "@/lib/content";

/**
 * Hero. Mobile: texto apilado + foto a sangre.
 * Desktop: dos columnas (texto / foto), titular más grande.
 */
export default function Hero() {
  return (
    <section id="top" className="bg-tinta">
      <div className="mx-auto max-w-contenido px-[26px] pt-[34px] md:px-10 md:pt-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-20">
        {/* Columna de texto */}
        <div className="lg:py-10">
          <SectionLabel dot="tierra" className="mb-[26px]">
            Pulsera Grit · Colección Fe
          </SectionLabel>

          <h1 className="m-0 font-archivo text-[60px] font-black uppercase leading-[0.92] tracking-[-0.03em] md:text-[74px]">
            Tu versículo diario,
            <br />
            siempre con vos<span className="text-tierra">.</span>
          </h1>

          <p className="m-0 mt-6 max-w-[380px] text-[17px] leading-[1.55] text-gris-copy">
            Acercás el celular a la cruz y ahí está tu versículo del día. Sin
            app, sin batería, sin buscar nada.
          </p>

          <div className="mb-9 mt-[30px] flex flex-wrap items-center gap-[14px]">
            <Link href="/producto" className="btn-hueso">
              Quiero la mía
            </Link>
            <a
              href="#ritual"
              className="font-inter text-[14.5px] font-semibold text-gris-copy transition-colors hover:text-hueso"
            >
              Cómo funciona →
            </a>
          </div>
        </div>

        {/* Foto producto — dark / moody */}
        <div className="relative -mx-[26px] md:mx-0 lg:h-[520px]">
          <div className="relative h-[360px] w-full overflow-hidden lg:h-full lg:rounded-2xl">
            <Image
              src="/img/producto.jpg"
              alt="Pulseras Grit — Colección Fe, con logo y cruz bordada"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              style={{ objectPosition: "center 60%" }}
            />
            {/* Degradado sutil para fundir con el fondo (sin gradientes agresivos) */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(#14110F,rgba(20,17,15,0) 22%,rgba(20,17,15,0) 80%,rgba(20,17,15,.45))",
              }}
              aria-hidden="true"
            />
            <div className="absolute bottom-[18px] left-[26px] font-mono text-[10.5px] uppercase tracking-[0.18em] text-gris-claro">
              Tejido premium · Cruz bordada · Chip NFC
            </div>
          </div>
        </div>
      </div>

      {/* Enlace oculto a WhatsApp para accesibilidad/SEO del hero */}
      <span className="sr-only">
        <a href={LINKS.whatsapp}>Escribinos por WhatsApp</a>
      </span>
    </section>
  );
}
