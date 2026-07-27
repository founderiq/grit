/**
 * Stub de `server-only` para los tests.
 *
 * El paquete real lanza al importarse fuera del entorno de servidor de Next,
 * lo que impediría testear los módulos que lo usan. Este alias vive solo en
 * `vitest.config.ts`: el build de Next sigue usando el paquete real, así que
 * la protección contra imports desde componentes de cliente no se debilita.
 */
export {};
