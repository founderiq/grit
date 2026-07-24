import TestimonialCard from "./TestimonialCard";
import type { Testimonial } from "@/lib/content";

/**
 * Bloque de testimonios. Recibe un array de testimonios reales;
 * si está vacío, no renderiza nada (sin placeholders en producción).
 */
type TestimoniosProps = {
  items: readonly Testimonial[];
};

export default function Testimonios({ items }: TestimoniosProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-[18px] flex max-w-[620px] flex-col gap-3">
      {items.map((t, i) => (
        <TestimonialCard
          key={`${t.nombre}-${i}`}
          nombre={t.nombre}
          ciudad={t.ciudad}
          texto={t.texto}
          foto={t.foto}
        />
      ))}
    </div>
  );
}
