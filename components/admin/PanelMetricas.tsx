import { obtenerMetricas } from "@/lib/admin-datos";
import {
  fmtGs,
  fmtMultiplo,
  fmtNumero,
  fmtPedidos,
  fmtPorcentaje,
} from "@/lib/admin-formato";
import type { Metricas } from "@/lib/admin-metricas";
import type { Rango } from "@/lib/admin-rango";
import { GrillaMetricas, PanelError, TarjetaMetrica } from "@/components/admin/Piezas";

/**
 * Las catorce métricas del período.
 *
 * Es un Server Component asíncrono: la consulta corre en el servidor, con la
 * service role, y al navegador solo llegan los números ya formateados. Envuelto
 * en `<Suspense>` desde la página, mientras tanto se ve el esqueleto.
 */
export default async function PanelMetricas({ rango }: { rango: Rango }) {
  const res = await obtenerMetricas(rango);

  if (!res.ok) return <PanelError />;

  return (
    <GrillaMetricas>
      {tarjetas(res.datos).map((t) => (
        <TarjetaMetrica key={t.etiqueta} etiqueta={t.etiqueta} valor={t.valor} />
      ))}
    </GrillaMetricas>
  );
}

/**
 * Orden de lectura: primero el volumen, después la plata que entra, después lo
 * que cuesta, después la publicidad y al final el resultado y el origen.
 */
function tarjetas(m: Metricas): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: "Pedidos confirmados", valor: fmtNumero(m.pedidosConfirmados) },
    { etiqueta: "Ingreso total", valor: fmtGs(m.ingresoTotal) },
    { etiqueta: "AOV", valor: fmtGs(m.aov) },
    { etiqueta: "Cancelados", valor: fmtNumero(m.cancelados) },

    { etiqueta: "Costo producto/logística", valor: fmtGs(m.costoProductoLogistica) },
    { etiqueta: "Ganancia bruta", valor: fmtGs(m.gananciaBruta) },
    { etiqueta: "Margen bruto", valor: fmtPorcentaje(m.margenBruto) },
    { etiqueta: "Ad Spend", valor: fmtGs(m.adSpend) },

    { etiqueta: "CPA calculado", valor: fmtGs(m.cpa) },
    { etiqueta: "ROAS", valor: fmtMultiplo(m.roas) },
    { etiqueta: "Ganancia neta", valor: fmtGs(m.gananciaNeta) },
    { etiqueta: "Margen neto", valor: fmtPorcentaje(m.margenNeto) },

    { etiqueta: "Pedidos web", valor: fmtPedidos(m.pedidosWeb) },
    { etiqueta: "Pedidos manuales", valor: fmtPedidos(m.pedidosManuales) },
  ];
}
