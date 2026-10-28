import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN } from "@/lib/admin-content";
import {
  eliminarImagenGaleria,
  reemplazarImagenGaleria,
  reordenarGaleria,
  subirImagenGaleria,
} from "@/lib/galeria-mutaciones";

/**
 * Orden de las operaciones de la galería contra un Supabase simulado.
 *
 * Lo que importa verificar es la secuencia —qué se sube, qué se registra y
 * qué se borra, y en qué orden—, porque Storage y la base no comparten
 * transacción: el orden es lo que impide que /producto apunte a un archivo
 * que no existe.
 */

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const VIEJA = "galeria/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.webp";

type Paso = { op: string; arg?: unknown };
let pasos: Paso[];
let fallaUpload: boolean;
let rpcRespuesta: { data: unknown; error: { code: string } | null };

function supabaseFalso() {
  return {
    storage: {
      from: (bucket: string) => ({
        upload: vi.fn(async (ruta: string, _bytes: Uint8Array, opciones: { upsert: boolean; contentType: string }) => {
          pasos.push({ op: "upload", arg: { bucket, ruta, upsert: opciones.upsert, tipo: opciones.contentType } });
          return fallaUpload
            ? { data: null, error: { name: "StorageError", statusCode: "500" } }
            : { data: { path: ruta }, error: null };
        }),
        remove: vi.fn(async (rutas: string[]) => {
          pasos.push({ op: "remove", arg: rutas });
          return { data: [], error: null };
        }),
      }),
    },
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      pasos.push({ op: `rpc:${fn}`, arg: args });
      return rpcRespuesta;
    }),
  } as unknown as SupabaseClient;
}

/** WebP 1200×900 válido para el validador (cabecera VP8X). */
function webp(): File {
  const b = new Uint8Array(64);
  b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  b.set([..."VP8X"].map((c) => c.charCodeAt(0)), 12);
  b.set([1199 & 0xff, 1199 >> 8, 0, 899 & 0xff, 899 >> 8, 0], 24);
  return new File([b], "galeria.webp", { type: "image/webp" });
}

const ctx = () => ({ supabase: supabaseFalso(), adminId: ADMIN_ID });
const E = ADMIN.galeria.errores;

