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

  panel: {
    eyebrow: "Panel de control",
    titulo: "Pedidos y oportunidades",

    actualizar: "Actualizar",
    actualizando: "Actualizando…",

    /** Acciones de escritura: llegan en la próxima fase, hoy deshabilitadas. */
    proximaFase: "Disponible en la próxima fase",
    acciones: [
      { id: "pedido-manual", etiqueta: "Crear pedido manual" },
      { id: "ad-spend", etiqueta: "Ad Spend" },
      { id: "costos", etiqueta: "Costos" },
    ],

    metricas: {
      eyebrow: "Métricas",
      titulo: "Resumen general del negocio",
      detalle: "Calculado por fecha de venta.",
      rango: "Rango",
      desde: "Desde",
      hasta: "Hasta",
    },

    listado: {
      tabs: [
        { id: "pedidos", etiqueta: "Pedidos" },
        { id: "abandonados", etiqueta: "Abandonados" },
      ],
      buscar: "Buscar por nombre, WhatsApp o pedido",
      buscarCorto: "Buscar",
      limpiar: "Limpiar búsqueda",
    },

    paginacion: {
      anterior: "Anterior",
      siguiente: "Siguiente",
      de: (pagina: number, total: number) => `Página ${pagina} de ${total}`,
    },

    vacio: {
      pedidos: "No hay pedidos que coincidan con estos filtros.",
      pedidosDetalle: "Probá ampliar el rango de fechas o quitar algún filtro.",
      abandonados: "No hay checkouts abandonados registrados todavía.",
      abandonadosDetalle:
        "La captura desde el checkout se activa en una fase posterior.",
    },

    error: {
      titulo: "No pudimos cargar los datos",
      detalle: "Probá de nuevo con el botón Actualizar.",
    },
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
