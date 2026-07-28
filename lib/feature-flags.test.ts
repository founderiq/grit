import { describe, expect, it } from "vitest";
import { PAGOS_FLAGS } from "@/lib/feature-flags";

/**
 * Fase 6E: GRIT acepta solo transferencia bancaria por un tiempo.
 *
 * Este test fija el valor esperado de los flags mientras dure la fase, para
 * que un cambio accidental (no una decisión deliberada) se note en la
 * verificación en lugar de descubrirse en producción.
 */
describe("feature flags de pago", () => {
  it("pago online está apagado", () => {
    expect(PAGOS_FLAGS.onlinePaymentsEnabled).toBe(false);
  });

  it("efectivo en el pedido manual está apagado", () => {
    expect(PAGOS_FLAGS.manualCashPaymentsEnabled).toBe(false);
  });
});
