import { describe, expect, it } from "vitest";
import {
  MAX_MONTO,
  esEntregaVisible,
  esPagoVisible,
  limpiarNotas,
  notaCambioEntrega,
  notaCambioPago,
  resolverEntrega,
  resolverPago,
  resumenPedido,
  validarAjuste,
} from "@/lib/admin-mutaciones";

/**
 * Las reglas de escritura del panel.
 *
 * Es la parte donde un error no se ve hasta que ya está guardado, así que se
 * prueban las traducciones de estado y la validación de ajustes con todos los
 * bordes: valores desconocidos, montos raros y textos vacíos.
 */

describe("estado de pago", () => {
  it("pagado y cancelado son directos", () => {
    expect(resolverPago("pagado", "pendiente_transferencia", "transferencia")).toBe("pagado");
    expect(resolverPago("cancelado", "pagado", "tarjeta")).toBe("cancelado");
  });

  it("volver a Pendiente conserva el subtipo que ya tenía", () => {
    expect(resolverPago("pendiente", "pendiente_pago_online", "tarjeta")).toBe(
      "pendiente_pago_online",
    );
    expect(resolverPago("pendiente", "pendiente_transferencia", "transferencia")).toBe(
      "pendiente_transferencia",
    );
  });

  it("un pendiente de transferencia no se convierte en pago online por el método", () => {
    // El pedido es de tarjeta pero quedó esperando transferencia: se respeta
    // lo que hay, porque el subtipo dice qué se está esperando de verdad.
    expect(resolverPago("pendiente", "pendiente_transferencia", "tarjeta")).toBe(
      "pendiente_transferencia",
    );
  });

  it("desde pagado, el subtipo se deduce del método de pago", () => {
    expect(resolverPago("pendiente", "pagado", "tarjeta")).toBe("pendiente_pago_online");
    expect(resolverPago("pendiente", "pagado", "transferencia")).toBe("pendiente_transferencia");
    expect(resolverPago("pendiente", "pagado", "efectivo")).toBe("pendiente_transferencia");
  });

  it("desde cancelado o fallido también", () => {
    expect(resolverPago("pendiente", "cancelado", "tarjeta")).toBe("pendiente_pago_online");
    expect(resolverPago("pendiente", "fallido", "efectivo")).toBe("pendiente_transferencia");
  });

  it("un método desconocido cae en transferencia, no en pago online", () => {
    expect(resolverPago("pendiente", "pagado", null)).toBe("pendiente_transferencia");
    expect(resolverPago("pendiente", "pagado", "cripto")).toBe("pendiente_transferencia");
  });

  it("solo se aceptan los tres estados visibles", () => {
    expect(esPagoVisible("pagado")).toBe(true);
    expect(esPagoVisible("pendiente")).toBe(true);
    expect(esPagoVisible("cancelado")).toBe(true);
    // Los valores CRUDOS de la base no son elegibles desde el panel.
    expect(esPagoVisible("pendiente_transferencia")).toBe(false);
    expect(esPagoVisible("fallido")).toBe(false);
    expect(esPagoVisible("")).toBe(false);
    expect(esPagoVisible(null)).toBe(false);
  });
});

describe("estado de entrega", () => {
  it("cada estado visible tiene su valor en la base", () => {
    expect(resolverEntrega("pendiente")).toBe("nuevo");
    expect(resolverEntrega("preparado")).toBe("preparando");
    expect(resolverEntrega("enviado")).toBe("enviado");
    expect(resolverEntrega("entregado")).toBe("entregado");
    expect(resolverEntrega("cancelado")).toBe("cancelado");
  });

  it("solo se aceptan los cinco estados visibles", () => {
    expect(esEntregaVisible("preparado")).toBe(true);
    expect(esEntregaVisible("preparando")).toBe(false);
    expect(esEntregaVisible("confirmado")).toBe(false);
    expect(esEntregaVisible(undefined)).toBe(false);
  });
});

describe("notas del historial", () => {
  it("describen el cambio con los nombres que ve el administrador", () => {
    expect(notaCambioPago("pendiente_transferencia", "pagado")).toBe("Pago: Pendiente → Pagado");
    expect(notaCambioPago("pagado", "cancelado")).toBe("Pago: Pagado → Cancelado");
    expect(notaCambioEntrega("nuevo", "preparando")).toBe("Entrega: Pendiente → Preparado");
    expect(notaCambioEntrega("enviado", "entregado")).toBe("Entrega: Enviado → Entregado");
  });

  it("no filtran los valores crudos de la base", () => {
    expect(notaCambioPago("pendiente_pago_online", "pagado")).not.toContain("pendiente_pago_online");
    expect(notaCambioEntrega("preparando", "enviado")).not.toContain("preparando");
  });
});

describe("notas internas", () => {
  it("recorta los espacios", () => {
    expect(limpiarNotas("  algo  ")).toBe("algo");
  });

  it("una nota vacía se guarda como null y no como cadena vacía", () => {
    expect(limpiarNotas("")).toBeNull();
    expect(limpiarNotas("   ")).toBeNull();
    expect(limpiarNotas(undefined)).toBeNull();
    expect(limpiarNotas(42)).toBeNull();
  });

  it("acota el largo", () => {
    expect(limpiarNotas("x".repeat(5000))!.length).toBe(2000);
  });
});

