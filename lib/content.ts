/**
 * Contenido / copy de la landing de Grit.
 * Centralizado acá para mantener las secciones limpias y facilitar
 * futuras iteraciones de copy sin tocar la maquetación.
 *
 * NOTA DE MARCA: el tono es auténtico, exigente sin juzgar, optimista pero
 * realista. Nunca urgencia falsa, culpa ni promesas mágicas.
 */

export const RITUAL_STEPS = [
  {
    numero: "01",
    titulo: "Tocá",
    etiqueta: "Acercás el celular a la cruz",
    descripcion: "No hay que descargar, ni buscar nada. Se abre directamente.",
    activo: true,
  },
  {
    numero: "02",
    titulo: "Leé",
    etiqueta: "El versículo de hoy",
    descripcion:
      "Uno solo, el que toca hoy. En Reina-Valera o en palabras simples, como prefieras.",
    activo: true,
  },
  {
    numero: "03",
    titulo: "Volvé",
    etiqueta: "Mañana otra vez",
    descripcion:
      "No hace falta acordarse. La pulsera está puesta y el hábito se hace solo.",
    activo: true,
  },
] as const;

/**
 * Vista previa del mensaje diario que se muestra en la sección "El contenido".
 * La fecha ya no se guarda acá: se calcula en el cliente con <FechaHoy />.
 */
export const CONTENIDO_EJEMPLO = {
  etiqueta: "GRIT · HOY",
  texto:
    "«Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.»",
  referencia: "Salmo 46:1",
  accion: "Hoy, lo que te pesa, no lo cargues solo.",
} as const;

export const CONTENIDO_TIPOS = [
  {
    titulo: "El versículo de hoy",
    descripcion:
      "Uno solo por día, con una lectura breve de la Biblia para acompañarlo. Para leer en la mañana o cuando lo necesites.",
  },
  {
    titulo: "La palabra para lo que estés viviendo",
    descripcion:
      "Ansiedad, tristeza, perdón, familia, trabajo, salud, decisiones, fuerza. Elegís y los versículos siguen esa línea.",
  },
  {
    titulo: "Buscá lo que necesites",
    descripcion:
      "Escribí lo que estás viviendo y en segundos encontrás en la Biblia algo para ese momento. Guardá lo que te llegó y compartilo si querés.",
  },
] as const;

export const PRODUCT_SPECS = [
  { label: "Material", valor: "Tejido elástico premium, tacto suave" },
  { label: "Símbolo", valor: "Cruz bordada en hilo, no estampada" },
  { label: "Color y talle", valor: "Negro, talle único elástico" },
  { label: "Uso", valor: "Entreno, agua, rutina diaria" },
  { label: "Precio", valor: "115.000 Gs" },
] as const;

export type FAQ = {
  pregunta: string;
  respuesta: string;
};

export const FAQS: FAQ[] = [
  {
    pregunta: "¿Qué es Grit, exactamente?",
    respuesta:
      "Una pulsera que te acerca la Palabra de Dios todos los días. Tocás la cruz con el celular y se abre el versículo de hoy y otras herramientas.",
  },
  {
    pregunta: "¿Funciona con mi celular?",
    respuesta:
      "Funciona con la gran mayoría de los celulares actuales, Android y iPhone. Si el tuyo es antiguo, escribinos antes de comprar y lo verificamos en un minuto. Debe tener tecnología de lectura NFC.",
  },
  {
    pregunta: "¿Necesito descargar una app?",
    respuesta:
      "No. El toque abre el contenido directo en el navegador de tu celular. No hay nada que instalar.",
  },
  {
    pregunta: "¿Se paga alguna mensualidad?",
    respuesta:
      "No. Pagás la pulsera una sola vez y el contenido es tuyo para siempre. La Palabra no se cobra.",
  },
  {
    pregunta: "¿Cómo la activo la primera vez?",
    respuesta:
      "En la caja viene un código. Lo ingresás una sola vez y queda lista. Si lo perdés, nos escribís por WhatsApp y te damos otro.",
  },
  {
    pregunta: "¿Qué versión de la Biblia leo?",
    respuesta:
      "Reina-Valera 1960, la de toda la vida, y Traducción en Lenguaje Actual, para leerla en palabras simples. Cambiás de una a otra cuando quieras.",
  },
  {
    pregunta: "¿Qué contenido recibo?",
    respuesta:
      "El versículo de cada día, con una idea corta para llevarlo al día. Podés elegir la categoría según lo que estés viviendo, buscar lo que te pasa y guardar lo que te llegó.",
  },
  {
    pregunta: "¿De qué material es?",
    respuesta:
      "Tejido elástico premium, de tacto suave. La cruz va bordada en hilo, no estampada: no se despega ni se borra con el tiempo.",
  },
  {
    pregunta: "¿Aguanta el día a día?",
    respuesta:
      "Sí. Está hecha para acompañarte entrenando, en el agua y en la rutina. No hay que cuidarla.",
  },
  {
    pregunta: "¿Qué talle elijo?",
    respuesta:
      "Por el momento tenemos un talle único y elástica: se adapta a la mayoría de las muñecas, de mujer y de hombre.",
  },
  {
    pregunta: "¿Hacen envíos a todo el país?",
    respuesta:
      "Sí, a Asunción, Gran Asunción y todo el interior. Coordinamos el envío apenas confirmás tu pedido.",
  },
  {
    pregunta: "¿Cómo pago?",
    respuesta:
      "Transferencia o tarjeta. Te pasamos los datos al cerrar el pedido.",
  },
];


