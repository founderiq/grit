import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` lanza al importarse fuera del entorno de servidor de
      // Next. En los tests se apunta a un stub vacío para poder ejercitar los
      // módulos reales; la protección de build sigue intacta, porque el
      // alias existe únicamente acá (verificado: el build falla si un
      // componente de cliente importa lib/supabase-admin.ts).
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
