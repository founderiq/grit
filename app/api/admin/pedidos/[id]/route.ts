import { NextResponse } from "next/server";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { obtenerPedido } from "@/lib/admin-datos";
import { esUuid } from "@/lib/pedidos";

/**
 * GET /api/admin/pedidos/[id] — detalle de un pedido para el drawer.
 *
 * POR QUÉ EXISTE
 *   El drawer se abre y se cierra sin navegar. Su contenido, entonces, no puede
 *   llegar como parte de la página: lo pide desde el navegador cuando hace
 *   falta, y lo cachea para que reabrir el mismo pedido sea instantáneo.
 *
 * SEGURIDAD
 *   Es un endpoint público en el sentido de que cualquiera puede pegarle, así
 *   que vuelve a autorizar desde cero: `obtenerEstadoAdmin()` valida la sesión
 *   contra Supabase Auth y exige una fila ACTIVA en `admin_users`. No alcanza
 *   con haber abierto /admin alguna vez, ni con estar autenticado.
 *
 *   El id se valida como UUID antes de tocar la base. La respuesta es
 *   exactamente `PedidoDetalle`: sin `confirmation_token`, sin
 *   `idempotency_key`, sin mensajes de Supabase y sin stack traces. Los tres
 *   estados de error se distinguen por código HTTP y por una etiqueta corta;
 *   el detalle real queda en el log del servidor.
 *
 *   Un usuario sin permiso recibe 403 y nada más: ni siquiera se llega a
 *   consultar si el pedido existe.
 */

export const dynamic = "force-dynamic";

const json = (cuerpo: unknown, status: number) =>
  NextResponse.json(cuerpo, {
    status,
    // Datos de clientes: no se cachean en ningún lado, nunca.
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const acceso = await obtenerEstadoAdmin();
  if (acceso.estado !== "autorizado") {
    return json({ error: "no_autorizado" }, 403);
  }

  const { id } = await params;
  if (!esUuid(id)) return json({ error: "id_invalido" }, 400);

  const res = await obtenerPedido(id);
  if (!res.ok) return json({ error: "error_interno" }, 500);
  if (!res.datos) return json({ error: "no_encontrado" }, 404);

  return json({ pedido: res.datos }, 200);
}