/* ============================================================
   Página de producto (/producto) — Product Experience handoff v1.0

   Todo el copy de este bloque es final y está aprobado. No reescribir,
   acortar ni traducir. Voseo paraguayo, sin emoji.
   ============================================================ */

/** Formato de moneda del ecommerce: `Gs. 199.000`. Solo /producto, carrito
 *  y checkout — la landing conserva su formato propio (`85.000 Gs`). */
export const fmtGs = (n: number) => `Gs. ${n.toLocaleString("es-PY")}`;

export type ProductoImagen = { src: string; alt: string };

/**
 * Galería de fotos, en el orden aprobado.
 * Es data: para cambiar una foto alcanza con editar esta lista, sin tocar
 * <ProductoGaleria />.
 *
 * NOTA: hoy `producto.jpg` y `producto-par.jpg` son el mismo archivo en
 * /public/img (md5 idéntico), así que las posiciones 1 y 4 se ven iguales.
 * Se mantiene la composición aprobada; al llegar la foto real del par solo
 * hay que reemplazar el archivo.
 */
export const PRODUCTO_GALERIA: ProductoImagen[] = [
  { src: "/img/producto.jpg", alt: "Pulsera NFC GRIT — Colección Fe" },
  { src: "/img/producto-muneca.jpg", alt: "Pulsera GRIT puesta en la muñeca" },
  {
    src: "/img/producto-cruz.jpg",
    alt: "Detalle de la cruz bordada de la pulsera GRIT",
  },
  { src: "/img/producto-par.jpg", alt: "Par de pulseras GRIT" },
  { src: "/img/producto-logo.jpg", alt: "Detalle del logo GRIT bordado" },
];

/* ------------------------------------------------------------
   Catálogo — fuente única de verdad de precios
   ------------------------------------------------------------ */

export type BundleId = "1" | "2" | "3";

export type ProductoBundle = {
  id: BundleId;
  /** Pulseras que incluye el pack. */
  unidades: number;
  /** Nombre corto — el que se muestra en la página de producto. */
  nombre: string;
  /** Nombre largo — el que usan el carrito y el checkout. */
  nombreLargo: string;
  /** Línea de apoyo debajo del título. */
  soporte: string;
  precio: number;
  /** Precio anterior tachado. 0 = el bundle no tiene precio de comparación. */
  compare: number;
  tag: string | null;
  /** Los packs fijos no admiten cantidad; solo el pack de 1 tiene stepper. */
  fijo: boolean;
};

export const PRODUCTO_BUNDLES: ProductoBundle[] = [
  {
    id: "1",
    unidades: 1,
    nombre: "1 Pulsera GRIT",
    nombreLargo: "1 Pulsera GRIT",
    soporte: "Para empezar tu hábito diario de fe.",
    precio: 115_000,
    compare: 0,
    tag: null,
    fijo: false,
  },
  {
    id: "2",
    unidades: 2,
    nombre: "2 Pulseras GRIT",
    nombreLargo: "Pack de 2 Pulseras GRIT",
    soporte: "Una para vos y una para alguien que querés.",
    precio: 199_000,
    compare: 230_000,
    tag: "Ideal para regalar",
    fijo: true,
  },
  {
    id: "3",
    unidades: 3,
    nombre: "3 Pulseras GRIT",
    nombreLargo: "Pack de 3 Pulseras GRIT",
    soporte: "Para compartir con familia o amigos.",
    precio: 269_000,
    compare: 345_000,
    tag: "Más elegido",
    fijo: true,
  },
];

