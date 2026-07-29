import { describe, expect, it } from "vitest";
import {
  calcularMetricas,
  esPedidoCancelado,
  esPedidoValido,
  type FilaMetrica,
} from "@/lib/admin-metricas";

/**
 * Las catorce métricas del panel.
 *
 * Es la parte del admin donde un error no se ve: un número mal calculado
 * parece un número. Por eso se prueba con pedidos armados a mano, sin base.
 */

const pedido = (over: Partial<FilaMetrica> = {}): FilaMetrica => ({
  total: 219_000,
  product_cost_total: 28_500,
  logistics_cost: 20_000,
  extra_cost_total: 0,
  extra_revenue_total: 0,
  source: "web",
  payment_status: "pagado",
  order_status: "confirmado",
  ...over,
});

describe("qué pedido entra en las métricas", () => {
  it("un pedido pagado y no cancelado es válido", () => {
    expect(esPedidoValido(pedido())).toBe(true);
  });

  it("un pedido pendiente NO es válido", () => {
    expect(esPedidoValido(pedido({ payment_status: "pendiente_transferencia" }))).toBe(false);
    expect(esPedidoValido(pedido({ payment_status: "pendiente_pago_online" }))).toBe(false);
  });

  it("un pedido pagado pero cancelado NO es válido", () => {
    expect(esPedidoValido(pedido({ order_status: "cancelado" }))).toBe(false);
  });

  it("cancelado incluye el pago fallido y el cancelado", () => {
    expect(esPedidoCancelado(pedido({ order_status: "cancelado" }))).toBe(true);
    expect(esPedidoCancelado(pedido({ payment_status: "cancelado" }))).toBe(true);
    expect(esPedidoCancelado(pedido({ payment_status: "fallido" }))).toBe(true);
    expect(esPedidoCancelado(pedido())).toBe(false);
  });
});

describe("ingreso y costo", () => {
  it("suma total y ajustes de ingreso", () => {
    const m = calcularMetricas(
      [pedido({ total: 219_000, extra_revenue_total: 25_000 })],
      0,
    );
    expect(m.ingresoTotal).toBe(244_000);
  });

  it("suma producto, logística y ajustes de costo", () => {
    const m = calcularMetricas(
      [pedido({ product_cost_total: 28_500, logistics_cost: 20_000, extra_cost_total: 5_000 })],
      0,
    );
    expect(m.costoProductoLogistica).toBe(53_500);
  });

  it("los pendientes no suman ingreso ni costo", () => {
    const m = calcularMetricas(
      [pedido(), pedido({ payment_status: "pendiente_transferencia" })],
      0,
    );
    expect(m.pedidosConfirmados).toBe(1);
    expect(m.ingresoTotal).toBe(219_000);
    expect(m.costoProductoLogistica).toBe(48_500);
  });

  it("los cancelados no suman ingreso, pero sí cuentan como cancelados", () => {
    const m = calcularMetricas([pedido(), pedido({ order_status: "cancelado" })], 0);
    expect(m.pedidosConfirmados).toBe(1);
    expect(m.ingresoTotal).toBe(219_000);
    expect(m.cancelados).toBe(1);
  });

  it("un pedido cancelado que nunca se pagó igual aparece en Cancelados", () => {
    const m = calcularMetricas(
      [pedido({ payment_status: "fallido", order_status: "nuevo" })],
      0,
    );
    expect(m.pedidosConfirmados).toBe(0);
    expect(m.cancelados).toBe(1);
  });
});

describe("ganancia y márgenes", () => {
  it("bruta = ingreso − costo; neta = bruta − ad spend", () => {
    const m = calcularMetricas([pedido({ total: 200_000 })], 30_000);
    expect(m.ingresoTotal).toBe(200_000);
    expect(m.costoProductoLogistica).toBe(48_500);
    expect(m.gananciaBruta).toBe(151_500);
    expect(m.gananciaNeta).toBe(121_500);
  });

  it("los márgenes se calculan sobre el ingreso", () => {
    const m = calcularMetricas([pedido({ total: 100_000, product_cost_total: 40_000, logistics_cost: 0 })], 10_000);
    expect(m.margenBruto).toBeCloseTo(0.6, 10);
    expect(m.margenNeto).toBeCloseTo(0.5, 10);
  });

  it("una ganancia negativa da margen negativo, no null", () => {
    const m = calcularMetricas(
      [pedido({ total: 10_000, product_cost_total: 30_000, logistics_cost: 0 })],
      0,
    );
    expect(m.gananciaBruta).toBe(-20_000);
    expect(m.margenBruto).toBeCloseTo(-2, 10);
  });
});

