import { NextResponse } from "next/server";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";
import { MAX_CUERPO, validarCaptura } from "@/lib/checkout-abandonado";

/**
 * POST /api/checkout-abandonado — guarda quién empezó el checkout y no terminó.
 *
 * ES PÚBLICO, y está escrito como tal.
 *
 * QUÉ ACEPTA
 *   Solo los campos de `validarCaptura()`: clave de sesión, contacto,
 *   selección, zona y paso. `status`, `converted_order_id`, `converted_at` y
 *   `archived_at` NO se leen bajo ninguna forma; el objeto validado ni siquiera
 *   los tiene. Convertir y archivar son decisiones del servidor y del panel.
 *
 * QUÉ DEVUELVE
 *   `{ ok: true }` y nada más. Nunca la fila guardada, nunca un id, nunca datos
 *   de otro visitante. Es un endpoint de escritura ciega: quien lo llama no
 *   puede usarlo para leer nada, ni siquiera lo suyo.
 *
 * ABUSO
 *   · El cuerpo se corta en 2 KB: un payload real ronda los 300 bytes.
 *   · Hay un mínimo de tiempo entre escrituras por clave de sesión, en memoria
 *     del proceso. No es una defensa criptográfica —en serverless cada
 *     instancia tiene la suya— pero corta el caso realista: un bucle de
 *     `sendBeacon` desde una pestaña.
 *   · La clave de sesión es un UUID generado en el navegador. Adivinar el de
 *     otro no sirve de nada: no se puede leer, solo sobrescribir con datos
 *     propios, y no hay nada que robar del otro lado.
 *   · Ante cualquier problema responde 204 sin explicar: no es un oráculo de
 *     qué claves existen.
 */

export const dynamic = "force-dynamic";

/** Mínimo entre dos escrituras de la misma sesión. */
const MIN_ENTRE_ESCRITURAS_MS = 2000;

/** Último guardado por clave. Se poda sola para no crecer sin límite. */
const ultimas = new Map<string, number>();
const MAX_CLAVES = 5000;

function demasiadoSeguido(clave: string): boolean {
  const ahora = Date.now();
  const previa = ultimas.get(clave);

  if (previa !== undefined && ahora - previa < MIN_ENTRE_ESCRITURAS_MS) return true;

  if (ultimas.size > MAX_CLAVES) {
    // Poda barata: se tiran las entradas viejas de una pasada.
    for (const [k, t] of ultimas) {
      if (ahora - t > 60_000) ultimas.delete(k);
    }
  }

  ultimas.set(clave, ahora);
  return false;
}

/** Siempre lo mismo: sin cuerpo, sin pistas, sin caché. */
const listo = () =>
  new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  // Corte por tamaño antes de leer nada. `Content-Length` puede mentir, así que
  // después se vuelve a medir sobre el texto ya recibido.
  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > MAX_CUERPO) return listo();

  let bruto: unknown;
  try {
    const texto = await request.text();
    if (texto.length > MAX_CUERPO) return listo();
    bruto = JSON.parse(texto);
  } catch {
    return listo();
  }

  const validacion = validarCaptura(bruto);
  if (!validacion.ok) return listo();

  const c = validacion.captura;
  if (demasiadoSeguido(c.session_key)) return listo();

  if (!hayConfiguracionSupabase()) {
    console.error("[abandonado] configuración de Supabase incompleta");
    return listo();
  }

  try {
    const ahora = new Date().toISOString();

    // UPSERT por `session_key`. Al mandar solo estas columnas, `status`,
    // `converted_order_id` y `archived_at` quedan como están: un checkout ya
    // convertido o ya archivado no vuelve atrás porque el visitante siga
    // escribiendo en una pestaña abierta.
    const { error } = await getSupabaseAdmin()
      .from("abandoned_checkouts")
      .upsert({ ...c, last_seen_at: ahora }, { onConflict: "session_key" });

    if (error) {
      // Solo el código: sin datos del visitante, sin SQL.
      console.error("[abandonado] no se pudo guardar", { codigo: error.code });
    }
  } catch (e) {
    console.error("[abandonado] error inesperado", {
      tipo: e instanceof Error ? e.name : "desconocido",
    });
  }

  return listo();
}
