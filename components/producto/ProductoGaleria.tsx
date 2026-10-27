"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCTO_GALERIA } from "@/lib/content";
import { getModelo } from "@/lib/modelos";
import ProductoTestimonio from "./ProductoTestimonio";
import { useModeloDestacado } from "./ProductoModeloContext";

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
 *
 * Modelos: cuando el usuario elige un modelo en la columna de compra, la foto
 * principal pasa a ser la de ese modelo (siempre el último elegido). Las diez
 * fotos y sus miniaturas no cambian: tocar una miniatura vuelve a la galería
 * hasta la próxima elección de modelo.
 */
export default function ProductoGaleria() {
  const [activa, setActiva] = useState(0);
  const destacado = useModeloDestacado()?.destacado ?? null;
  // `vez` del último modelo que una miniatura ya "tapó". Mientras el modelo
  // destacado sea más nuevo que eso, la foto principal es la del modelo.
  const [tapadoHasta, setTapadoHasta] = useState(0);
  const total = PRODUCTO_GALERIA.length;

  const conModelo = destacado !== null && destacado.vez > tapadoHasta;
  const modelo = conModelo ? getModelo(destacado.id) : null;
  const foto = modelo ?? PRODUCTO_GALERIA[activa] ?? PRODUCTO_GALERIA[0]!;

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
        {modelo && (
          <span
            aria-hidden="true"
            className="absolute left-3 top-3 rounded-pill bg-tinta px-[10px] py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-hueso"
          >
            {modelo.nombre}
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2 sm:mt-[10px] sm:gap-[10px]">
        {PRODUCTO_GALERIA.map((img, i) => {
          const activaEsta = !modelo && i === activa;
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => {
                setActiva(i);
                if (destacado) setTapadoHasta(destacado.vez);
              }}
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
