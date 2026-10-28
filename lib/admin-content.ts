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

    /** Las tres acciones de escritura del panel. */
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
      buscarAbandonados: "Buscar por nombre, WhatsApp o ciudad",
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
      abandonados: "No hay checkouts abandonados que coincidan con estos filtros.",
      abandonadosDetalle:
        "Se registran cuando alguien empieza el checkout y deja su nombre y su WhatsApp.",
    },

    error: {
      titulo: "No pudimos cargar los datos",
      detalle: "Probá de nuevo con el botón Actualizar.",
    },
  },

  detalle: {
    eyebrow: "Detalle de pedido",
    cerrar: "Cerrar el detalle",
    verDetalle: (numero: string) => `Ver el detalle del pedido ${numero}`,
    noEncontrado: "No encontramos ese pedido",
    noEncontradoDetalle: "Puede haber sido borrado o el enlace estar mal.",

    cliente: {
      titulo: "Cliente",
      nombre: "Nombre",
      whatsapp: "WhatsApp",
      ciudad: "Ciudad",
      direccion: "Dirección",
      ubicacion: "Ubicación",
      abrirUbicacion: "Abrir ubicación",
      sinUbicacion: "No proporcionada",
    },

    pedido: {
      titulo: "Pedido",
      origen: "Origen",
      fecha: "Fecha de venta",
      metodo: "Método de pago",
      zona: "Zona de entrega",
      envioGratis: "Delivery gratis para el cliente",
      vip: "Envío prioritario VIP",
      pago: "Estado de pago",
      entrega: "Estado de entrega",
      productos: "Productos",
      extra: "Extra",
      cantidad: "Cantidad",
      pulseras: (n: number) => (n === 1 ? "1 pulsera" : `${n} pulseras`),
      modelosElegidos: "Modelos elegidos",
      pulseraExtra: "Pulsera extra",
    },

    finanzas: {
      titulo: "Resumen financiero",
      ingresos: "Ingresos",
      subtotal: "Subtotal",
      descuento: "Descuento",
      envio: "Envío cobrado al cliente",
      vip: "Envío prioritario VIP",
      extras: "Ingresos extra",
      total: "Total actualizado",
      costos: "Costos",
      producto: "Costo de producto",
      logistica: "Costo logístico",
      costosExtra: "Costos extra",
      costoTotal: "Costo total",
      resultado: "Resultado",
      ganancia: "Ganancia bruta",
      margen: "Margen bruto",
      nota: "El costo de producto y el logístico son el snapshot del momento de la venta: no se recalculan.",
    },

    gestion: {
      titulo: "Gestión",
      pago: "Estado de pago",
      entrega: "Estado de entrega",
      notas: "Notas internas",
      notasPlaceholder: "Solo para el equipo. El cliente nunca las ve.",
      guardar: "Guardar cambios",
      guardando: "Guardando…",
    },

    ajustes: {
      titulo: "Agregar extra al pedido",
      revenue: "Venta extra en Gs.",
      cost: "Costo extra en Gs.",
      descripcion: "Detalle del extra",
      descripcionPlaceholder: "Ej: Cliente agregó una pulsera extra.",
      agregar: "Agregar extra",
      agregando: "Agregando…",
      ayuda:
        "Al menos uno de los dos montos tiene que ser mayor a cero. No modifica el costo original del producto ni el logístico.",
      historial: "Extras cargados",
      sinHistorial: "Todavía no hay extras cargados en este pedido.",
      venta: "Venta",
      costo: "Costo",
    },

    archivo: {
      titulo: "Archivo",
      archivado: "Pedido archivado",
      archivadoDetalle:
        "No aparece en «Activos» ni cuenta en las métricas. Sigue guardado con sus ítems y sus extras.",
      archivar: "Archivar pedido",
      archivando: "Archivando…",
      restaurar: "Restaurar pedido",
      restaurando: "Restaurando…",
      confirmar:
        "¿Archivar este pedido? Deja de contar en las métricas, pero no se borra y lo podés restaurar cuando quieras.",
      nota: "Archivar es un borrado lógico: el pedido nunca se elimina de la base.",
    },
  },

  /** Textos compartidos por los tres formularios del panel. */
  formulario: {
    cancelar: "Cancelar",
    cerrar: "Cerrar",
    guardar: "Guardar",
    guardando: "Guardando…",
    salirSinGuardar:
      "Hay cambios sin guardar. ¿Querés cerrar de todas formas y perderlos?",
  },

  manual: {
    eyebrow: "Pedido manual",
    titulo: "Cargar un pedido",
    intro:
      "Para las ventas cerradas por WhatsApp, en persona o por Instagram. Se guarda con los mismos costos y entra en las métricas como cualquier otro pedido.",

    cliente: "Cliente y entrega",
    nombre: "Nombre",
    whatsapp: "WhatsApp",
    ciudad: "Ciudad",
    direccion: "Dirección",
    ubicacion: "Ubicación (opcional)",
    ubicacionPlaceholder: "https://maps.app.goo.gl/…",
    zona: "Zona de entrega",

    productos: "Productos",
    agregarLinea: "Agregar producto",
    quitarLinea: "Quitar",
    cantidad: "Cantidad",
    extra: "Sumar la pulsera extra promocional",
    extraDetalle: "Una sola por pedido, igual que en el ecommerce.",

    cobro: "Cobro",
    envioCobrado: "Envío cobrado al cliente en Gs.",
    envioAyuda:
      "Es lo que paga el cliente. El costo logístico real lo calcula el sistema según la zona.",
    descuento: "Descuento en Gs.",
    vip: "Envío Prioritario VIP",

    estados: "Estado y fecha",
    metodo: "Método de pago",
    metodos: [
      { id: "transferencia", etiqueta: "Transferencia bancaria" },
      { id: "efectivo", etiqueta: "Efectivo" },
      { id: "tarjeta", etiqueta: "Pago online / tarjeta" },
    ],
    pago: "Estado de pago",
    entrega: "Estado de entrega",
    fecha: "Fecha de venta",
    notas: "Notas internas (opcional)",

    resumen: "Resumen",
    subtotal: "Subtotal",
    descuentoResumen: "Descuento",
    envio: "Envío",
    vipResumen: "Envío VIP",
    total: "Total",
    pulseras: "Pulseras",

    crear: "Crear pedido",
    creando: "Creando…",
    otro: "Cargar otro pedido",
    sinTelegram: "No se envía aviso por Telegram: ese aviso es solo para pedidos del checkout web.",
  },

  costos: {
    eyebrow: "Configuración",
    titulo: "Costos del negocio",
    intro:
      "Se usan para calcular la ganancia de cada pedido nuevo. Todos los montos son enteros en guaraníes.",
    producto: "Costo por pulsera",
    productoAyuda: "Lo que le cuesta al negocio cada pulsera.",
    asuncion: "Costo logístico · Asunción",
    asuncionAyuda: "Costo real de una entrega en Asunción o Gran Asunción.",
    interior: "Costo logístico · Interior",
    interiorAyuda: "Costo real de un envío al interior o encomienda.",
    aviso: "Los cambios se aplican solamente a pedidos nuevos.",
    avisoDetalle:
      "Cada pedido guardó su costo al momento de la venta y no se recalcula nunca.",
    actualizado: "Última actualización",
  },

  adSpend: {
    eyebrow: "Inversión publicitaria",
    titulo: "Ad Spend",
    intro:
      "Lo invertido en publicidad, por día. Alimenta el CPA, el ROAS, la ganancia neta y el margen neto del rango que estés mirando.",
    fecha: "Fecha",
    monto: "Monto en Gs.",
    nota: "Nota (opcional)",
    notaPlaceholder: "Ej: campaña de Instagram.",
    agregar: "Registrar inversión",
    agregando: "Registrando…",
    editar: "Editar",
    guardarEdicion: "Guardar cambios",
    cancelarEdicion: "Cancelar edición",
    eliminar: "Eliminar",
    eliminando: "Eliminando…",
    confirmar: "¿Eliminar esta inversión? Deja de contar en las métricas.",
    si: "Sí, eliminar",
    no: "No",
    historial: "Inversiones registradas",
    sinHistorial: "Todavía no hay inversiones registradas.",
    nota_borrado: "Eliminar es un borrado lógico: la fila no se pierde.",
  },

  abandonados: {
    archivar: "Archivar",
    archivando: "Archivando…",
    restaurar: "Restaurar",
    restaurando: "Restaurando…",
    archivado: "Archivado",
    fallo: "No se pudo. Reintentar",
    convertido: "Convertido",
    abandonado: "Abandonado",
    sinNombre: "Sin nombre",
    pasos: {
      contacto: "Contacto",
      entrega: "Entrega",
      seleccion: "Selección",
      pago: "Pago",
      review: "Revisión",
    } as Record<string, string>,
  },

  /** Navegación entre las secciones del panel. */
  secciones: {
    etiqueta: "Secciones del panel",
    items: [
      { id: "pedidos", etiqueta: "Pedidos", href: "/admin" },
      { id: "galeria", etiqueta: "Galería de producto", href: "/admin/galeria" },
    ],
  },

  galeria: {
    eyebrow: "Contenido de /producto",
    titulo: "Galería de producto",
    detalle:
      "La foto #1 es la principal. Los cambios se publican en /producto al momento, sin deploy.",
    verProducto: "Ver /producto",
    subir: "Subir imagen",
    principal: "Principal",
    posicion: (n: number) => `#${n}`,
    arrastrar: (n: number) => `Arrastrar la foto ${n} para cambiar su posición`,
    subirUno: (n: number) => `Subir la foto ${n} un lugar`,
    bajarUno: (n: number) => `Bajar la foto ${n} un lugar`,
    reemplazar: "Reemplazar",
    eliminar: "Eliminar",
    sinDescripcion: "Sin descripción",
    origenEstatica: "Original del sitio",
    origenStorage: "Subida desde el panel",
    oculta: "Oculta",
    rotaTitulo: "Archivo no disponible",
    vacio: "Todavía no hay imágenes en la galería.",
    vacioDetalle: "Mientras tanto, /producto muestra las fotos originales del sitio.",
    ultimaNoSeElimina: "Es la única imagen: subí otra antes de eliminarla.",

    orden: {
      sinGuardar: "Cambiaste el orden. Guardalo para publicarlo en /producto.",
      guardar: "Guardar orden",
      guardando: "Guardando…",
      descartar: "Descartar",
      bloqueado: "Guardá o descartá el nuevo orden antes de subir, reemplazar o eliminar.",
      ayudaMovil: "Usá ↑ y ↓ para cambiar el orden.",
      ayudaEscritorio: "Arrastrá las fotos o usá ↑ y ↓ para cambiar el orden.",
    },

    archivo: {
      eyebrowSubir: "Galería de producto",
      tituloSubir: "Subir imagen",
      eyebrowReemplazar: (n: number) => `Foto #${n}`,
      tituloReemplazar: "Reemplazar imagen",
      elegir: "Elegir imagen",
      cambiar: "Elegir otra",
      soltar: "o soltala acá",
      formatos: "JPG, PNG o WebP · hasta 20 MB",
      optimizando: "Optimizando…",
      vistaPrevia: "Vista previa",
      vistaPreviaNota: "Así se va a ver en la galería: completa, sin recortes.",
      original: "Original",
      optimizada: "Se guarda",
      actual: "Imagen actual",
      nueva: "Nueva",
      conservaPosicion: (n: number) => `La nueva imagen se queda en la posición #${n}.`,
      alFinal: (n: number) => `Se agrega al final, en la posición #${n}.`,
      alt: "Descripción (texto alternativo)",
      altAyuda: "Qué se ve en la foto. La leen los lectores de pantalla y Google. Opcional.",
      altPlaceholder: "Ej.: Pulsera GRIT en la muñeca, junto a una Biblia abierta",
      subir: "Subir imagen",
      subiendo: "Subiendo…",
      reemplazar: "Reemplazar imagen",
      reemplazando: "Reemplazando…",
    },

    eliminarConfirmacion: {
      eyebrow: (n: number) => `Foto #${n}`,
      titulo: "¿Eliminar esta imagen de la galería?",
      detalle:
        "Deja de mostrarse en /producto y las fotos de abajo suben un lugar. No se puede deshacer.",
      principal: "Es la foto principal: la que hoy está en #2 pasa a ser la principal.",
      si: "Sí, eliminar",
      eliminando: "Eliminando…",
    },

    mensajes: {
      subida: (n: number) => `Imagen subida en la posición #${n}. Ya está en /producto.`,
      subidaSinPosicion: "Imagen subida. Ya está en /producto.",
      reemplazada: "Imagen reemplazada. Mantiene su posición y ya está en /producto.",
      eliminada: "Imagen eliminada. El orden se actualizó en /producto.",
      ordenGuardado: "Orden guardado. /producto ya muestra el nuevo orden.",
    },

    /** Mensajes genéricos: el detalle real queda en el log del servidor. */
    errores: {
      sin_archivo: "Elegí una imagen.",
      muy_grande: "La imagen es demasiado pesada. Elegí una de hasta 20 MB.",
      tipo_no_permitido: "Formato no permitido. Usá JPG, PNG o WebP.",
      no_es_imagen: "El archivo no es una imagen válida.",
      tipo_no_coincide: "El archivo no es una imagen válida.",
      muy_chica: "La imagen es muy chica: necesita al menos 200 px por lado.",
      dimensiones: "La imagen no pasó por la optimización. Volvé a elegirla.",
      no_se_pudo_optimizar:
        "No pudimos preparar esta imagen en tu navegador. Probá con otra o exportala como JPG.",
      alt_invalido: "La descripción puede tener hasta 300 caracteres.",
      no_existe: "Esa imagen ya no está en la galería. Actualizamos la lista.",
      ultima: "La galería necesita al menos una imagen. Subí otra antes de eliminar esta.",
      orden_desactualizado:
        "La galería cambió mientras ordenabas. Actualizamos la lista: revisá el orden y volvé a guardar.",
      no_autorizado: "Tu sesión ya no tiene permiso para editar.",
      datos_invalidos: "Revisá los datos e intentá de nuevo.",
      error_interno: "No pudimos guardar el cambio. Probá de nuevo.",
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
