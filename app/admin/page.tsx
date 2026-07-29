import { Suspense } from "react";
import Logo from "@/components/Logo";
import AdminLogin from "@/components/admin/AdminLogin";
import CerrarSesion from "@/components/admin/CerrarSesion";
import AccionesPanel from "@/components/admin/AccionesPanel";
import FiltrosListado from "@/components/admin/FiltrosListado";
import HeaderAdmin from "@/components/admin/HeaderAdmin";
import PanelAbandonados from "@/components/admin/PanelAbandonados";
import PanelMetricas from "@/components/admin/PanelMetricas";
import PanelPedidos from "@/components/admin/PanelPedidos";
import SelectorRango from "@/components/admin/SelectorRango";
import DrawerPedidos from "@/components/admin/DrawerPedidos";
import {
  EncabezadoPanel,
  EsqueletoMetricas,
  EsqueletoTabla,
  Panel,
} from "@/components/admin/Piezas";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { resolverFiltros } from "@/lib/admin-filtros";
import { esUuid } from "@/lib/pedidos";
import { resolverRango } from "@/lib/admin-rango";
import { ADMIN } from "@/lib/admin-content";

/**
 * /admin — panel administrativo.
 *
 * Es un Server Component: qué se muestra y qué datos se leen se deciden en el
 * servidor, antes de mandar nada al navegador. No hay una versión "completa"
 * escondida detrás de un `if` del cliente, así que no hay nada que revelar
 * desactivando JavaScript o mirando el bundle. El navegador tampoco podría
 * leer los pedidos por su cuenta: con RLS activo y cero políticas, `anon` y
 * `authenticated` no tienen acceso a ninguna tabla.
 *
 * Tres estados, resueltos por `obtenerEstadoAdmin()`:
 *   · sin sesión  → login dentro de /admin
 *   · sin permiso → "Acceso no autorizado"
 *   · autorizado  → dashboard
 *
 * El estado del panel —rango, filtros, pestaña, página— vive en la URL, así que
 * cada cambio vuelve al servidor y filtra en SQL. Los dos `<Suspense>` hacen
 * que las métricas y el listado se carguen por separado: una consulta lenta no
 * bloquea a la otra, y mientras tanto se ve su esqueleto.
 *
 * `force-dynamic` porque la respuesta depende de la sesión y de los query
 * params: esta ruta no se prerenderiza ni se cachea nunca.
 */
export const dynamic = "force-dynamic";

type ParamsCrudos = Record<string, string | string[] | undefined>;

/** Un query param repetido (`?pago=a&pago=b`) se queda con el primero. */
function aplanar(crudos: ParamsCrudos): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(crudos)) {
    const v = Array.isArray(valor) ? valor[0] : valor;
    if (typeof v === "string" && v.length > 0) salida[clave] = v;
  }
  return salida;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<ParamsCrudos>;
}) {
  const acceso = await obtenerEstadoAdmin();

  if (acceso.estado === "sin_configuracion") {
    return (
      <Aviso titulo={ADMIN.sinConfiguracion.titulo} detalle={ADMIN.sinConfiguracion.detalle} />
    );
  }

  if (acceso.estado === "sin_sesion") {
    return <AdminLogin logo={<Logo variante="auth" sobre="claro" />} />;
  }

  if (acceso.estado === "no_autorizado") {
    return (
      <Aviso
        titulo={ADMIN.noAutorizado.titulo}
        detalle={ADMIN.noAutorizado.detalle}
        pie={acceso.email}
        conSalida
      />
    );
  }

  /* --- Autorizado: se leen los parámetros y se arma el panel -------------- */
  const params = aplanar(await searchParams);
  const rango = resolverRango(params);
  const filtros = resolverFiltros(params);

  // El pedido abierto viaja en la URL. Se valida como UUID acá para no pasarle
  // basura al drawer: `?pedido=` lo puede escribir cualquiera. Solo importa al
  // cargar la página; después el drawer maneja la URL por su cuenta.
  const pedidoAbierto = esUuid(params.pedido) ? params.pedido : null;

  // Las claves de Suspense hacen reaparecer el esqueleto cuando cambia lo que
  // se está pidiendo, en lugar de dejar los datos viejos en pantalla.
  const claveMetricas = `${rango.id}|${rango.desde}|${rango.hasta}`;
  const claveListado = [
    claveMetricas,
    filtros.tab,
    filtros.busqueda,
    filtros.pago,
    filtros.entrega,
    filtros.origen,
    filtros.archivo,
    filtros.pagina,
  ].join("|");

  return (
    /* El drawer del detalle envuelve todo el panel: las filas de la tabla lo
       abren por contexto, sin navegar. Ver components/admin/DrawerPedidos.tsx. */
    <DrawerPedidos pedidoInicial={pedidoAbierto}>
      <div className="grit-on-light flex min-h-screen flex-col bg-hueso text-tinta">
        <HeaderAdmin usuario={acceso.nombre ?? acceso.email ?? ""} />

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-gris-oscuro">
                {ADMIN.panel.eyebrow}
              </p>
              <h1 className="m-0 mt-[6px] font-archivo text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em] lg:text-[28px]">
                {ADMIN.panel.titulo}
                <span className="text-tierra-oscura">.</span>
              </h1>
            </div>

            <AccionesPanel />
          </div>

          {/* --- Métricas ------------------------------------------------- */}
          <Panel className="mt-7">
            <EncabezadoPanel
              eyebrow={ADMIN.panel.metricas.eyebrow}
              titulo={ADMIN.panel.metricas.titulo}
              detalle={ADMIN.panel.metricas.detalle}
              derecha={<SelectorRango rango={rango} params={params} />}
            />

            <Suspense key={claveMetricas} fallback={<EsqueletoMetricas />}>
              <PanelMetricas rango={rango} />
            </Suspense>
          </Panel>

          {/* --- Listado -------------------------------------------------- */}
          <Panel className="mt-5">
            <div className="px-5 pb-4 pt-5 lg:px-6 lg:pt-6">
              <FiltrosListado filtros={filtros} params={params} />
            </div>

            <Suspense key={claveListado} fallback={<EsqueletoTabla />}>
              {filtros.tab === "pedidos" ? (
                <PanelPedidos rango={rango} filtros={filtros} params={params} />
              ) : (
                <PanelAbandonados filtros={filtros} params={params} />
              )}
            </Suspense>
          </Panel>
        </main>
      </div>
    </DrawerPedidos>
  );
}


/**
 * Pantalla neutra para los estados que no muestran el panel. Deliberadamente
 * no explica por qué falta el permiso ni qué habría que cumplir.
 */
function Aviso({
  titulo,
  detalle,
  pie,
  conSalida = false,
}: {
  titulo: string;
  detalle: string;
  pie?: string | null;
  conSalida?: boolean;
}) {
  return (
    <div className="grit-on-light flex min-h-screen flex-col items-center justify-center bg-hueso px-5 py-12 text-tinta">
      <div className="w-full max-w-[420px]">
        <Logo variante="auth" sobre="claro" />

        <h1 className="m-0 mt-6 font-archivo text-[22px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] lg:text-[26px]">
          {titulo}
          <span className="text-tierra-oscura">.</span>
        </h1>
        <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-gris-oscuro">{detalle}</p>

        {pie && (
          <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-gris-oscuro">
            {pie}
          </p>
        )}

        {conSalida && (
          <div className="mt-6">
            <CerrarSesion />
          </div>
        )}
      </div>
    </div>
  );
}
