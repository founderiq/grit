"use client";

import { CartProvider } from "@/context/CartContext";
import CartDrawer from "./CartDrawer";

/**
 * Envoltorio de cliente que monta el carrito en las rutas que lo tienen.
 *
 * Se monta a nivel de ruta (/producto y, en la fase 4, /checkout) en lugar de
 * en app/layout.tsx para que la landing no cargue nada del carrito: sin
 * provider, sin drawer y sin JS extra. `children` sigue renderizándose en el
 * servidor, así que las secciones de producto siguen siendo componentes de
 * servidor.
 */
export default function CartRoot({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
