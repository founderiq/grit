/**
 * Piezas visuales del panel: tarjetas, píldoras de estado, vacíos, errores y
 * esqueletos de carga.
 *
 * Todas son de servidor y sin estado. El panel es light mode: fondo hueso,
 * superficies en `superficie-input`, negro como color principal y el naranja
 * de Grit solo como acento.
 *
 * Los estados NUNCA se distinguen solo por color: la píldora dice "Pagado" o
 * "Cancelado" con todas las letras, y el color acompaña.
 */
import {
  ETIQUETA_ENTREGA,
  ETIQUETA_PAGO,
  normalizarEntrega,
  normalizarPago,
  type EstadoEntrega,
  type EstadoPago,
} from "@/lib/admin-formato";
import { ADMIN } from "@/lib/admin-content";

/* ------------------------------------------------------------
   Contenedores
   ------------------------------------------------------------ */

/** Tarjeta grande: la de métricas y la del listado. */
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border-hairline border-borde-claro bg-superficie-input ${className}`}
    >
      {children}
    </section>
  );
}

export function EncabezadoPanel({
  eyebrow,
  titulo,
  detalle,
  derecha,
}: {
  eyebrow: string;
  titulo: string;
  detalle?: string;
  derecha?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 lg:px-6 lg:pt-6">
      <div>
        <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-gris-oscuro">
          {eyebrow}
        </p>
        <h2 className="m-0 mt-[6px] font-archivo text-[17px] font-bold leading-[1.2] tracking-[-0.01em] text-tinta lg:text-[18px]">
          {titulo}
        </h2>
        {detalle && (
          <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-gris-oscuro">{detalle}</p>
        )}
      </div>
      {derecha}
    </div>
  );
}

/* ------------------------------------------------------------
   Métricas
   ------------------------------------------------------------ */

export function TarjetaMetrica({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-strip border-hairline border-borde-claro bg-hueso px-[14px] py-[13px]">
      <p className="m-0 font-mono text-[9px] uppercase leading-[1.3] tracking-[0.1em] text-gris-oscuro">
        {etiqueta}
      </p>
      <p className="m-0 mt-[7px] font-archivo text-[19px] font-bold leading-[1.1] tracking-[-0.01em] text-tinta lg:text-[21px]">
        {valor}
      </p>
    </div>
  );
}

/** Grilla de las catorce métricas. Cuatro columnas en escritorio. */
export function GrillaMetricas({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-6 lg:pb-6">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------
   Píldoras de estado
   ------------------------------------------------------------ */

/**
 * Paletas de las píldoras, todas verificadas sobre el fondo `hueso`:
 *   gris-oscuro   #5C564D  ·  6,27:1
 *   gris-tinta    #3A342E  · 11,58:1
 *   tierra-oscura #7A3B2B  ·  7,29:1
 *   verde-texto   #2F5138  ·  8,48:1
 * "Cancelado" va relleno porque es el único estado excepcional y conviene que
 * se despegue del resto de un vistazo.
 */
const PALETA_PAGO: Record<EstadoPago, string> = {
  pendiente: "border-borde-claro text-gris-oscuro",
  pagado: "border-verde-texto text-verde-texto",
  cancelado: "border-transparent bg-tierra-oscura text-hueso",
};

const PALETA_ENTREGA: Record<EstadoEntrega, string> = {
  pendiente: "border-borde-claro text-gris-oscuro",
  preparado: "border-gris-tinta text-gris-tinta",
  enviado: "border-tierra-oscura text-tierra-oscura",
  entregado: "border-verde-texto text-verde-texto",
  cancelado: "border-transparent bg-tierra-oscura text-hueso",
};

const PILDORA =
  "inline-flex items-center rounded-pill border-hairline px-[10px] py-[4px] font-inter text-[11px] font-semibold leading-none";

export function PildoraPago({ estado }: { estado: string | null }) {
  const e = normalizarPago(estado);
  return <span className={`${PILDORA} ${PALETA_PAGO[e]}`}>{ETIQUETA_PAGO[e]}</span>;
}

export function PildoraEntrega({ estado }: { estado: string | null }) {
  const e = normalizarEntrega(estado);
  return <span className={`${PILDORA} ${PALETA_ENTREGA[e]}`}>{ETIQUETA_ENTREGA[e]}</span>;
}

/** Marca de pedido archivado. Solo aparece cuando se piden los archivados. */
export function PildoraArchivado() {
  return (
    <span className={`${PILDORA} border-borde-claro text-gris-oscuro`}>Archivado</span>
  );
}

/* ------------------------------------------------------------
   Vacío y error
   ------------------------------------------------------------ */

export function EstadoVacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="px-5 py-14 text-center lg:px-6">
      <p className="m-0 font-archivo text-[15px] font-bold text-tinta">{titulo}</p>
      {detalle && (
        <p className="m-0 mx-auto mt-2 max-w-[380px] text-[13px] leading-[1.6] text-gris-oscuro">
          {detalle}
        </p>
      )}
    </div>
  );
}

/**
 * Error de carga. No dice qué falló: el detalle queda en el log del servidor.
 * Un código de Supabase o el nombre de una tabla en pantalla no le sirven a
 * nadie del otro lado y sí a quien esté mirando.
 */
export function PanelError() {
  return (
    <div className="px-5 py-14 text-center lg:px-6" role="alert">
      <p className="m-0 font-archivo text-[15px] font-bold text-tierra-oscura">
        {ADMIN.panel.error.titulo}
      </p>
      <p className="m-0 mt-2 text-[13px] leading-[1.6] text-gris-oscuro">
        {ADMIN.panel.error.detalle}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------
   Esqueletos
   ------------------------------------------------------------ */

const BLOQUE = "rounded-strip bg-pista";

/**
 * Los esqueletos se marcan con `aria-hidden` y un `sr-only` que anuncia la
 * carga: un lector de pantalla no gana nada leyendo catorce rectángulos.
 */
export function EsqueletoMetricas() {
  return (
    <>
      <span className="sr-only" role="status">
        Cargando métricas…
      </span>
      <div
        aria-hidden="true"
        className="grid animate-pulse grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-6 lg:pb-6"
      >
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            className="rounded-strip border-hairline border-borde-claro bg-hueso px-[14px] py-[13px]"
          >
            <div className={`${BLOQUE} h-[9px] w-[70%]`} />
            <div className={`${BLOQUE} mt-[10px] h-[18px] w-[55%]`} />
          </div>
        ))}
      </div>
    </>
  );
}

export function EsqueletoTabla({ filas = 6 }: { filas?: number }) {
  return (
    <>
      <span className="sr-only" role="status">
        Cargando datos…
      </span>
      <div aria-hidden="true" className="animate-pulse px-5 pb-5 lg:px-6 lg:pb-6">
        <div className={`${BLOQUE} h-[10px] w-[35%]`} />
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="mt-4 flex items-center gap-4">
            <div className={`${BLOQUE} h-[13px] w-[22%]`} />
            <div className={`${BLOQUE} h-[13px] w-[26%]`} />
            <div className={`${BLOQUE} h-[13px] flex-1`} />
            <div className={`${BLOQUE} h-[13px] w-[12%]`} />
          </div>
        ))}
      </div>
    </>
  );
}
