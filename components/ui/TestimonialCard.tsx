import Image from "next/image";

/**
 * Tarjeta de testimonio: texto + foto (opcional) + nombre y ciudad.
 * La foto es una imagen real (URL); si no hay, se muestra un avatar neutro.
 */
type TestimonialCardProps = {
  nombre: string;
  ciudad: string;
  texto: string;
  foto?: string;
};

export default function TestimonialCard({
  nombre,
  ciudad,
  texto,
  foto,
}: TestimonialCardProps) {
  return (
    <div className="rounded-[10px] border border-borde p-6">
      <p className="m-0 mb-[18px] font-archivo text-[19px] font-semibold leading-[1.3]">
        «{texto}»
      </p>
      <div className="flex items-center gap-3">
        {foto ? (
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={foto}
              alt={nombre}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="h-10 w-10 flex-shrink-0 rounded-full bg-[#211D19]/60"
            aria-hidden="true"
          />
        )}
        <div>
          <div className="text-[13.5px] font-semibold text-hueso">{nombre}</div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-gris-medio">
            {ciudad}
          </div>
        </div>
      </div>
    </div>
  );
}
