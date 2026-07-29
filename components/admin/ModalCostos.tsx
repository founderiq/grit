"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarPanel } from "@/components/admin/refrescar";
import Capa from "@/components/admin/Capa";
import Aviso from "@/components/admin/Aviso";
import { BotonPrimario, BotonSecundario, Campo } from "@/components/admin/Campos";
import { guardarCostos } from "@/app/admin/acciones-panel";
import { fmtFechaHora } from "@/lib/admin-formato";
import { ADMIN } from "@/lib/admin-content";
import type { Costos } from "@/lib/admin-tipos";

/**
 * Configuración de costos.
 *
 * Los TRES campos que edita el panel, y nada más: costo por pulsera y costo
 * logístico de cada zona. No hay tipo de cambio, ni dólares, ni courier, ni
 * Buzón Prime, ni costos de cerámica, silicona o relojes; nada de eso existe en
 * el modelo y no se inventa acá.
 *
 * El aviso de que los cambios aplican solo a pedidos nuevos está a la vista y
 * no escondido en un tooltip: es la única consecuencia no obvia de guardar.
 */
export default function ModalCostos({
  costos,
  onCerrar,
  onGuardado,
}: {
  costos: Costos;
  onCerrar: () => void;
  /** Vuelve a pedir los datos del panel tras un cambio. */
  onGuardado: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  const [producto, setProducto] = useState(String(costos.producto));
  const [asuncion, setAsuncion] = useState(String(costos.asuncion));
  const [interior, setInterior] = useState(String(costos.interior));
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const sucio =
    producto !== String(costos.producto) ||
    asuncion !== String(costos.asuncion) ||
    interior !== String(costos.interior);

  const c = ADMIN.costos;

  const guardar = () => {
    if (pendiente) return;
    setAviso(null);
    setCampos({});

    iniciar(async () => {
      const r = await guardarCostos({ producto, asuncion, interior });
      if (r.ok) {
        setAviso({ ok: true, texto: r.mensaje });
        onGuardado();
        refrescarPanel(router);
      } else {
        setCampos(r.campos ?? {});
        setAviso({ ok: false, texto: r.error });
      }
    });
  };

  return (
    <Capa
      eyebrow={c.eyebrow}
      titulo={c.titulo}
      cerrarEtiqueta={ADMIN.formulario.cerrar}
      onCerrar={onCerrar}
      // Cerrar con cambios sin guardar pide confirmación: lo escrito no se
      // pierde por un clic en el overlay.
      puedeCerrar={() => !sucio || window.confirm(ADMIN.formulario.salirSinGuardar)}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[12.5px] leading-[1.55] text-gris-oscuro">{c.intro}</p>

        <Campo
          etiqueta={c.producto}
          ayuda={c.productoAyuda}
          error={campos.producto}
          valor={producto}
          modo="numeric"
          deshabilitado={pendiente}
          onCambio={setProducto}
        />
        <Campo
          etiqueta={c.asuncion}
          ayuda={c.asuncionAyuda}
          error={campos.asuncion}
          valor={asuncion}
          modo="numeric"
          deshabilitado={pendiente}
          onCambio={setAsuncion}
        />
        <Campo
          etiqueta={c.interior}
          ayuda={c.interiorAyuda}
          error={campos.interior}
          valor={interior}
          modo="numeric"
          deshabilitado={pendiente}
          onCambio={setInterior}
        />

        <div className="rounded-strip border-hairline border-estado-amarillo-borde bg-estado-amarillo-fondo px-[12px] py-[10px]">
          <p className="m-0 text-[12.5px] font-semibold leading-[1.45] text-estado-amarillo-texto">
            {c.aviso}
          </p>
          <p className="m-0 mt-1 text-[11.5px] leading-[1.45] text-estado-amarillo-texto">
            {c.avisoDetalle}
          </p>
        </div>

        {costos.actualizado && (
          <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-gris-oscuro">
            {c.actualizado}: {fmtFechaHora(costos.actualizado)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <BotonPrimario onClick={guardar} ocupado={pendiente}>
            {pendiente ? ADMIN.formulario.guardando : ADMIN.formulario.guardar}
          </BotonPrimario>
          <BotonSecundario onClick={onCerrar} deshabilitado={pendiente}>
            {ADMIN.formulario.cancelar}
          </BotonSecundario>
        </div>

        {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
      </div>
    </Capa>
  );
}
