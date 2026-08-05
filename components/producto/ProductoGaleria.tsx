"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCTO_GALERIA } from "@/lib/content";
import ProductoTestimonio from "./ProductoTestimonio";

/**
 * Galería de producto: foto principal cuadrada (1:1, máx. 500×500 en
 * desktop, object-fit contain para no recortar el diseño de la imagen) +
 * miniaturas. Las fotos salen de PRODUCTO_GALERIA, así que se reemplazan
 * editando esa lista sin tocar este componente.
 *
 * El testimonio se renderiza acá en desktop (debajo de las miniaturas); en
 * mobile lo monta ProductoPrincipal después de la fila de confianza.
 *
 * Accesibilidad: se quitó el `outline-none` que traía la versión anterior —
 * suprimía el anillo de foco del sistema sin reemplazarlo. El estado activo
 * ahora se expresa con el borde de 2px, no con opacidad, así que el foco de
 * teclado queda visible y distinguible de la selección.
 */
export default function ProductoGaleria() {
  const [activa, setActiva] = useState(0);
  const foto = PRODUCTO_GALERIA[activa] ?? PRODUCTO_GALERIA[0]!;
  const total = PRODUCTO_GALERIA.length;

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-image bg-superficie-clara lg:max-w-[500px]">
        <Image
          src={foto.src}
          alt={foto.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 500px"
          className="object-contain"
        />
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2 sm:mt-[10px] sm:gap-[10px]">
        {PRODUCTO_GALERIA.map((img, i) => {
          const activaEsta = i === activa;
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver foto ${i + 1} de ${total}`}
              aria-current={activaEsta ? "true" : undefined}
              className={`relative aspect-square overflow-hidden rounded-image transition-[border-color] duration-control ease-grit ${
                activaEsta
                  ? "border-heavy border-tinta"
                  : "border-hairline border-borde-claro"
              }`}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="(max-width: 1024px) 20vw, 110px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>

      <ProductoTestimonio className="hidden lg:block" />
    </div>
  );
}
