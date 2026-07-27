/**
 * Textos del panel administrativo.
 *
 * Separados de `lib/content.ts` a propósito: ese archivo es la copy pública
 * (landing, producto, checkout) y no tiene por qué viajar junto con el admin
 * ni al revés.
 */

export const ADMIN = {
  marca: "GRIT",
  titulo: "GRIT — Administración",

  login: {
    encabezado: "Panel administrativo",
    sub: "Ingresá con tu cuenta para continuar.",
    email: "Email",
    emailPlaceholder: "tu@email.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    boton: "Ingresar",
    cargando: "Ingresando…",
    // Mensaje único para cualquier fallo: no revela si el email existe, si la
    // contraseña es incorrecta o si la cuenta está bloqueada.
    error: "No pudimos iniciar sesión. Revisá tus datos e intentá de nuevo.",
    nota: "Acceso restringido al equipo de GRIT.",
  },

  sesion: {
    salir: "Salir",
    saliendo: "Saliendo…",
  },

  autorizado: {
    mensaje: "Panel administrativo conectado correctamente.",
    detalle:
      "La autenticación y la autorización están funcionando. Las secciones del panel llegan en las próximas fases.",
  },

  noAutorizado: {
    titulo: "Acceso no autorizado",
    detalle:
      "Tu cuenta existe, pero no tiene permiso para entrar al panel. Pedile a un administrador que te habilite.",
  },

  sinConfiguracion: {
    titulo: "Panel no disponible",
    detalle:
      "Este entorno todavía no tiene configurado el acceso al panel. Revisá las variables del servidor.",
  },
} as const;
