import { describe, expect, it } from "vitest";
import {
  POR_PAGINA,
  resolverFiltros,
  sanearBusqueda,
  totalPaginas,
} from "@/lib/admin-filtros";

describe("filtros por defecto", () => {
  it("sin query params: pedidos activos, sin filtrar, página 1", () => {
    expect(resolverFiltros({})).toEqual({
      tab: "pedidos",
      busqueda: "",
      pago: "todos",
      entrega: "todas",
      origen: "todos",
      archivo: "activos",
      pagina: 1,
    });
  });

  it("los archivados NO se muestran por defecto", () => {
    expect(resolverFiltros({}).archivo).toBe("activos");
  });
});

describe("valores válidos", () => {
  it("toma los filtros de la URL", () => {
    const f = resolverFiltros({
      tab: "abandonados",
      pago: "pagado",
      entrega: "enviado",
      origen: "manual",
      archivo: "archivados",
      pagina: "3",
    });
    expect(f).toMatchObject({
      tab: "abandonados",
      pago: "pagado",
      entrega: "enviado",
      origen: "manual",
      archivo: "archivados",
      pagina: 3,
    });
  });
});

describe("una URL editada a mano no llega a la consulta", () => {
  it("un filtro desconocido cae al valor por defecto", () => {
    const f = resolverFiltros({
      tab: "otra-cosa",
      pago: "reembolsado",
      entrega: "extraviado",
      origen: "instagram",
      archivo: "borrados",
    });
    expect(f).toMatchObject({
      tab: "pedidos",
      pago: "todos",
      entrega: "todas",
      origen: "todos",
      archivo: "activos",
    });
  });

  it("una página inválida vuelve a la primera", () => {
    expect(resolverFiltros({ pagina: "0" }).pagina).toBe(1);
    expect(resolverFiltros({ pagina: "-4" }).pagina).toBe(1);
    expect(resolverFiltros({ pagina: "abc" }).pagina).toBe(1);
    expect(resolverFiltros({ pagina: "1.5" }).pagina).toBe(1);
  });
});

describe("saneado de la búsqueda", () => {
  it("conserva lo que sirve para buscar", () => {
    expect(sanearBusqueda("Camila Rodríguez")).toBe("Camila Rodríguez");
    expect(sanearBusqueda("GRT-20260727-000106")).toBe("GRT-20260727-000106");
    expect(sanearBusqueda("+595992363483")).toBe("+595992363483");
  });

  it("saca los separadores de la gramática de PostgREST", () => {
    // Una coma o un paréntesis convertirían el término en otra condición del
    // filtro `or=(...)`.
    expect(sanearBusqueda("a,b")).toBe("a b");
    expect(sanearBusqueda("x)or(y")).toBe("x or y");
    expect(sanearBusqueda("nombre.ilike.algo")).toBe("nombre ilike algo");
  });

  it("saca los comodines para que no se puedan inyectar", () => {
    expect(sanearBusqueda("*")).toBe("");
    expect(sanearBusqueda("%")).toBe("");
    expect(sanearBusqueda("a*b%c")).toBe("a b c");
  });

  it("recorta espacios y colapsa los repetidos", () => {
    expect(sanearBusqueda("   dos    espacios   ")).toBe("dos espacios");
  });

  it("acota el largo", () => {
    expect(sanearBusqueda("a".repeat(500)).length).toBe(60);
  });

  it("lo que no es texto se descarta", () => {
    expect(sanearBusqueda(undefined)).toBe("");
    expect(sanearBusqueda(123)).toBe("");
    expect(sanearBusqueda(null)).toBe("");
  });

  it("una búsqueda que queda vacía no filtra nada", () => {
    expect(resolverFiltros({ q: "()" }).busqueda).toBe("");
  });
});

describe("paginación", () => {
  it("son 20 pedidos por página", () => {
    expect(POR_PAGINA).toBe(20);
  });

  it("calcula las páginas necesarias", () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(1)).toBe(1);
    expect(totalPaginas(20)).toBe(1);
    expect(totalPaginas(21)).toBe(2);
    expect(totalPaginas(40)).toBe(2);
    expect(totalPaginas(41)).toBe(3);
  });

  it("nunca devuelve cero ni un número negativo", () => {
    expect(totalPaginas(-5)).toBe(1);
  });
});
