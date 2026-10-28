"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import Aviso from "@/components/admin/Aviso";
import Capa from "@/components/admin/Capa";
import { BotonSecundario } from "@/components/admin/Campos";
import { eliminarImagen, type ResultadoAccionGaleria } from "@/app/admin/galeria/acciones";
import { ADMIN } from "@/lib/admin-content";
import type { ImagenGaleriaAdmin } from "@/lib/galeria";

const c = ADMIN.galeria.eliminarConfirmacion;

/**
 * Confirmación para quitar una imagen de la galería.
 *
 * Es el único borrado del panel que no se puede deshacer, así que va en su
 * propia capa, con la foto a la vista y un botón explícito: un clic
 * accidental en "Eliminar" solo abre esta pregunta.
 */
export default function ModalEliminarImagen({
  imagen,
  onCerrar,
  onResultado,
}: {
  imagen: ImagenGaleriaAdmin;
  onCerrar: () => void;
  onResultado: (r: ResultadoAccionGaleria) => void;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirmar = () => {
    if (pendiente) return;
    setError(null);
    iniciar(async () => {
      try {
        const r = await eliminarImagen({ id: imagen.id });
        if (!r.ok) setError(r.error);
        onResultado(r);
      } catch {
        setError(ADMIN.galeria.errores.error_interno);
      }
    });
  };

  return (
    <Capa
      eyebrow={c.eyebrow(imagen.posicion)}
      titulo={c.titulo}
      cerrarEtiqueta={ADMIN.formulario.cerrar}
      onCerrar={onCerrar}
      puedeCerrar={() => !pendiente}
    >
      <div className="flex flex-col gap-4">
        <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-image border-hairline border-borde-claro bg-superficie-clara">
          {imagen.src && (
            <Image src={imagen.src} alt="" fill sizes="220px" className="object-contain" />
          )}
        </div>

        <p className="m-0 text-[13px] leading-[1.55] text-tinta">{c.detalle}</p>
        {imagen.posicion === 1 && (
          <p className="m-0 text-[12.5px] leading-[1.5] text-gris-oscuro">{c.principal}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={pendiente}
            aria-busy={pendiente || undefined}
            className="min-h-11 rounded-pill border-hairline border-estado-rojo-borde bg-estado-rojo-fondo px-[22px] py-[11px] font-inter text-[13px] font-semibold text-estado-rojo-texto transition-[background-color,color] duration-control ease-grit hover:bg-estado-rojo-borde disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendiente ? c.eliminando : c.si}
          </button>
          <BotonSecundario onClick={onCerrar} deshabilitado={pendiente}>
            {ADMIN.formulario.cancelar}
          </BotonSecundario>
        </div>

        {error && <Aviso ok={false}>{error}</Aviso>}
      </div>
    </Capa>
  );
}