describe("validación de ajustes", () => {
  const base = { descripcion: "Pulsera adicional" };

  it("acepta solo venta extra", () => {
    const r = validarAjuste({ ...base, revenue: "70000", cost: "0" });
    expect(r).toEqual({ ok: true, ajuste: { descripcion: "Pulsera adicional", revenue: 70000, cost: 0 } });
  });

  it("acepta solo costo extra", () => {
    const r = validarAjuste({ descripcion: "Segundo intento de delivery", revenue: "0", cost: "25000" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ajuste).toMatchObject({ revenue: 0, cost: 25000 });
  });

  it("acepta los dos a la vez", () => {
    const r = validarAjuste({ ...base, revenue: 70000, cost: 9500 });
    expect(r.ok).toBe(true);
  });

  it("rechaza los dos en cero", () => {
    expect(validarAjuste({ ...base, revenue: "0", cost: "0" })).toEqual({
      ok: false,
      error: "sin_monto",
    });
    expect(validarAjuste({ ...base })).toEqual({ ok: false, error: "sin_monto" });
    expect(validarAjuste({ ...base, revenue: "", cost: "" })).toEqual({
      ok: false,
      error: "sin_monto",
    });
  });

  it("rechaza montos negativos", () => {
    expect(validarAjuste({ ...base, revenue: "-1000" })).toEqual({
      ok: false,
      error: "monto_negativo",
    });
    expect(validarAjuste({ ...base, cost: -5 })).toEqual({ ok: false, error: "monto_negativo" });
  });

  it("rechaza lo que no es un entero", () => {
    expect(validarAjuste({ ...base, revenue: "abc" })).toEqual({
      ok: false,
      error: "monto_invalido",
    });
    // El guaraní no tiene centavos: un decimal se rechaza en lugar de
    // redondearse a espaldas de quien lo carga.
    expect(validarAjuste({ ...base, revenue: 1000.5 })).toEqual({
      ok: false,
      error: "monto_invalido",
    });
    expect(validarAjuste({ ...base, revenue: "1e5" })).toEqual({
      ok: false,
      error: "monto_invalido",
    });
  });

  it("acepta el separador de miles que se escribe a mano", () => {
    const r = validarAjuste({ ...base, revenue: "180.000" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ajuste.revenue).toBe(180_000);
  });

  it("rechaza montos que no entrarían en la columna", () => {
    expect(validarAjuste({ ...base, revenue: MAX_MONTO + 1 })).toEqual({
      ok: false,
      error: "monto_fuera_de_rango",
    });
  });

  it("exige descripción", () => {
    expect(validarAjuste({ descripcion: "", revenue: "1000" })).toEqual({
      ok: false,
      error: "descripcion_requerida",
    });
    expect(validarAjuste({ descripcion: "   ", revenue: "1000" })).toEqual({
      ok: false,
      error: "descripcion_requerida",
    });
    expect(validarAjuste({ revenue: "1000" })).toEqual({
      ok: false,
      error: "descripcion_requerida",
    });
  });

  it("valida el monto antes que la descripción: el error más útil primero", () => {
    // Con los dos mal, lo que falta primero es el monto.
    expect(validarAjuste({ descripcion: "", revenue: "-1" }).ok).toBe(false);
    expect(validarAjuste({ descripcion: "", revenue: "-1" })).toEqual({
      ok: false,
      error: "monto_negativo",
    });
  });

  it("acota la descripción", () => {
    const r = validarAjuste({ descripcion: "d".repeat(1000), revenue: "1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ajuste.descripcion.length).toBe(300);
  });
});

describe("resumen financiero del pedido", () => {
  const pedido = {
    total: 289_000,
    extra_revenue_total: 0,
    product_cost_total: 28_500,
    logistics_cost: 20_000,
    extra_cost_total: 0,
  };

  it("ingreso y costo actualizados", () => {
    const r = resumenPedido(pedido);
    expect(r.ingresoActualizado).toBe(289_000);
    expect(r.costoActualizado).toBe(48_500);
    expect(r.ganancia).toBe(240_500);
  });

  it("un ingreso extra sube la ganancia", () => {
    const r = resumenPedido({ ...pedido, extra_revenue_total: 25_000 });
    expect(r.ingresoActualizado).toBe(314_000);
    expect(r.ganancia).toBe(265_500);
  });

  it("un costo extra baja la ganancia", () => {
    const r = resumenPedido({ ...pedido, extra_cost_total: 15_000 });
    expect(r.costoActualizado).toBe(63_500);
    expect(r.ganancia).toBe(225_500);
  });

  it("el margen se calcula sobre el ingreso actualizado", () => {
    const r = resumenPedido({
      total: 100_000,
      extra_revenue_total: 0,
      product_cost_total: 40_000,
      logistics_cost: 0,
      extra_cost_total: 0,
    });
    expect(r.margen).toBeCloseTo(0.6, 10);
  });

  it("sin ingreso no hay margen, y no hay división por cero", () => {
    const r = resumenPedido({
      total: 0,
      extra_revenue_total: 0,
      product_cost_total: 10_000,
      logistics_cost: 0,
      extra_cost_total: 0,
    });
    expect(r.margen).toBeNull();
    expect(r.ganancia).toBe(-10_000);
    expect(Number.isNaN(r.ganancia)).toBe(false);
  });

  it("los nulos de la base se tratan como cero", () => {
    const r = resumenPedido({
      total: null,
      extra_revenue_total: null,
      product_cost_total: null,
      logistics_cost: null,
      extra_cost_total: null,
    });
    expect(r).toEqual({
      ingresoActualizado: 0,
      costoActualizado: 0,
      ganancia: 0,
      margen: null,
    });
  });
});
