"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Capa from "@/components/admin/Capa";
import Aviso from "@/components/admin/Aviso";
import {
  BotonPrimario,
  BotonSecundario,
  Campo,
  CampoCheck,
  CampoSelect,
  CampoTexto,
  Seccion,
} from "@/components/admin/Campos";
import { crearPedidoManual } from "@/app/admin/acciones-panel";
import { ETIQUETA_ENTREGA, ETIQUETA_PAGO, fmtGs, fmtNumero } from "@/lib/admin-formato";
import { ENTREGAS_VISIBLES, PAGOS_VISIBLES, aEntero } from "@/lib/admin-mutaciones";
import {
  QTY_LINEA_MAX,
  totalesManual,
  type LineaManual,
  type MetodoManual,
} from "@/lib/admin-pedido-manual";
import { hoyAsuncion } from "@/lib/admin-rango";
import { ADMIN } from "@/lib/admin-content";
import { ENVIOS, PRODUCTO_BUNDLES, VIP, type BundleId, type ZonaId } from "@/lib/content";

/**
 * Alta de un pedido cargado a mano.
 *
 * PRODUCTOS, NO UN MODELO
 *   El pedido se arma con líneas del catálogo real —packs de 1, 2 y 3— y se
 *   pueden agregar todas las que haga falta. No se asume un único producto ni
 *   se escriben precios a mano: los precios salen de `lib/content.ts`, los
 *   mismos que cobra el ecommerce. Lo único que se elige es qué y cuánto.
 *
 * EL RESUMEN NO ES DECORATIVO
 *   Lo calcula `totalesManual()`, exactamente la misma función que usa el
 *   servidor al guardar. El total que se ve acá es el total que queda en la
 *   base; el formulario no lo envía y el servidor no lo aceptaría.
 *
 * COSTOS
 *   Ni el costo de producto ni el logístico aparecen en este formulario: los
 *   congela la base leyendo `business_settings` al crear el pedido.
 */

const ZONAS: { id: ZonaId; etiqueta: string }[] = [
  { id: "asuncion", etiqueta: ENVIOS.asuncion.nombre },
  { id: "interior", etiqueta: ENVIOS.interior.nombre },
];

const PACKS = PRODUCTO_BUNDLES.map((b) => ({ id: b.id, etiqueta: b.nombreLargo }));

const OPCIONES_PAGO = PAGOS_VISIBLES.map((v) => ({ id: v, etiqueta: ETIQUETA_PAGO[v] }));
const OPCIONES_ENTREGA = ENTREGAS_VISIBLES.map((v) => ({
  id: v,
  etiqueta: ETIQUETA_ENTREGA[v],
}));

