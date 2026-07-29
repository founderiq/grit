import { describe, expect, it } from "vitest";
import {
  esFechaIso,
  hoyAsuncion,
  resolverRango,
  sumarDias,
} from "@/lib/admin-rango";

/**
 * El rango de fechas del panel.
 *
 * La hora se fija en cada prueba para que los rangos sean comprobables. Se usa
 * a propósito una hora nocturna de Asunción —23:30 local es el día siguiente en
 * UTC— porque ahí es donde un cálculo en UTC se equivocaría de día.
 */

// 2026-07-28 02:30 UTC = 2026-07-27 22:30 en Asunción (UTC-4).
const NOCHE = new Date("2026-07-28T02:30:00Z");
// 2026-07-27 12:00 UTC = 2026-07-27 08:00 en Asunción.
const MANANA = new Date("2026-07-27T12:00:00Z");

describe("hoy en Paraguay", () => {
  it("de noche sigue siendo el día de Asunción, no el de UTC", () => {
    expect(NOCHE.toISOString().slice(0, 10)).toBe("2026-07-28");
    expect(hoyAsuncion(NOCHE)).toBe("2026-07-27");
  });

  it("durante el día coincide", () => {
    expect(hoyAsuncion(MANANA)).toBe("2026-07-27");
  });
});

describe("aritmética de fechas", () => {
  it("suma y resta días sin correrse de zona", () => {
    expect(sumarDias("2026-07-27", -6)).toBe("2026-07-21");
    expect(sumarDias("2026-07-27", 1)).toBe("2026-07-28");
  });

  it("cruza el cambio de mes y de año", () => {
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("valida el formato ISO", () => {
    expect(esFechaIso("2026-07-27")).toBe(true);
    expect(esFechaIso("2026-02-30")).toBe(false);
    expect(esFechaIso("27/07/2026")).toBe(false);
    expect(esFechaIso("")).toBe(false);
    expect(esFechaIso(null)).toBe(false);
  });
});

describe("rangos predefinidos", () => {
  it("por defecto son los últimos 30 días", () => {
    const r = resolverRango({}, NOCHE);
    expect(r.id).toBe("30d");
    expect(r.hasta).toBe("2026-07-27");
    expect(r.desde).toBe("2026-06-28");
  });

  it("7 días incluye hoy y los seis anteriores", () => {
    const r = resolverRango({ rango: "7d" }, NOCHE);
    expect(r.desde).toBe("2026-07-21");
    expect(r.hasta).toBe("2026-07-27");
  });

  it("90 días", () => {
    const r = resolverRango({ rango: "90d" }, NOCHE);
    expect(r.desde).toBe("2026-04-29");
    expect(r.hasta).toBe("2026-07-27");
  });

  it("Todo no pone ningún límite", () => {
    const r = resolverRango({ rango: "todo" }, NOCHE);
    expect(r.desde).toBeNull();
    expect(r.hasta).toBeNull();
  });
});

describe("rango personalizado", () => {
  it("toma las dos fechas dadas", () => {
    const r = resolverRango(
      { rango: "personalizado", desde: "2026-05-01", hasta: "2026-05-31" },
      NOCHE,
    );
    expect(r.id).toBe("personalizado");
    expect(r.desde).toBe("2026-05-01");
    expect(r.hasta).toBe("2026-05-31");
  });

  it("si vienen al revés las ordena en lugar de devolver nada", () => {
    const r = resolverRango(
      { rango: "personalizado", desde: "2026-05-31", hasta: "2026-05-01" },
      NOCHE,
    );
    expect(r.desde).toBe("2026-05-01");
    expect(r.hasta).toBe("2026-05-31");
  });

  it("un solo día es un rango válido", () => {
    const r = resolverRango(
      { rango: "personalizado", desde: "2026-05-10", hasta: "2026-05-10" },
      NOCHE,
    );
    expect(r.desde).toBe("2026-05-10");
    expect(r.hasta).toBe("2026-05-10");
  });

  it("a medio completar no inventa el otro extremo", () => {
    const r = resolverRango({ rango: "personalizado", desde: "2026-05-01" }, NOCHE);
    expect(r.id).toBe("personalizado");
    expect(r.desde).toBe("2026-05-01");
    expect(r.hasta).toBeNull();
  });

  it("una fecha inválida se descarta", () => {
    const r = resolverRango(
      { rango: "personalizado", desde: "no-es-fecha", hasta: "2026-05-31" },
      NOCHE,
    );
    expect(r.desde).toBeNull();
    expect(r.hasta).toBe("2026-05-31");
  });
});

describe("la URL se puede editar a mano sin romper el panel", () => {
  it("un rango desconocido cae al rango por defecto", () => {
    const r = resolverRango({ rango: "el-año-pasado" }, NOCHE);
    expect(r.id).toBe("30d");
    expect(r.desde).toBe("2026-06-28");
  });

  it("desde y hasta sueltos, sin rango personalizado, se ignoran", () => {
    const r = resolverRango({ desde: "2020-01-01", hasta: "2020-12-31" }, NOCHE);
    expect(r.id).toBe("30d");
    expect(r.desde).toBe("2026-06-28");
  });
});