beforeEach(() => {
  pasos = [];
  fallaUpload = false;
  rpcRespuesta = { data: null, error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

/* ====================================================================== */

describe("subir", () => {
  it("sube a una ruta nueva y recién después registra la fila al final", async () => {
    rpcRespuesta = { data: { sort_order: 11 }, error: null };
    const r = await subirImagenGaleria(ctx(), { archivo: webp(), alt: " Pulsera " });

    expect(r).toEqual({ ok: true, mensaje: ADMIN.galeria.mensajes.subida(11) });
    expect(pasos.map((p) => p.op)).toEqual(["upload", "rpc:gallery_add_image"]);

    const subida = pasos[0]!.arg as { bucket: string; ruta: string; upsert: boolean; tipo: string };
    expect(subida.bucket).toBe("product-gallery");
    expect(subida.ruta).toMatch(/^galeria\/[0-9a-f-]{36}\.webp$/);
    expect(subida.upsert).toBe(false);
    expect(subida.tipo).toBe("image/webp");

    expect(pasos[1]!.arg).toMatchObject({
      p_storage_path: subida.ruta,
      p_alt_text: "Pulsera",
      p_width: 1200,
      p_height: 900,
      p_admin: ADMIN_ID,
    });
  });

  it("si la fila no se puede crear, borra el archivo recién subido", async () => {
    rpcRespuesta = { data: null, error: { code: "XX000" } };
    const r = await subirImagenGaleria(ctx(), { archivo: webp(), alt: "" });

    expect(r).toEqual({ ok: false, error: E.error_interno });
    const ruta = (pasos[0]!.arg as { ruta: string }).ruta;
    expect(pasos.map((p) => p.op)).toEqual(["upload", "rpc:gallery_add_image", "remove"]);
    expect(pasos[2]!.arg).toEqual([ruta]);
  });

  it("si Storage falla, no registra nada", async () => {
    fallaUpload = true;
    const r = await subirImagenGaleria(ctx(), { archivo: webp(), alt: "" });
    expect(r.ok).toBe(false);
    expect(pasos.map((p) => p.op)).toEqual(["upload"]);
  });

  it("valida antes de tocar Storage", async () => {
    const falso = new File([new TextEncoder().encode("<script>")], "x.png", { type: "image/png" });
    expect(await subirImagenGaleria(ctx(), { archivo: falso, alt: "" })).toEqual({
      ok: false,
      error: E.no_es_imagen,
    });
    expect(await subirImagenGaleria(ctx(), { archivo: null, alt: "" })).toEqual({
      ok: false,
      error: E.sin_archivo,
    });
    expect(await subirImagenGaleria(ctx(), { archivo: webp(), alt: "x".repeat(301) })).toEqual({
      ok: false,
      error: E.alt_invalido,
    });
    expect(pasos).toEqual([]);
  });

  it("un administrador revocado entre medio no deja archivo colgado", async () => {
    rpcRespuesta = { data: null, error: { code: "42501" } };
    const r = await subirImagenGaleria(ctx(), { archivo: webp(), alt: "" });
    expect(r).toEqual({ ok: false, error: E.no_autorizado });
    expect(pasos.at(-1)!.op).toBe("remove");
  });
});

describe("reemplazar", () => {
  it("sube el nuevo, apunta la fila y RECIÉN DESPUÉS borra el viejo", async () => {
    rpcRespuesta = { data: VIEJA, error: null };
    const r = await reemplazarImagenGaleria(ctx(), { id: ID, archivo: webp(), alt: "Nueva" });

    expect(r).toEqual({ ok: true, mensaje: ADMIN.galeria.mensajes.reemplazada });
    expect(pasos.map((p) => p.op)).toEqual(["upload", "rpc:gallery_replace_image", "remove"]);

    const nueva = (pasos[0]!.arg as { ruta: string }).ruta;
    expect(nueva).not.toBe(VIEJA);
    expect(pasos[1]!.arg).toMatchObject({ p_id: ID, p_storage_path: nueva, p_admin: ADMIN_ID });
    expect(pasos[2]!.arg).toEqual([VIEJA]);
  });

  it("si la fila no se actualiza, el viejo queda intacto y se descarta el nuevo", async () => {
    rpcRespuesta = { data: null, error: { code: "P0002" } };
    const r = await reemplazarImagenGaleria(ctx(), { id: ID, archivo: webp(), alt: "" });

    expect(r).toEqual({ ok: false, error: E.no_existe });
    const nueva = (pasos[0]!.arg as { ruta: string }).ruta;
    const borrados = pasos.filter((p) => p.op === "remove").flatMap((p) => p.arg as string[]);
    expect(borrados).toEqual([nueva]);
    expect(borrados).not.toContain(VIEJA);
  });

  it("si Storage falla al subir, no toca la fila ni borra nada", async () => {
    fallaUpload = true;
    const r = await reemplazarImagenGaleria(ctx(), { id: ID, archivo: webp(), alt: "" });
    expect(r.ok).toBe(false);
    expect(pasos.map((p) => p.op)).toEqual(["upload"]);
  });

  it("una foto del seed (/public) no se borra: es el fallback", async () => {
    rpcRespuesta = { data: null, error: null };
    const r = await reemplazarImagenGaleria(ctx(), { id: ID, archivo: webp(), alt: "" });
    expect(r.ok).toBe(true);
    expect(pasos.map((p) => p.op)).toEqual(["upload", "rpc:gallery_replace_image"]);
  });

  it("rechaza un id que no es UUID sin tocar nada", async () => {
    const r = await reemplazarImagenGaleria(ctx(), { id: "1 or 1=1", archivo: webp(), alt: "" });
    expect(r).toEqual({ ok: false, error: E.datos_invalidos });
    expect(pasos).toEqual([]);
  });
});

describe("eliminar", () => {
  it("borra la fila primero y después el archivo", async () => {
    rpcRespuesta = { data: VIEJA, error: null };
    const r = await eliminarImagenGaleria(ctx(), { id: ID });

    expect(r).toEqual({ ok: true, mensaje: ADMIN.galeria.mensajes.eliminada });
    expect(pasos.map((p) => p.op)).toEqual(["rpc:gallery_delete_image", "remove"]);
    expect(pasos[1]!.arg).toEqual([VIEJA]);
  });

  it("acepta la ruta también con forma de fila (otra serialización de PostgREST)", async () => {
    rpcRespuesta = { data: [{ gallery_delete_image: VIEJA }], error: null };
    await eliminarImagenGaleria(ctx(), { id: ID });
    expect(pasos.at(-1)).toEqual({ op: "remove", arg: [VIEJA] });
  });

  it("si la fila no se borra, el archivo tampoco", async () => {
    rpcRespuesta = { data: null, error: { code: "XX000" } };
    const r = await eliminarImagenGaleria(ctx(), { id: ID });
    expect(r.ok).toBe(false);
    expect(pasos.map((p) => p.op)).toEqual(["rpc:gallery_delete_image"]);
  });

  it("no deja borrar la última imagen", async () => {
    rpcRespuesta = { data: null, error: { code: "23514" } };
    expect(await eliminarImagenGaleria(ctx(), { id: ID })).toEqual({ ok: false, error: E.ultima });
  });

  it("una foto del seed solo se quita de la galería: el archivo de /public queda", async () => {
    rpcRespuesta = { data: null, error: null };
    await eliminarImagenGaleria(ctx(), { id: ID });
    expect(pasos.map((p) => p.op)).toEqual(["rpc:gallery_delete_image"]);
  });
});

describe("reordenar", () => {
  it("manda el orden completo a la base", async () => {
    const ids = [ID, "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"];
    const r = await reordenarGaleria(ctx(), { ids });
    expect(r).toEqual({ ok: true, mensaje: ADMIN.galeria.mensajes.ordenGuardado });
    expect(pasos).toEqual([{ op: "rpc:gallery_reorder", arg: { p_ids: ids, p_admin: ADMIN_ID } }]);
  });

  it("un orden desactualizado tiene su propio mensaje", async () => {
    rpcRespuesta = { data: null, error: { code: "40001" } };
    expect(await reordenarGaleria(ctx(), { ids: [ID] })).toEqual({
      ok: false,
      error: E.orden_desactualizado,
    });
  });

  it("rechaza ids inválidos o repetidos sin llamar a la base", async () => {
    expect((await reordenarGaleria(ctx(), { ids: [ID, ID] })).ok).toBe(false);
    expect((await reordenarGaleria(ctx(), { ids: "x" })).ok).toBe(false);
    expect(pasos).toEqual([]);
  });
});