export default function ModalPedidoManual({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const c = ADMIN.manual;

  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [zona, setZona] = useState<ZonaId>("asuncion");

  const [lineas, setLineas] = useState<LineaManual[]>([{ packId: "2", qty: 1 }]);
  const [extra, setExtra] = useState(false);

  const [envio, setEnvio] = useState(String(ENVIOS.asuncion.costo));
  const [descuento, setDescuento] = useState("");
  const [vip, setVip] = useState(false);

  const [metodoPago, setMetodoPago] = useState<MetodoManual>("transferencia");
  const [pago, setPago] = useState<(typeof PAGOS_VISIBLES)[number]>("pendiente");
  const [entrega, setEntrega] = useState<(typeof ENTREGAS_VISIBLES)[number]>("pendiente");
  const [saleDate, setSaleDate] = useState(hoyAsuncion());
  const [notas, setNotas] = useState("");

  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  // Una vez creado, el formulario se cierra: para cargar otro hay que decirlo.
  const [creado, setCreado] = useState(false);

  /* --- Clave de idempotencia ---------------------------------------------
     Identifica el INTENTO, no el clic: si el primer envío llegó al servidor
     pero la respuesta se perdió, el reintento devuelve el pedido ya creado en
     lugar de duplicarlo. La clave se renueva ÚNICAMENTE cuando alguien pide
     cargar otro pedido, nunca sola: así, apretar «Crear pedido» dos veces con
     el mismo formulario no puede terminar en dos pedidos iguales.          */
  const claveRef = useRef<string>("");
  if (claveRef.current === "") claveRef.current = crypto.randomUUID();

  const totales = useMemo(
    () =>
      totalesManual({
        lineas,
        extra,
        envio: aEntero(envio) ?? 0,
        descuento: aEntero(descuento) ?? 0,
        vip,
      }),
    [lineas, extra, envio, descuento, vip],
  );

  const sucio =
    nombre.trim() !== "" ||
    whatsapp.trim() !== "" ||
    ciudad.trim() !== "" ||
    direccion.trim() !== "" ||
    notas.trim() !== "";

  const cambiarZona = (z: ZonaId) => {
    setZona(z);
    // El envío se precarga con la tarifa de la zona, pero queda editable: un
    // pedido manual puede haberse entregado en mano o con otro acuerdo.
    setEnvio(String(ENVIOS[z].costo));
  };

  const crear = () => {
    if (pendiente) return;
    setAviso(null);
    setCampos({});

    iniciar(async () => {
      const r = await crearPedidoManual({
        idempotencyKey: claveRef.current,
        cliente: { nombre, whatsapp, ciudad, direccion, ubicacion },
        zona,
        lineas,
        extra,
        envio,
        descuento,
        vip,
        metodoPago,
        pago,
        entrega,
        saleDate,
        notas,
      });

      if (r.ok) {
        setAviso({ ok: true, texto: r.mensaje });
        setCreado(true);
        router.refresh();
      } else {
        setCampos(r.campos ?? {});
        setAviso({ ok: false, texto: r.error });
      }
    });
  };

  /** Vacía el formulario y arranca un intento nuevo, con otra clave. */
  const otroPedido = () => {
    claveRef.current = crypto.randomUUID();
    setCreado(false);
    setAviso(null);
    setCampos({});
    setNombre("");
    setWhatsapp("");
    setCiudad("");
    setDireccion("");
    setUbicacion("");
    setLineas([{ packId: "2", qty: 1 }]);
    setExtra(false);
    setDescuento("");
    setVip(false);
    setNotas("");
  };

  return (
    <Capa
      variante="modal-ancho"
      eyebrow={c.eyebrow}
      titulo={c.titulo}
      cerrarEtiqueta={ADMIN.formulario.cerrar}
      onCerrar={onCerrar}
      puedeCerrar={() => creado || !sucio || window.confirm(ADMIN.formulario.salirSinGuardar)}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[12.5px] leading-[1.55] text-gris-oscuro">{c.intro}</p>

        {/* --- Cliente --------------------------------------------------- */}
        <Seccion titulo={c.cliente}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              etiqueta={c.nombre}
              valor={nombre}
              error={campos["cliente.nombre"]}
              deshabilitado={pendiente}
              onCambio={setNombre}
            />
            <Campo
              etiqueta={c.whatsapp}
              valor={whatsapp}
              error={campos["cliente.whatsapp"]}
              deshabilitado={pendiente}
              placeholder="0991 234 567"
              onCambio={setWhatsapp}
            />
            <Campo
              etiqueta={c.ciudad}
              valor={ciudad}
              error={campos["cliente.ciudad"]}
              deshabilitado={pendiente}
              onCambio={setCiudad}
            />
            <CampoSelect
              etiqueta={c.zona}
              valor={zona}
              opciones={ZONAS}
              error={campos.zona}
              deshabilitado={pendiente}
              onCambio={cambiarZona}
            />
            <Campo
              etiqueta={c.direccion}
              valor={direccion}
              error={campos["cliente.direccion"]}
              deshabilitado={pendiente}
              className="sm:col-span-2"
              onCambio={setDireccion}
            />
            <Campo
              etiqueta={c.ubicacion}
              tipo="url"
              valor={ubicacion}
              placeholder={c.ubicacionPlaceholder}
              error={campos["cliente.ubicacion"]}
              deshabilitado={pendiente}
              className="sm:col-span-2"
              onCambio={setUbicacion}
            />
          </div>
        </Seccion>

        {/* --- Productos ------------------------------------------------- */}
        <Seccion titulo={c.productos}>
          <div className="flex flex-col gap-3">
            {lineas.map((l, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <CampoSelect
                  etiqueta={`${c.productos} ${i + 1}`}
                  valor={l.packId}
                  opciones={PACKS}
                  error={campos[`lineas.${i}.packId`]}
                  deshabilitado={pendiente}
                  className="min-w-[180px] flex-1"
                  onCambio={(v: BundleId) =>
                    setLineas(lineas.map((x, j) => (j === i ? { ...x, packId: v } : x)))
                  }
                />
                <Campo
                  etiqueta={c.cantidad}
                  valor={String(l.qty)}
                  modo="numeric"
                  error={campos[`lineas.${i}.qty`]}
                  deshabilitado={pendiente}
                  className="w-[92px]"
                  onCambio={(v) => {
                    const n = aEntero(v);
                    setLineas(
                      lineas.map((x, j) =>
                        j === i
                          ? { ...x, qty: n === null ? x.qty : Math.min(QTY_LINEA_MAX, Math.max(1, n)) }
                          : x,
                      ),
                    );
                  }}
                />
                {lineas.length > 1 && (
                  <BotonSecundario
                    deshabilitado={pendiente}
                    onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                  >
                    {c.quitarLinea}
                  </BotonSecundario>
                )}
              </div>
            ))}

            {campos.lineas && (
              <p className="m-0 text-[11.5px] text-estado-rojo-texto">{campos.lineas}</p>
            )}

            <div>
              <BotonSecundario
                deshabilitado={pendiente}
                onClick={() => setLineas([...lineas, { packId: "1", qty: 1 }])}
              >
                {c.agregarLinea}
              </BotonSecundario>
            </div>

            <CampoCheck
              etiqueta={`${c.extra} — ${fmtGs(70000)}`}
              ayuda={c.extraDetalle}
              valor={extra}
              deshabilitado={pendiente}
              onCambio={setExtra}
            />
          </div>
        </Seccion>

        {/* --- Cobro ------------------------------------------------------ */}
        <Seccion titulo={c.cobro}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              etiqueta={c.envioCobrado}
              ayuda={c.envioAyuda}
              valor={envio}
              modo="numeric"
              error={campos.envio}
              deshabilitado={pendiente}
              onCambio={setEnvio}
            />
            <Campo
              etiqueta={c.descuento}
              valor={descuento}
              modo="numeric"
              placeholder="0"
              error={campos.descuento}
              deshabilitado={pendiente}
              onCambio={setDescuento}
            />
            <CampoCheck
              etiqueta={`${c.vip} — ${fmtGs(VIP.costo)}`}
              ayuda={VIP.detalle}
              valor={vip}
              deshabilitado={pendiente}
              className="sm:col-span-2"
              onCambio={setVip}
            />
          </div>
        </Seccion>

        {/* --- Estados ---------------------------------------------------- */}
        <Seccion titulo={c.estados}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CampoSelect
              etiqueta={c.metodo}
              valor={metodoPago}
              opciones={c.metodos as readonly { id: MetodoManual; etiqueta: string }[]}
              error={campos.metodoPago}
              deshabilitado={pendiente}
              onCambio={setMetodoPago}
            />
            <Campo
              etiqueta={c.fecha}
              tipo="date"
              valor={saleDate}
              error={campos.saleDate}
              deshabilitado={pendiente}
              onCambio={setSaleDate}
            />
            <CampoSelect
              etiqueta={c.pago}
              valor={pago}
              opciones={OPCIONES_PAGO}
              error={campos.pago}
              deshabilitado={pendiente}
              onCambio={setPago}
            />
            <CampoSelect
              etiqueta={c.entrega}
              valor={entrega}
              opciones={OPCIONES_ENTREGA}
              error={campos.entrega}
              deshabilitado={pendiente}
              onCambio={setEntrega}
            />
            <CampoTexto
              etiqueta={c.notas}
              filas={2}
              valor={notas}
              deshabilitado={pendiente}
              className="sm:col-span-2"
              onCambio={setNotas}
            />
          </div>
        </Seccion>

        {/* --- Resumen ---------------------------------------------------- */}
        <Seccion titulo={c.resumen}>
          <div className="flex flex-col gap-[10px]">
            <Linea etiqueta={c.pulseras}>{fmtNumero(totales.unidades)}</Linea>
            <Linea etiqueta={c.subtotal}>{fmtGs(totales.subtotal)}</Linea>
            {totales.descuento > 0 && (
              <Linea etiqueta={c.descuentoResumen}>− {fmtGs(totales.descuento)}</Linea>
            )}
            <Linea etiqueta={c.envio}>{fmtGs(totales.envio)}</Linea>
            {totales.vipCosto > 0 && (
              <Linea etiqueta={c.vipResumen}>{fmtGs(totales.vipCosto)}</Linea>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t border-borde-claro pt-3">
              <span className="text-[12.5px] font-semibold text-tinta">{c.total}</span>
              <span className="text-[15px] font-bold tabular-nums text-tinta">
                {fmtGs(totales.total)}
              </span>
            </div>
          </div>
        </Seccion>

        <div className="flex flex-wrap gap-2">
          {creado ? (
            <BotonPrimario onClick={otroPedido}>{c.otro}</BotonPrimario>
          ) : (
            <BotonPrimario onClick={crear} ocupado={pendiente}>
              {pendiente ? c.creando : c.crear}
            </BotonPrimario>
          )}
          <BotonSecundario onClick={onCerrar} deshabilitado={pendiente}>
            {creado ? ADMIN.formulario.cerrar : ADMIN.formulario.cancelar}
          </BotonSecundario>
        </div>

        <p className="m-0 text-[11.5px] leading-[1.5] text-gris-oscuro">{c.sinTelegram}</p>

        {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
      </div>
    </Capa>
  );
}

function Linea({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12.5px] text-gris-oscuro">{etiqueta}</span>
      <span className="text-[13px] tabular-nums text-tinta">{children}</span>
    </div>
  );
}