/** Bundle preseleccionado en la página de producto. */
export const BUNDLE_POR_DEFECTO: BundleId = "2";

/** Pulsera promocional del carrito (upsell de una sola vez). Fase 3. */
export const EXTRA = {
  nombre: "Pulsera GRIT extra",
  precio: 70_000,
  compare: 115_000,
  descuento: "35% OFF",
} as const;

/** Precio de referencia de una pulsera suelta. */
export const PRECIO_UNIT = 115_000;

/** Pulseras a partir de las cuales el envío estándar es gratis. */
export const ENVIO_GRATIS_DESDE = 3;

/* ------------------------------------------------------------
   Columna de compra
   ------------------------------------------------------------ */

export const PRODUCTO_COMPRA = {
  eyebrow: "Pulsera NFC · Colección Fe",
  titulo: "Pulsera NFC GRIT",
  descripcion:
    "Un recordatorio diario de fe en la muñeca. Acercás tu celular, tocás y recibís un versículo para tu día. Sin app. Sin batería.",
  ctaAgregar: "Agregar al carrito",
  ctaComprar: "Comprar ahora",
  entrega: "Entregamos tu pedido en menos de 1 día",
  envioGratisStrip: { titulo: "Envío gratis", pill: "Gratis" },
} as const;

/** Rating agregado que se muestra junto al título y en la sección Opiniones. */
export const PRODUCTO_RATING = {
  promedio: 4.9,
  total: 213,
  etiquetaCorta: "213 opiniones",
  etiquetaLarga: "213 opiniones verificadas",
} as const;

export const PRODUCTO_URGENCIA = {
  titulo: "Se están agotando rápido",
  sub: "Debido a la alta demanda, la cantidad disponible es limitada",
  porcentaje: 89,
  vendido: "89% vendido",
  restante: "Quedan pocas unidades",
  restanteCorto: "Quedan pocas",
} as const;

export type ProductoTrustItem = { icono: "truck" | "shield" | "gift" | "tap"; label: string };

export const PRODUCTO_TRUST: ProductoTrustItem[] = [
  { icono: "truck", label: "Envío disponible" },
  { icono: "shield", label: "Compra segura" },
  { icono: "gift", label: "Listo para regalar" },
  { icono: "tap", label: "Soporte WhatsApp" },
];

export const PRODUCTO_TESTIMONIO = {
  titulo: "La uso todos los días desde que llegó.",
  texto:
    "El tap funciona de una y el versículo de la mañana ya es parte de mi rutina. La calidad es mejor de lo que esperaba.",
  nombre: "— Camila R.",
  verificada: "Compra verificada",
  foto: "/img/camila-r.jpg",
  fotoAlt: "Camila R.",
  estrellas: 5,
} as const;

/* ------------------------------------------------------------
   Secciones
   ------------------------------------------------------------ */

export const PRODUCTO_VIDA_REAL = {
  eyebrow: "Personas reales · Fe real",
  titulo: "Así se ve en la vida real.",
  sub: "Personas reales usando GRIT, abriendo su pulsera y probando el tap NFC.",
  captions: [
    "Mi versículo del día",
    "Ideal para regalar",
    "Tap NFC",
    "Sin app",
    "Un recordatorio diario",
  ],
} as const;

export const PRODUCTO_PASOS = [
  {
    numero: "01",
    titulo: "Ponete la pulsera",
    descripcion:
      "Llevá GRIT con vos todos los días como un recordatorio de fe y propósito.",
  },
  {
    numero: "02",
    titulo: "Acercá tu celular",
    descripcion:
      "Tocá la pulsera con tu celular compatible con NFC. Sin apps ni configuraciones.",
  },
  {
    numero: "03",
    titulo: "Recibí tu versículo",
    descripcion:
      "Abrí el link y recibí una palabra para tu día, con una lectura breve.",
  },
] as const;

export const PRODUCTO_RECORDATORIO = {
  eyebrow: "Por qué GRIT",
  titulo: "A veces solo necesitás un recordatorio",
  body: "Entre el trabajo, el ruido y la rutina, es fácil pasar el día sin parar un segundo. GRIT fue creada para ayudarte a volver a lo importante: una palabra, una pausa y un momento con Dios.",
  puntos: [
    "Te ayuda a crear un hábito diario.",
    "Te recuerda volver a la fe durante el día.",
    "Es simple, rápido y sin fricción.",
  ],
} as const;

