"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { ADMIN } from "@/lib/admin-content";

/**
 * Login del panel, dentro de /admin.
 *
 * No existe ninguna ruta /admin-login: si no hay sesión, esta pantalla ocupa
 * /admin. Tampoco hay registro público, recuperación de contraseña ni creación
 * de cuentas: las cuentas se crean a mano en Supabase Auth y se habilitan en
 * `admin_users`.
 *
 * El error es siempre el mismo texto, sin importar la causa. Distinguir
 * "ese email no existe" de "la contraseña es incorrecta" le confirmaría a
 * cualquiera qué direcciones tienen cuenta.
 *
 * Iniciar sesión no autoriza nada por sí solo: al terminar se hace
 * `router.refresh()` y es el servidor el que vuelve a decidir qué mostrar,
 * consultando `admin_users`.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;

    setError("");
    setCargando(true);

    try {
      const { error: fallo } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (fallo) {
        setError(ADMIN.login.error);
        setCargando(false);
        return;
      }

      // La contraseña no sobrevive al intento, ni siquiera en memoria.
      setPassword("");
      // El estado del panel lo resuelve el servidor, no este componente.
      router.refresh();
    } catch {
      setError(ADMIN.login.error);
      setCargando(false);
    }
  }

  return (
    <div className="grit-on-light flex min-h-screen flex-col items-center justify-center bg-hueso px-5 py-12 text-tinta">
      <div className="w-full max-w-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- El panel usa
            <img> a propósito, no next/image: importarlo acá haría que webpack
            parta el chunk que comparte con la landing y le sumaría ~0,6 KB al
            First Load JS de "/". Es un SVG estático servido desde /public, así
            que el optimizador no aportaría nada. */}
        <img src="/img/logo-dark.svg" alt="Grit" width={90} height={18} className="h-[18px] w-auto" />

        <h1 className="m-0 mt-6 font-archivo text-[24px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] lg:text-[28px]">
          {ADMIN.login.encabezado}
          <span className="text-tierra-oscura">.</span>
        </h1>
        <p className="m-0 mt-2 text-[13.5px] leading-[1.6] text-gris-oscuro">
          {ADMIN.login.sub}
        </p>

        <form
          onSubmit={ingresar}
          noValidate
          className="mt-7 rounded-card border-hairline border-borde-claro bg-superficie-clara p-5"
        >
          <Input
            label={ADMIN.login.email}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={ADMIN.login.emailPlaceholder}
            autoComplete="email"
            required
          />

          <Input
            className="mt-4"
            label={ADMIN.login.password}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={ADMIN.login.passwordPlaceholder}
            autoComplete="current-password"
            required
          />

          {/* `role="alert"` para que un lector de pantalla lo anuncie sin que
              haya que mover el foco. */}
          {error && (
            <p role="alert" className="m-0 mt-4 text-[12.5px] leading-[1.5] text-tierra-oscura">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={cargando}
            className="mt-5"
          >
            {cargando ? ADMIN.login.cargando : ADMIN.login.boton}
          </Button>
        </form>

        <p className="m-0 mt-5 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro">
          {ADMIN.login.nota}
        </p>
      </div>
    </div>
  );
}
