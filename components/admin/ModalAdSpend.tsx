"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarPanel } from "@/components/admin/refrescar";
import Capa from "@/components/admin/Capa";
import Aviso from "@/components/admin/Aviso";
import {
  BotonPrimario,
  BotonSecundario,
  Campo,
  CampoTexto,
  Seccion,
} from "@/components/admin/Campos";
import { archivarAdSpend, guardarAdSpend } from "@/app/admin/acciones-panel";
import { fmtFechaCorta, fmtGs } from "@/lib/admin-formato";
import { hoyAsuncion } from "@/lib/admin-rango";
import { ADMIN } from "@/lib/admin-content";
import type { AdSpendFila } from "@/lib/admin-tipos";

/**
 * Ad Spend: alta, edición, borrado y listado.
 *
 * El listado va debajo del formulario, ordenado de la inversión más reciente a
 * la más vieja, con su propio scroll: es una lista que crece todos los días y
 * no puede empujar el formulario fuera de la pantalla.
 *
 * Eliminar es un borrado lógico y pide confirmación con un segundo clic
 * explícito —no un `window.confirm`, que se sale del sistema visual—. Guardar
 * cualquier cambio refresca las métricas del rango activo: el CPA, el ROAS, la
 * ganancia neta y el margen neto se recalculan solos.
 */
export default function ModalAdSpend({
  filas,
  onCerrar,
  onGuardado,
}: {
  filas: AdSpendFila[];
  onCerrar: () => void;
  /** Vuelve a pedir los datos del panel tras un cambio. */
  onGuardado: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  const [editando, setEditando] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoyAsuncion());
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const c = ADMIN.adSpend;
  const sucio = monto.trim().length > 0 || nota.trim().length > 0 || editando !== null;

  const limpiar = () => {
    setEditando(null);
    setFecha(hoyAsuncion());
    setMonto("");
    setNota("");
    setCampos({});
  };

  const guardar = () => {
    if (pendiente) return;
    setAviso(null);
    setCampos({});

    iniciar(async () => {
      const r = await guardarAdSpend({ id: editando ?? undefined, fecha, monto, nota });
      if (r.ok) {
        limpiar();
        setAviso({ ok: true, texto: r.mensaje });
        onGuardado();
        refrescarPanel(router);
      } else {
        setCampos(r.campos ?? {});
        setAviso({ ok: false, texto: r.error });
      }
    });
  };

  const eliminar = (id: string) => {
    if (pendiente) return;
    setAviso(null);

    iniciar(async () => {
      const r = await archivarAdSpend({ id });
      setConfirmando(null);
      setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (r.ok) {
        if (editando === id) limpiar();
        onGuardado();
        refrescarPanel(router);
      }
    });
  };

  const editar = (f: AdSpendFila) => {
    setEditando(f.id);
    setFecha(f.fecha);
    setMonto(String(f.monto));
    setNota(f.nota ?? "");
    setCampos({});
    setAviso(null);
  };

  return (
    <Capa
      eyebrow={c.eyebrow}
      titulo={c.titulo}
      cerrarEtiqueta={ADMIN.formulario.cerrar}
      onCerrar={onCerrar}
      puedeCerrar={() => !sucio || window.confirm(ADMIN.formulario.salirSinGuardar)}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[12.5px] leading-[1.55] text-gris-oscuro">{c.intro}</p>

        <Seccion titulo={editando ? c.editar : c.agregar}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta={c.fecha}
                tipo="date"
                valor={fecha}
                error={campos.fecha}
                deshabilitado={pendiente}
                onCambio={setFecha}
              />
              <Campo
                etiqueta={c.monto}
                valor={monto}
                modo="numeric"
                placeholder="0"
                error={campos.monto}
                deshabilitado={pendiente}
                onCambio={setMonto}
              />
            </div>

            <CampoTexto
              etiqueta={c.nota}
              filas={2}
              valor={nota}
              placeholder={c.notaPlaceholder}
              deshabilitado={pendiente}
              onCambio={setNota}
            />

            <div className="flex flex-wrap gap-2">
              <BotonPrimario onClick={guardar} ocupado={pendiente}>
                {pendiente
                  ? c.agregando
                  : editando
                    ? c.guardarEdicion
                    : c.agregar}
              </BotonPrimario>
              {editando && (
                <BotonSecundario onClick={limpiar} deshabilitado={pendiente}>
                  {c.cancelarEdicion}
                </BotonSecundario>
              )}
            </div>
          </div>
        </Seccion>

        {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}

        <Seccion titulo={c.historial}>
          {filas.length === 0 ? (
            <p className="m-0 text-[12.5px] text-gris-oscuro">{c.sinHistorial}</p>
          ) : (
            /* Scroll propio: la lista crece todos los días y no puede empujar
               el formulario fuera de la pantalla. */
            <ul className="m-0 max-h-[280px] list-none space-y-2 overflow-y-auto overscroll-contain p-0">
              {filas.map((f) => (
                <li
                  key={f.id}
                  className="rounded-strip border-hairline border-borde-claro bg-hueso px-3 py-[10px]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-gris-oscuro">
                      {fmtFechaCorta(f.fecha)}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-tinta">
                      {fmtGs(f.monto)}
                    </span>
                  </div>

                  {f.nota && (
                    <p className="m-0 mt-[4px] text-[11.5px] leading-[1.4] text-gris-oscuro">
                      {f.nota}
                    </p>
                  )}

                  {confirmando === f.id ? (
                    <div className="mt-[10px]">
                      <p className="m-0 text-[12px] leading-[1.45] text-tinta">{c.confirmar}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => eliminar(f.id)}
                          disabled={pendiente}
                          className="min-h-11 rounded-pill border-hairline border-estado-rojo-borde bg-estado-rojo-fondo px-[16px] py-[8px] font-inter text-[12px] font-semibold text-estado-rojo-texto transition-colors duration-control ease-grit hover:bg-estado-rojo-borde disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendiente ? c.eliminando : c.si}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmando(null)}
                          disabled={pendiente}
                          className="min-h-11 rounded-pill border-hairline border-borde-claro bg-superficie-input px-[16px] py-[8px] font-inter text-[12px] font-semibold text-tinta transition-colors duration-control ease-grit hover:bg-bone-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {c.no}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-[8px] flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => editar(f)}
                        disabled={pendiente}
                        className="min-h-11 rounded-strip text-left font-inter text-[12px] font-semibold text-tierra-oscura underline-offset-2 transition-colors duration-control ease-grit hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {c.editar}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmando(f.id)}
                        disabled={pendiente}
                        className="min-h-11 rounded-strip text-left font-inter text-[12px] font-semibold text-gris-oscuro underline-offset-2 transition-colors duration-control ease-grit hover:text-tinta hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {c.eliminar}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="m-0 mt-3 text-[11.5px] leading-[1.5] text-gris-oscuro">{c.nota_borrado}</p>
        </Seccion>
      </div>
    </Capa>
  );
}
