/**
 * Feature flags internos — configuración central, no variables de entorno.
 *
 * FASE 6E: GRIT acepta solo transferencia bancaria por un tiempo. La lógica,
 * las columnas, los estados y las migraciones de pago online y efectivo NO se
 * tocan: solo se dejan de OFRECER en las interfaces. Un pedido histórico con
 * `tarjeta` o `efectivo` se sigue leyendo y mostrando exactamente igual.
 *
 * Para reactivar un método, se cambia el valor acá — nada más. No hay que
 * tocar `lib/pedidos.ts`, `create_order`, `create_manual_order` ni ningún
 * componente: todos leen de este único lugar.
 */
export const PAGOS_FLAGS = {
  /** Pago online (`tarjeta`) en el checkout público y en el pedido manual. */
  onlinePaymentsEnabled: false,
  /** Efectivo en el pedido manual. El checkout público nunca lo ofreció. */
  manualCashPaymentsEnabled: false,
} as const;
