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
 * Tintes de estado. Cada uno es fondo suave + texto oscuro del mismo tono +
 * borde apenas más marcado que el fondo, para que la píldora tenga cuerpo sin
 * pesar. Contrastes texto/fondo verificados:
 *   amarillo 6,30:1 · verde 7,05:1 · rojo 6,43:1 · azul 7,05:1 · violeta 7,41:1
 *
 * El color acompaña, no informa: la píldora siempre dice el estado con todas
 * las letras, así que sigue leyéndose sin distinguir tonos.
 */
const TINTE = {
  amarillo: "bg-estado-amarillo-fondo text-estado-amarillo-texto border-estado-amarillo-borde",
  verde: "bg-estado-verde-fondo text-estado-verde-texto border-estado-verde-borde",
  rojo: "bg-estado-rojo-fondo text-estado-rojo-texto border-estado-rojo-borde",
  azul: "bg-estado-azul-fondo text-estado-azul-texto border-estado-azul-borde",
  violeta: "bg-estado-violeta-fondo text-estado-violeta-texto border-estado-violeta-borde",
  neutro: "bg-hueso text-gris-oscuro border-borde-claro",
} as const;

const PALETA_PAGO: Record<EstadoPago, string> = {
  pendiente: TINTE.amarillo,
  pagado: TINTE.verde,
  cancelado: TINTE.rojo,
};

const PALETA_ENTREGA: Record<EstadoEntrega, string> = {
  pendiente: TINTE.amarillo,
  preparado: TINTE.azul,
  enviado: TINTE.violeta,
  entregado: TINTE.verde,
  cancelado: TINTE.rojo,
};

/** Mismos estilos en la tabla y en el detalle: una sola definición. */
export const PILDORA =
  "inline-flex items-center rounded-pill border-hairline px-[10px] py-[4px] font-inter text-[11px] font-semibold leading-none";

export function PildoraPago({ estado }: { estado: string | null }) {
  const e = normalizarPago(estado);
  return <span className={`${PILDORA} ${PALETA_PAGO[e]}`}>{ETIQUETA_PAGO[e]}</span>;
}

export function PildoraEntrega({ estado }: { estado: string | null }) {
  const e = normalizarEntrega(estado);
  return <span className={`${PILDORA} ${PALETA_ENTREGA[e]}`}>{ETIQUETA_ENTREGA[e]}</span>;
}

/** Marca de pedido archivado. Neutra: no es un estado del pedido, es su estante. */
export function PildoraArchivado() {
  return <span className={`${PILDORA} ${TINTE.neutro}`}>Archivado</span>;
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
