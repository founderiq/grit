/**
 * Meta Conversions API — envío. SOLO servidor.
 *
 * Es el único lugar del proyecto que lee el access token de Meta y habla con
 * Graph API. `import "server-only"` hace que el build falle si un componente
 * de cliente llegara a importarlo.
 *
 * VARIABLES DE ENTORNO (todas de servidor, nunca NEXT_PUBLIC_)
 *   META_CAPI_ACCESS_TOKEN     Secreta. Token de Conversions API del dataset.
 *   META_DATASET_ID            ID del dataset (el mismo número que el Pixel).
 *   META_CAPI_TEST_EVENT_CODE  Opcional. Si está, TODO envío sale como evento
 *                              de prueba (Test Events) y se registra como tal.
 *                              Se configura solo en Preview.
 *   META_GRAPH_API_VERSION     Versión de Graph API, p. ej. `v27.0`.
 *
 *   Las tres primeras —token, dataset y versión— son OBLIGATORIAS: si falta
 *   cualquiera (o el dataset/versión no tienen un formato válido) no se
 *   intenta ningún envío y el panel recibe un error con los NOMBRES de lo que
 *   falta, nunca con valores.
 *
 * SEGURO CONTRA PRUEBAS EN PRODUCCIÓN, Y AL REVÉS
 *   · Con test code → modo "test": nada cuenta en Meta.
 *   · Sin test code → modo "live", pero SOLO si `VERCEL_ENV === "production"`.
 *     Un Preview o un entorno local sin test code no envía nada real.
 *
 * EL TOKEN
 *   Viaja en el CUERPO del POST (form-urlencoded, como en la documentación de
 *   Meta), nunca en la URL: así no queda en logs de acceso ni en trazas de red.
 *   Ningún mensaje que sale de este módulo lo contiene: se elimina de cualquier
 *   texto de error antes de devolverlo.
 */
import "server-only";
import type { EventoMeta, ModoMeta } from "@/lib/meta-capi";

const TIMEOUT_MS = 8000;
const MAX_ERROR = 200;

/** Acepta `v27.0` o `27.0`. Cualquier otra cosa (o vacío) es `null`: no hay versión por defecto. */
export function normalizarVersion(cruda: string | undefined): string | null {
  const v = (cruda ?? "").trim();
  if (/^v\d+\.\d+$/.test(v)) return v;
  if (/^\d+\.\d+$/.test(v)) return `v${v}`;
  return null;
}

export type ConfiguracionMeta =
  | {
      ok: true;
      modo: ModoMeta;
      token: string;
      datasetId: string;
      version: string;
      testCode: string | null;
    }
  | {
      ok: false;
      motivo: "sin_configuracion" | "live_fuera_de_produccion";
      /** Nombres de las variables que faltan o son inválidas. Nunca valores. */
      faltan: string[];
    };

/** Lee y valida la configuración. No registra ni devuelve el token en errores. */
export function configuracionMeta(env: NodeJS.ProcessEnv = process.env): ConfiguracionMeta {
  const token = env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  const datasetId = env.META_DATASET_ID?.trim() ?? "";
  const version = normalizarVersion(env.META_GRAPH_API_VERSION);
  const testCode = env.META_CAPI_TEST_EVENT_CODE?.trim() || null;

  // Sin valores por defecto: lo que falta se informa por NOMBRE y no se envía.
  const faltan: string[] = [];
  if (token === "") faltan.push("META_CAPI_ACCESS_TOKEN");
  if (!/^\d+$/.test(datasetId)) faltan.push("META_DATASET_ID");
  if (!version) faltan.push("META_GRAPH_API_VERSION");

  if (faltan.length > 0 || !version) {
    return { ok: false, motivo: "sin_configuracion", faltan };
  }

  if (!testCode && env.VERCEL_ENV !== "production") {
    return { ok: false, motivo: "live_fuera_de_produccion", faltan: ["META_CAPI_TEST_EVENT_CODE"] };
  }

  return { ok: true, modo: testCode ? "test" : "live", token, datasetId, version, testCode };
}

/** Modo que usaría un envío ahora, para mostrarlo en el panel. */
export function modoActual(env: NodeJS.ProcessEnv = process.env): {
  configurado: boolean;
  modo: ModoMeta;
} {
  const cfg = configuracionMeta(env);
  if (cfg.ok) return { configurado: true, modo: cfg.modo };
  return { configurado: false, modo: env.META_CAPI_TEST_EVENT_CODE?.trim() ? "test" : "live" };
}

export type ResultadoEnvio =
  | { ok: true; eventsReceived: number | null; fbtraceId: string | null }
  | { ok: false; error: string; fbtraceId: string | null };

/** Recorta y saca el token de cualquier texto antes de guardarlo o mostrarlo. */
export function sanear(texto: string, token: string): string {
  const sinToken = token ? texto.split(token).join("***") : texto;
  return sinToken.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR);
}

/**
 * Manda los eventos a `POST /{version}/{dataset}/events`.
 *
 * Nunca lanza: cualquier falla —configuración, red, timeout, respuesta de error
 * de Meta— vuelve como `{ ok: false, error }` con un mensaje corto y saneado.
 */
export async function enviarEventos(
  eventos: EventoMeta[],
  cfg: Extract<ConfiguracionMeta, { ok: true }>,
): Promise<ResultadoEnvio> {
  const url = `https://graph.facebook.com/${cfg.version}/${cfg.datasetId}/events`;

  const cuerpo = new URLSearchParams();
  cuerpo.set("data", JSON.stringify(eventos));
  cuerpo.set("access_token", cfg.token);
  if (cfg.testCode) cuerpo.set("test_event_code", cfg.testCode);

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cuerpo.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const esTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      ok: false,
      error: esTimeout ? "Meta no respondió a tiempo." : "No se pudo conectar con Meta.",
      fbtraceId: null,
    };
  }

  let json: unknown = null;
  try {
    json = await respuesta.json();
  } catch {
    // Una respuesta que no es JSON se trata abajo como error HTTP.
  }

  const obj = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  const fbtraceId = typeof obj.fbtrace_id === "string" ? obj.fbtrace_id : null;

  if (respuesta.ok && typeof obj.events_received === "number") {
    // Un 200 con menos eventos recibidos que los enviados no es un éxito.
    if (obj.events_received < eventos.length) {
      return {
        ok: false,
        error: `Meta recibió ${obj.events_received} de ${eventos.length} eventos.`,
        fbtraceId,
      };
    }
    return { ok: true, eventsReceived: obj.events_received, fbtraceId };
  }

  const err =
    typeof obj.error === "object" && obj.error !== null
      ? (obj.error as Record<string, unknown>)
      : null;

  const partes = [
    typeof err?.error_user_msg === "string" ? err.error_user_msg : null,
    typeof err?.message === "string" ? err.message : null,
    typeof err?.code === "number" ? `código ${err.code}` : null,
    typeof err?.error_subcode === "number" ? `subcódigo ${err.error_subcode}` : null,
  ].filter(Boolean);

  const mensaje = partes.length > 0 ? partes.join(" · ") : `Respuesta HTTP ${respuesta.status}.`;
  const traza = typeof err?.fbtrace_id === "string" ? err.fbtrace_id : fbtraceId;

  return { ok: false, error: sanear(mensaje, cfg.token), fbtraceId: traza };
}
