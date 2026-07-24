import Image from "next/image";
import type { UgcItem } from "@/lib/content";

/**
 * Grilla de UGC (contenido real de la comunidad): imágenes o videos.
 * Recibe un array de medios; si está vacío, no renderiza nada
 * (así no queda ningún placeholder ni input de archivo en producción).
 */
type UgcGalleryProps = {
  items: readonly UgcItem[];
};

export default function UgcGallery({ items }: UgcGalleryProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-[10px] grid grid-cols-3 gap-2 md:grid-cols-6">
      {items.map((item, i) => (
        <div
          key={`${item.src}-${i}`}
          className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-[#211D19]/60"
        >
          {item.tipo === "video" ? (
            <video
              src={item.src}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            <Image
              src={item.src}
              alt={item.alt ?? ""}
              fill
              sizes="(max-width: 768px) 33vw, 16vw"
              className="object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
