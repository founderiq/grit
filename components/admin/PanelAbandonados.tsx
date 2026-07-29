import { obtenerAbandonados, type AbandonadoFila } from "@/lib/admin-datos";
import {
  describirSeleccion,
  enlaceWhatsapp,
  fmtFechaHora,
} from "@/lib/admin-formato";
import type { FiltrosPedidos } from "@/lib/admin-filtros";
import { ADMIN } from "@/lib/admin-content";
import Paginacion from "@/components/admin/Paginacion";
import BotonArchivarAbandonado from "@/components/admin/BotonArchivarAbandonado";
import { EstadoVacio, PanelError, PILDORA } from "@/components/admin/Piezas";

/**
 * Checkouts abandonados.
 *
 * Cada fila es alguien que empezó el checkout, dejó su nombre y su WhatsApp, y
 * no confirmó. Los captura `POST /api/checkout-abandonado` desde el propio
 * checkout público; los que sí terminaron quedan marcados como convertidos por
 * el servidor al crear el pedido.
 *
 * El paso se guarda con su nombre técnico y se traduce acá: el panel es para
 * personas, y "seleccion" en una celda no significa nada.
 */
export default async function PanelAbandonados({
  filtros,
  params,
}: {
  filtros: FiltrosPedidos;
  params: Record<string, string>;
}) {
  const res = await obtenerAbandonados(filtros);

  if (!res.ok) return <PanelError />;

  const { filas, total, pagina } = res.datos;

  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo={ADMIN.panel.vacio.abandonados}
        detalle={ADMIN.panel.vacio.abandonadosDetalle}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-y border-borde-claro">
              {[
                "Cliente",
                "WhatsApp",
                "Ciudad",
                "Selección",
                "Paso",
                "Estado",
                "Actualizado",
                "Archivo",
              ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-[10px] font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-gris-oscuro first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6"
                  >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.map((f) => (
              <Fila key={f.id} c={f} />
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} total={total} params={params} />
    </>
  );
}

function Fila({ c }: { c: AbandonadoFila }) {
  const celda =
    "px-4 py-[13px] align-middle text-[13px] text-tinta first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6";

  const wa = enlaceWhatsapp(c.whatsapp);
  const convertido = c.estado === "converted";
  const t = ADMIN.abandonados;

  return (
    <tr className="border-b border-borde-claro last:border-b-0">
      <td className={`${celda} font-semibold`}>
        {c.cliente?.trim() || (
          <span className="font-normal text-gris-oscuro">{t.sinNombre}</span>
        )}
        {c.archivado && (
          <span className={`${PILDORA} ml-2 border-borde-claro bg-hueso align-middle text-gris-oscuro`}>
            {t.archivado}
          </span>
        )}
      </td>

      {/* El link solo se arma con un número válido: uno incompleto daría un
          wa.me roto, que es peor que no ofrecer el enlace. */}
      <td className={celda}>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tierra-oscura underline underline-offset-2 transition-colors duration-control ease-grit hover:text-tinta"
          >
            {c.whatsapp}
          </a>
        ) : (
          <span className="text-gris-oscuro">{c.whatsapp?.trim() || "—"}</span>
        )}
      </td>

      <td className={celda}>{c.ciudad?.trim() || <span className="text-gris-oscuro">—</span>}</td>

      <td className={celda}>
        {describirSeleccion({
          pack_id: c.packId,
          pack_qty: c.packQty,
          has_extra: c.hasExtra,
        })}
      </td>

      <td className={celda}>
        {c.paso ? (
          (t.pasos[c.paso] ?? c.paso)
        ) : (
          <span className="text-gris-oscuro">—</span>
        )}
      </td>

      <td className={celda}>
        <span
          className={`${PILDORA} ${
            convertido
              ? "bg-estado-verde-fondo text-estado-verde-texto border-estado-verde-borde"
              : "bg-estado-amarillo-fondo text-estado-amarillo-texto border-estado-amarillo-borde"
          }`}
        >
          {convertido ? t.convertido : t.abandonado}
        </span>
      </td>

      <td className={`${celda} whitespace-nowrap text-gris-oscuro`}>
        {fmtFechaHora(c.actualizado)}
      </td>

      <td className={celda}>
        <BotonArchivarAbandonado id={c.id} archivado={c.archivado} />
      </td>
    </tr>
  );
}
