"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCTO_GALERIA } from "@/lib/content";

/**
 * Galería de fotos del producto: foto grande + tira de miniaturas.
 * Reusa las fotos ya existentes en /public/img (sin nuevos assets).
 */
export default function ProductoGaleria() {
  const [activa, setActiva] = useState(0);
  const foto = PRODUCTO_GALERIA[activa] ?? PRODUCTO_GALERIA[0]!;

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-superficie-clara">
        <Image
          src={foto.src}
          alt={foto.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 44vw"
          className="object-cover"
        />
      </div>

      <div className="mt-[10px] grid grid-cols-5 gap-[10px]">
        {PRODUCTO_GALERIA.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setActiva(i)}
            aria-label={img.alt}
            aria-pressed={i === activa}
            className={`relative aspect-square overflow-hidden rounded-[6px] outline-none ring-tierra transition-all ${
              i === activa ? "ring-2" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes="10vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