describe("AOV, CPA y ROAS", () => {
  it("AOV es el ingreso dividido los pedidos válidos", () => {
    const m = calcularMetricas([pedido({ total: 100_000 }), pedido({ total: 300_000 })], 0);
    expect(m.aov).toBe(200_000);
  });

  it("CPA es la inversión dividida los pedidos válidos", () => {
    const m = calcularMetricas([pedido(), pedido()], 100_000);
    expect(m.cpa).toBe(50_000);
  });

  it("ROAS es el ingreso dividido la inversión", () => {
    const m = calcularMetricas([pedido({ total: 300_000 })], 100_000);
    expect(m.roas).toBe(3);
  });

  it("los pendientes no diluyen el AOV", () => {
    const m = calcularMetricas(
      [pedido({ total: 200_000 }), pedido({ total: 999_000, payment_status: "pendiente_transferencia" })],
      0,
    );
    expect(m.aov).toBe(200_000);
  });
});

describe("nunca se divide por cero", () => {
  it("sin pedidos ni inversión, todo lo derivado es null", () => {
    const m = calcularMetricas([], 0);
    expect(m.aov).toBeNull();
    expect(m.cpa).toBeNull();
    expect(m.roas).toBeNull();
    expect(m.margenBruto).toBeNull();
    expect(m.margenNeto).toBeNull();
  });

  it("sin pedidos, los totales quedan en cero y no en NaN", () => {
    const m = calcularMetricas([], 50_000);
    expect(m.pedidosConfirmados).toBe(0);
    expect(m.ingresoTotal).toBe(0);
    expect(m.costoProductoLogistica).toBe(0);
    expect(m.gananciaBruta).toBe(0);
    expect(m.gananciaNeta).toBe(-50_000);
    for (const v of Object.values(m)) {
      expect(Number.isNaN(v as number)).toBe(false);
    }
  });

  it("con pedidos pero sin inversión, ROAS es null y el resto vale", () => {
    const m = calcularMetricas([pedido()], 0);
    expect(m.roas).toBeNull();
    expect(m.cpa).toBe(0);
    expect(m.aov).toBe(219_000);
  });

  it("solo pedidos pendientes: AOV y CPA quedan en null", () => {
    const m = calcularMetricas(
      [pedido({ payment_status: "pendiente_transferencia" })],
      80_000,
    );
    expect(m.pedidosConfirmados).toBe(0);
    expect(m.aov).toBeNull();
    expect(m.cpa).toBeNull();
    expect(m.gananciaNeta).toBe(-80_000);
  });

  it("ningún resultado es Infinity", () => {
    const m = calcularMetricas([pedido()], 0);
    for (const v of Object.values(m)) {
      expect(Number.isFinite(v as number) || v === null).toBe(true);
    }
  });
});

describe("valores rotos en la base no rompen la cuenta", () => {
  it("nulos se tratan como cero", () => {
    const m = calcularMetricas(
      [
        pedido({
          total: null,
          product_cost_total: null,
          logistics_cost: null,
          extra_cost_total: null,
          extra_revenue_total: null,
        }),
      ],
      0,
    );
    expect(m.ingresoTotal).toBe(0);
    expect(m.costoProductoLogistica).toBe(0);
    expect(m.pedidosConfirmados).toBe(1);
  });

  it("un ad spend negativo se ignora en lugar de inflar la ganancia", () => {
    const m = calcularMetricas([pedido()], -100_000);
    expect(m.adSpend).toBe(0);
    expect(m.gananciaNeta).toBe(m.gananciaBruta);
  });
});

describe("web contra manual", () => {
  it("separa el origen dentro de los pedidos válidos", () => {
    const m = calcularMetricas(
      [
        pedido({ source: "web" }),
        pedido({ source: "web" }),
        pedido({ source: "manual" }),
        // Este es manual pero está pendiente: no cuenta en ninguno de los dos.
        pedido({ source: "manual", payment_status: "pendiente_transferencia" }),
      ],
      0,
    );
    expect(m.pedidosWeb).toBe(2);
    expect(m.pedidosManuales).toBe(1);
    expect(m.pedidosWeb + m.pedidosManuales).toBe(m.pedidosConfirmados);
  });
});