export const PRODUCTO_BENEFICIOS = [
  {
    titulo: "Fe diaria en segundos",
    descripcion: "Un versículo o reflexión cada día, sin buscar nada.",
  },
  {
    titulo: "Siempre con vos",
    descripcion: "La llevás en la muñeca como recordatorio constante.",
  },
  {
    titulo: "Sin apps ni batería",
    descripcion: "Solo acercás el celular y listo.",
  },
  {
    titulo: "Un regalo con propósito",
    descripcion: "Ideal para alguien que necesita ánimo, fe o dirección.",
  },
  {
    titulo: "Diseño simple",
    descripcion: "Fácil de combinar y usar todos los días.",
  },
  {
    titulo: "Experiencia digital",
    descripcion: "Un producto físico conectado a contenido vivo.",
  },
] as const;

export type ProductoOpinion = {
  titulo: string;
  texto: string;
  firma: string;
};

export const PRODUCTO_OPINIONES: ProductoOpinion[] = [
  {
    titulo: "Me ayuda a empezar el día con otra cabeza.",
    texto:
      "La uso a la mañana antes de salir. Es simple, pero me recuerda frenar un segundo y leer algo que me ordena el día.",
    firma: "— María G. · Compra verificada",
  },
  {
    titulo: "Se la regalé a mi mamá y le encantó.",
    texto:
      "Me gustó porque no es un regalo común. Tiene algo más personal y con sentido.",
    firma: "— Sofía R. · Compra verificada",
  },
  {
    titulo: "El tap funciona súper fácil.",
    texto:
      "Pensé que iba a ser complicado, pero acercás el celular y aparece el link. No tuve que instalar nada.",
    firma: "— Lucas M. · Compra verificada",
  },
  {
    titulo: "Es como tener un recordatorio de fe en la muñeca.",
    texto: "Cada vez que la veo, me acuerdo de volver a lo importante.",
    firma: "— Ana P. · Compra verificada",
  },
];

export const PRODUCTO_INCLUYE = [
  "Pulsera NFC GRIT",
  "Acceso a versículos y reflexiones diarias",
  "Instrucciones simples de uso",
  "Packaging premium, listo para regalar",
  "Soporte por WhatsApp",
] as const;

export const PRODUCTO_REGALO = {
  eyebrow: "Para regalar",
  titulo: "Un regalo simple, pero con mucho significado.",
  sub: "De esos regalos que no quedan en un cajón: se usan todos los días y acompañan de verdad.",
  cta: "Elegir mi bundle",
  ocasiones: [
    "Para tu pareja",
    "Para mamá o papá",
    "Para amigos",
    "Para alguien que la está pasando difícil",
    "Para vos mismo",
  ],
} as const;

export const PRODUCTO_CTA_FINAL = {
  titulo: "Empezá tu hábito diario de fe con GRIT",
  sub: "Una pulsera. Un toque. Una palabra para tu día.",
  cta: "Comprar ahora",
} as const;

/** FAQ de la página de producto — 11 preguntas aprobadas.
 *  Distinta del set `FAQS` de la landing, que se conserva sin cambios. */
export const FAQ_PRODUCTO: FAQ[] = [
  {
    pregunta: "¿Necesito descargar una app?",
    respuesta:
      "No. Acercás tu celular a la pulsera y el versículo se abre directo en el navegador. Sin cuentas, sin descargas.",
  },
  {
    pregunta: "¿Cómo funciona la pulsera NFC?",
    respuesta:
      "Lleva un chip NFC pasivo dentro de la cruz. Al acercar tu celular, se abre el link con el versículo y la lectura del día.",
  },
  {
    pregunta: "¿Funciona con cualquier celular?",
    respuesta:
      "Funciona con la gran mayoría de los celulares con NFC: iPhone 7 en adelante y casi todos los Android de los últimos años.",
  },
  {
    pregunta: "¿La pulsera necesita batería?",
    respuesta: "No. El chip es pasivo: no se carga, no se apaga, no falla.",
  },
  {
    pregunta: "¿Qué contenido voy a recibir?",
    respuesta:
      "Un versículo distinto cada día, acompañado de una reflexión breve para tu jornada.",
  },
  {
    pregunta: "¿El contenido cambia todos los días?",
    respuesta:
      "Sí. Cada día tenés un versículo nuevo, sin que tengas que hacer nada.",
  },
  {
    pregunta: "¿Puedo regalarla?",
    respuesta:
      "Sí. Llega en un packaging premium, lista para regalar. Es uno de los usos más elegidos.",
  },
  {
    pregunta: "¿Qué pasa si no sé usar NFC?",
    respuesta:
      "Te enviamos instrucciones simples con tu pedido y te acompañamos por WhatsApp hasta que funcione.",
  },
  {
    pregunta: "¿Es resistente al agua?",
    respuesta:
      "Aguanta el uso diario: sudor, salpicaduras y lavarte las manos. Evitá sumergirla por mucho tiempo.",
  },
  {
    pregunta: "¿Cuánto tarda la entrega?",
    respuesta:
      "En Asunción y Gran Asunción, 1 a 2 días hábiles. En el interior del país, 2 a 4 días hábiles por encomienda.",
  },
  {
    pregunta: "¿Qué métodos de pago aceptan?",
    respuesta:
      "Transferencia bancaria y pago online con tarjeta de crédito o débito.",
  },
];

