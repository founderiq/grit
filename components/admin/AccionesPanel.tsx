"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Capa from "@/components/admin/Capa";
import ModalAdSpend from "@/components/admin/ModalAdSpend";
import ModalCostos from "@/components/admin/ModalCostos";
import ModalPedidoManual from "@/components/admin/ModalPedidoManual";
import { EsqueletoTabla, PanelError } from "@/components/admin/Piezas";
import { ADMIN } from "@/lib/admin-content";
import type { AdSpendFila, Costos } from "@/lib/admin-tipos";

type Abierto = "pedido-manual" | "ad-spend" | "costos" | null;

type Datos = { costos: Costos; adSpend: AdSpendFila[] };

/**
 * Las tres acciones de escritura del panel.
 *
 * Cada botón abre su formulario en una capa. Como el estado vive acá, abrir y
 * cerrar es instantáneo: no hay navegación de por medio ni se vuelve a
 * renderizar el dashboard.
 *
 * LOS DATOS LLEGAN CUANDO HACEN FALTA
 *   Los costos vigentes y las inversiones ya cargadas se piden a
 *   `GET /api/admin/panel` la primera vez que se abre un modal que los
 *   necesita, no en cada visita al panel. Quedan en memoria mientras dure la
 *   página, y se vuelven a pedir después de guardar un cambio.
 *
 *   El pedido manual no necesita nada: abre vacío y al instante.
 */
export default function AccionesPanel() {
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [fallo, setFallo] = useState(false);
  const enVuelo = useRef<Promise<void> | null>(null);

  const cargar = useCallback((forzar = false) => {
    if (!forzar && (datos || enVuelo.current)) return;
    setFallo(false);

    enVuelo.current = (async () => {
      try {
        const r = await fetch("/api/admin/panel", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!r.ok) throw new Error("respuesta_no_ok");
        setDatos((await r.json()) as Datos);
      } catch {
        setFallo(true);
      } finally {
        enVuelo.current = null;
      }
    })();
  }, [datos]);

  // Después de guardar costos o Ad Spend, la copia en memoria queda vieja.
  const refrescar = useCallback(() => cargar(true), [cargar]);

  // El modal de costos y el de Ad Spend necesitan los datos; el manual no.
  useEffect(() => {
    if (abierto === "costos" || abierto === "ad-spend") cargar();
  }, [abierto, cargar]);

  const cerrar = () => setAbierto(null);

  const base =
    "inline-flex min-h-11 items-center rounded-pill px-[17px] py-[9px] font-inter text-[12.5px] font-semibold transition-[background-color,color] duration-control ease-grit";

  /** Capa de espera mientras llegan los datos del panel. */
  const cargando = (eyebrow: string, titulo: string) => (
    <Capa eyebrow={eyebrow} titulo={titulo} cerrarEtiqueta={ADMIN.formulario.cerrar} onCerrar={cerrar}>
      {fallo ? <PanelError /> : <EsqueletoTabla filas={3} />}
    </Capa>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ADMIN.panel.acciones.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAbierto(a.id as Exclude<Abierto, null>)}
            // Apuntar con el mouse ya trae los datos: para cuando llega el
            // clic, el formulario suele abrir completo.
            onMouseEnter={() => {
              if (a.id !== "pedido-manual") cargar();
            }}
            className={`${base} ${
              // La primera es la acción principal del panel y mantiene la
              // jerarquía frente a las otras dos.
              i === 0
                ? "bg-tinta text-hueso hover:bg-tinta-2"
                : "border-hairline border-borde-claro bg-superficie-input text-tinta hover:bg-bone-300"
            }`}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>

      {abierto === "pedido-manual" && <ModalPedidoManual onCerrar={cerrar} />}

      {abierto === "costos" &&
        (datos ? (
          <ModalCostos costos={datos.costos} onCerrar={cerrar} onGuardado={refrescar} />
        ) : (
          cargando(ADMIN.costos.eyebrow, ADMIN.costos.titulo)
        ))}

      {abierto === "ad-spend" &&
        (datos ? (
          <ModalAdSpend filas={datos.adSpend} onCerrar={cerrar} onGuardado={refrescar} />
        ) : (
          cargando(ADMIN.adSpend.eyebrow, ADMIN.adSpend.titulo)
        ))}
    </>
  );
}

