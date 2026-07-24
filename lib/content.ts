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
  { label: "Precio", valor: "85.000 Gs" },
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
   Página de producto (/producto)
   ============================================================ */

export type ProductoImagen = { src: string; alt: string };

/** Galería de fotos — reusa las fotos de producto ya existentes en /public/img. */
export const PRODUCTO_GALERIA: ProductoImagen[] = [
  { src: "/img/producto.jpg", alt: "Pulseras Grit — Colección Fe" },
  { src: "/img/producto-muneca.jpg", alt: "Pulsera Grit puesta en la muñeca" },
  {
    src: "/img/producto-cruz.jpg",
    alt: "Detalle de la cruz bordada en la pulsera Grit",
  },
  { src: "/img/producto-par.jpg", alt: "Par de pulseras Grit" },
  { src: "/img/producto-logo.jpg", alt: "Detalle del logo Grit bordado" },
];

export const PRODUCTO_PASOS = [
  {
    titulo: "Ponete la pulsera",
    descripcion:
      "Ajustala a tu muñeca. Es elástica, cómoda y de talle único: se adapta a la mayoría.",
  },
  {
    titulo: "Acercá tu celular",
    descripcion:
      "Un toque simple, sin apps ni configuraciones. Funciona con la mayoría de los celulares actuales.",
  },
  {
    titulo: "Recibí tu versículo",
    descripcion:
      "El versículo del día, con una lectura breve de la Biblia para acompañarlo.",
  },
] as const;

export const PRODUCTO_RECORDATORIO_PUNTOS = [
  "Te ayuda a crear un hábito diario de fe",
  "Te acerca Su Palabra en el medio del día",
  "Es simple, rápido y sin fricción",
] as const;

export const PRODUCTO_BENEFICIOS = [
  {
    titulo: "Tu fe en segundos",
    descripcion:
      "Un toque y accedés al versículo del día. Sin scroll, sin distracciones.",
  },
  {
    titulo: "Siempre con vos",
    descripcion: "La llevás puesta todo el día: entreno, trabajo, rutina.",
  },
  {
    titulo: "Sin apps ni batería",
    descripcion: "Chip NFC pasivo. No se carga, no se actualiza, no falla.",
  },
  {
    titulo: "Un regalo con propósito",
    descripcion: "Para vos o para alguien que necesita un recordatorio diario.",
  },
  {
    titulo: "Diseño simple",
    descripcion: "Minimalista, cómoda y pensada para durar en tu día a día.",
  },
  {
    titulo: "Contenido que se renueva",
    descripcion: "Un versículo distinto cada día, sin que tengas que hacer nada.",
  },
] as const;

export const PRODUCTO_INCLUYE = [
  "Pulsera Grit con chip NFC",
  "Acceso al versículo y la lectura diaria",
  "Instrucciones simples de uso",
  "Packaging premium, listo para regalar",
  "Soporte por WhatsApp",
] as const;

export const PRODUCTO_REGALO_ITEMS = [
  {
    titulo: "Para vos",
    descripcion: "Un recordatorio diario de quién decidiste ser.",
  },
  {
    titulo: "Para tu pareja",
    descripcion: "Una forma simple de acompañar su fe.",
  },
  {
    titulo: "Para un amigo",
    descripcion: "Un gesto con significado, no solo un objeto.",
  },
  {
    titulo: "Para quien lo necesita",
    descripcion:
      "Alguien que atraviesa un momento difícil y necesita un empujón.",
  },
] as const;

/** Enlaces de contacto / redes. Centralizados para reusar en CTA y footer. */
export const LINKS = {
  // Número placeholder de Paraguay — reemplazar por el real.
  whatsapp:
    "https://wa.me/595000000000?text=Hola%20Grit%2C%20quiero%20conseguir%20mi%20pulsera",
  instagram: "https://instagram.com/grit.py",
  contacto: "mailto:hola@grit.py",
} as const;