export const FAQ_PRODUCTO_NOTA =
  "¿Tenés otra duda? Escribinos por WhatsApp y te respondemos en el día.";

/* ------------------------------------------------------------
   Carrito lateral
   ------------------------------------------------------------ */

export const CARRITO = {
  titulo: "Tu carrito",
  cerrar: "Cerrar carrito",
  itemMeta: "Colección Fe · Talle único",
  quitar: "Quitar",
  thumb: "/img/producto.jpg",
  progreso: {
    completo: "¡Tenés envío gratis en tu pedido!",
    falta1: "Solo te falta agregar una pulsera más para tener envío gratis",
    faltaN: (n: number) => `Te faltan ${n} pulseras para tener envío gratis`,
    contador: (n: number) => `${n} de ${ENVIO_GRATIS_DESDE} pulseras`,
    etiqueta: "Envío gratis",
  },
  totales: {
    subtotal: "Subtotal",
    ahorras: "Ahorrás",
    total: "Total",
    nota: "Envío calculado en el checkout",
    cta: "Finalizar compra",
    seguridad: "Compra segura",
  },
  vacio: {
    titulo: "Tu carrito está vacío",
    sub: "Elegí tu pack y empezá tu hábito diario.",
    cta: "Ver los packs",
  },
} as const;

/* ------------------------------------------------------------
   Checkout
   ------------------------------------------------------------ */

export type ZonaId = "asuncion" | "interior";

export type ZonaEnvio = {
  id: ZonaId;
  nombre: string;
  /** Nombre corto, el que se usa en la línea del resumen. */
  corto: string;
  plazo: string;
  costo: number;
};

export const ENVIOS: Record<ZonaId, ZonaEnvio> = {
  asuncion: {
    id: "asuncion",
    nombre: "Asunción / Gran Asunción",
    corto: "Gran Asunción",
    plazo: "1 a 2 días hábiles",
    costo: 20_000,
  },
  interior: {
    id: "interior",
    nombre: "Interior y resto de ciudades",
    corto: "Interior",
    plazo: "Encomienda · 2 a 4 días hábiles",
    costo: 30_000,
  },
};

export const ZONA_POR_DEFECTO: ZonaId = "asuncion";

export const VIP = {
  nombre: "Envío Prioritario VIP",
  detalle: "Despacho inmediato en 24hs",
  etiqueta: "Opcional",
  costo: 10_000,
} as const;

/** Datos bancarios que se muestran en el checkout y que copia el botón. */
export const BANCO = [
  { etiqueta: "Entidad", valor: "ueno bank" },
  { etiqueta: "Titular", valor: "Emilio Manuel Morales Gauto" },
  { etiqueta: "Cédula", valor: "4.488.640" },
  { etiqueta: "Número de cuenta", valor: "619537908" },
  { etiqueta: "Alias", valor: "4488640" },
  { etiqueta: "WhatsApp", valor: "0992 363 483" },
] as const;

