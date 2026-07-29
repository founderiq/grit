import { NextResponse } from "next/server";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { COSTOS_POR_DEFECTO, obtenerAdSpend, obtenerCostos } from "@/lib/admin-datos";

/**
 * GET /api/admin/panel — datos que necesitan los tres formularios del panel.
 *
 * POR QUÉ ES UN ENDPOINT Y NO PARTE DE LA PÁGINA
 *   Los costos vigentes y la lista de inversiones publicitarias solo hacen
 *   falta cuando alguien abre uno de los modales, que es la minoría de las
 *   visitas al panel. Leerlos en cada render del dashboard eran dos consultas
 *   por visita que casi siempre se tiraban a la basura.
 *
 *   Se piden una sola vez por sesión de panel y quedan en memoria del
 *   navegador; después de guardar un cambio, el formulario los vuelve a pedir.
 *
 * SEGURIDAD
 *   Autoriza de cero, igual que el resto: sesión validada contra Supabase Auth
 *   y fila ACTIVA en `admin_users`. Devuelve únicamente los tres costos del
 *   negocio y las inversiones publicitarias; ningún dato de clientes.
 */

export const dynamic = "force-dynamic";

const json = (cuerpo: unknown, status: number) =>
  NextResponse.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const acceso = await obtenerEstadoAdmin();
  if (acceso.estado !== "autorizado") return json({ error: "no_autorizado" }, 403);

  const [costos, adSpend] = await Promise.all([obtenerCostos(), obtenerAdSpend()]);

  return json(
    {
      costos: costos.ok ? costos.datos : COSTOS_POR_DEFECTO,
      adSpend: adSpend.ok ? adSpend.datos : [],
    },
    200,
  );
}
