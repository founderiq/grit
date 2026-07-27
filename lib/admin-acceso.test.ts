import { describe, expect, it } from "vitest";
import { resolverAcceso, type FilaAdmin, type UsuarioAuth } from "@/lib/admin-acceso";

/**
 * La regla de acceso al panel.
 *
 * Es la decisión más sensible de esta fase, así que se prueba aislada: sin
 * red, sin base y sin Next. Todo lo que hace falta para entrar tiene que estar
 * acá adentro.
 */

const USUARIO: UsuarioAuth = {
  id: "11111111-2222-3333-4444-555555555555",
  email: "persona@ejemplo.test",
};

const ACTIVO: FilaAdmin = { role: "admin", is_active: true, display_name: "Nombre Visible" };

describe("quién entra al panel", () => {
  it("sin sesión no se muestra el panel", () => {
    expect(resolverAcceso(null, null)).toEqual({ estado: "sin_sesion" });
  });

  it("sin sesión, una fila activa suelta no alcanza", () => {
    expect(resolverAcceso(null, ACTIVO)).toEqual({ estado: "sin_sesion" });
  });

  it("autenticado sin fila en admin_users NO entra", () => {
    const r = resolverAcceso(USUARIO, null);
    expect(r.estado).toBe("no_autorizado");
  });

  it("autenticado con fila INACTIVA no entra", () => {
    const r = resolverAcceso(USUARIO, { ...ACTIVO, is_active: false });
    expect(r.estado).toBe("no_autorizado");
  });

  it("autenticado con fila activa entra", () => {
    const r = resolverAcceso(USUARIO, ACTIVO);
    expect(r).toEqual({
      estado: "autorizado",
      email: "persona@ejemplo.test",
      nombre: "Nombre Visible",
      role: "admin",
    });
  });
});

describe("la autorización no se puede forzar desde el borde", () => {
  it("un is_active que no sea exactamente true no entra", () => {
    // Si alguna vez llegara un valor coercionable ("true", 1) desde una
    // consulta mal tipada, tiene que quedar afuera igual.
    for (const valor of ["true", 1, "1", {}, [] as unknown]) {
      const fila = { ...ACTIVO, is_active: valor } as unknown as FilaAdmin;
      expect(resolverAcceso(USUARIO, fila).estado).toBe("no_autorizado");
    }
  });

  it("el email nunca decide el acceso", () => {
    // Un email que "parece" de administrador tampoco cambia nada.
    const sospechoso: UsuarioAuth = { id: USUARIO.id, email: "admin@ejemplo.test" };
    expect(resolverAcceso(sospechoso, null).estado).toBe("no_autorizado");
  });

  it("una fila activa autoriza aunque el usuario no tenga email", () => {
    const r = resolverAcceso({ id: USUARIO.id, email: null }, ACTIVO);
    expect(r.estado).toBe("autorizado");
    if (r.estado === "autorizado") expect(r.email).toBeNull();
  });
});

describe("nombre para mostrar", () => {
  it("un display_name vacío cae al email en la interfaz", () => {
    const r = resolverAcceso(USUARIO, { ...ACTIVO, display_name: "   " });
    expect(r.estado).toBe("autorizado");
    if (r.estado === "autorizado") expect(r.nombre).toBeNull();
  });

  it("un display_name nulo cae al email en la interfaz", () => {
    const r = resolverAcceso(USUARIO, { ...ACTIVO, display_name: null });
    if (r.estado === "autorizado") expect(r.nombre).toBeNull();
  });

  it("se recorta el nombre guardado", () => {
    const r = resolverAcceso(USUARIO, { ...ACTIVO, display_name: "  Camila  " });
    if (r.estado === "autorizado") expect(r.nombre).toBe("Camila");
  });
});