export const CHECKOUT = {
  barra: "Entregamos tu pedido en menos de 1 día · Envíos a todo el país",
  barraCorta: "Entregamos tu pedido en menos de 1 día",
  seguridad: "Compra segura",
  titulo: "Finalizar compra",
  sub: "Completá tus datos para confirmar tu pedido de forma rápida y segura.",

  seccionDatos: "Datos de contacto y envío",
  seccionEnvio: "Envío",
  seccionPago: "Método de pago",
  seccionResumen: "Resumen del pedido",

  campos: {
    nombre: {
      label: "Nombre completo",
      placeholder: "Tu nombre y apellido",
      error: "Ingresá tu nombre completo.",
    },
    telefono: {
      label: "Teléfono / WhatsApp",
      placeholder: "09xx xxx xxx",
      error: "Ingresá un número de WhatsApp válido.",
    },
    ciudad: {
      label: "Ciudad",
      placeholder: "Asunción",
      error: "Ingresá tu ciudad.",
    },
    direccion: {
      label: "Dirección",
      placeholder: "Calle y número",
      error: "Ingresá tu dirección.",
    },
    ubicacion: {
      label: "Ubicación exacta (opcional)",
      placeholder: "Pegá acá el enlace de tu ubicación",
      ayuda: "Podés copiar y pegar un enlace de Google Maps.",
      error: "Ingresá un enlace válido o dejá el campo vacío.",
    },
  },

  pago: {
    transferencia: "Transferencia bancaria",
    sinRecargo: "Sin recargo",
    tarjeta: "Pago online con tarjeta crédito/débito",
    tarjetaCorto: "Pago online con tarjeta",
    tarjetaNota:
      "Al confirmar tu pedido, te redirigimos a una página de pago segura para completar el pago con tu tarjeta.",
    copiar: "Copiar datos de la cuenta",
    copiado: "Datos copiados",
    copiarError: "No pudimos copiar. Seleccioná los datos manualmente.",
    instruccion: {
      inicio: "Para confirmar tu pedido",
      resto:
        ", realizá la transferencia y enviá el comprobante por WhatsApp al ",
      cierre: ". Apenas lo recibimos, despachamos tu GRIT.",
    },
  },

  resumen: {
    subtotal: "Subtotal",
    ahorro: "Ahorrás",
    extra: EXTRA.nombre,
    envio: "Envío",
    gratis: "Gratis",
    vip: VIP.nombre,
    total: "Total del pedido",
    itemMeta: "Colección Fe · Talle único",
    cta: "Confirmar pedido",
    ctaEnviando: "Confirmando…",
  },

  footerLegal: "© 2026 GRIT · Todos los derechos reservados",
} as const;

/* ------------------------------------------------------------
   Página de confirmación (/gracias)
   ------------------------------------------------------------ */

export const GRACIAS = {
  eyebrow: "Confirmación",
  titulo: "¡Pedido registrado!",
  mensajeTransferencia:
    "Recibimos correctamente tu pedido. Para confirmarlo, realizá la transferencia y enviá el comprobante por WhatsApp.",
  mensajeTarjeta:
    "Recibimos correctamente tu pedido. El pago online todavía está pendiente.",
  etiquetas: {
    numero: "Número de pedido",
    total: "Total del pedido",
    metodo: "Método de pago",
    envio: "Envío",
    estadoPago: "Estado del pago",
    productos: "Tu pedido",
  },
  metodos: {
    transferencia: "Transferencia bancaria",
    tarjeta: "Tarjeta de crédito/débito",
  } as Record<string, string>,
  estadosPago: {
    pendiente_transferencia: "Pendiente de transferencia",
    pendiente_pago_online: "Pendiente de pago online",
    pagado: "Pagado",
    fallido: "Fallido",
    cancelado: "Cancelado",
  } as Record<string, string>,
  ctaComprobante: "Enviar comprobante por WhatsApp",
  ctaInicio: "Volver al inicio",
  noEncontrado: {
    eyebrow: "Confirmación",
    titulo: "No encontramos ese pedido",
    mensaje:
      "El enlace puede haber expirado o estar incompleto. Si ya hiciste tu pedido, escribinos por WhatsApp y lo verificamos.",
    cta: "Escribinos por WhatsApp",
  },
} as const;

export const CART_UPSELL = {
  titulo: "Agregá 1 pulsera extra con",
  destacado: EXTRA.descuento,
  sub: "Sumás una más y desbloqueás más valor por menos.",
  cta: "Agregar",
  thumb: "/img/producto-cruz.jpg",
  quitarLabel: "Quitar Pulsera GRIT extra",
} as const;

/** Enlaces de contacto / redes. Centralizados para reusar en CTA y footer. */
export const LINKS = {
  whatsapp:
    "https://wa.me/595992363483?text=Hola%20Grit%2C%20quiero%20conseguir%20mi%20pulsera",
  whatsappNumero: "595992363483",
  /** El número tal como se muestra en pantalla. */
  whatsappVisible: "0992 363 483",
  instagram: "https://instagram.com/grit.py",
  contacto: "mailto:hola@grit.py",
} as const;
