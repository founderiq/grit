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
    activo: false,
  },
  {
    numero: "03",
    titulo: "Volvé",
    etiqueta: "Mañana otra vez",
    descripcion:
      "No hace falta acordarse. La pulsera está puesta y el hábito se hace solo.",
    activo: false,
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
      "Uno solo por día. De acuerdo a la categoría que prefieras, según el momento de tu vida.",
  },
  {
    titulo: "La palabra para lo que estés viviendo",
    descripcion:
      "Ansiedad, tristeza, perdón, familia, trabajo, salud, decisiones, fuerza. Elegís y los versículos siguen esa línea.",
  },
  {
    titulo: "Buscá, guardá, compartí",
    descripcion:
      "Escribí lo que te pasa y encontrá qué dice la Biblia. Guardá lo que te llegó. Compartilo si querés.",
  },
] as const;

export const PRODUCT_SPECS = [
  { label: "Material", valor: "Tejido elástico premium, tacto suave" },
  { label: "Símbolo", valor: "Cruz bordada en hilo, no estampada" },
  { label: "Color y talle", valor: "Negro, talle único elástico" },
  { label: "Uso", valor: "Entreno, agua, rutina diaria" },
  { label: "Precio", valor: "85.000 Gs" },
] as const;

/**
 * Media de comunidad (UGC): imágenes o videos reales.
 * Vacío por defecto: la grilla no se renderiza hasta que haya contenido real.
 */
export type UgcItem = {
  tipo: "imagen" | "video";
  src: string;
  alt?: string;
};

export const UGC_MEDIA: UgcItem[] = [];

/**
 * Testimonios reales de la comunidad.
 * Vacío por defecto: el bloque no se renderiza hasta que haya testimonios reales.
 */
export type Testimonial = {
  nombre: string;
  ciudad: string;
  texto: string;
  foto?: string;
};

export const TESTIMONIOS: Testimonial[] = [];

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

/** Enlaces de contacto / redes. Centralizados para reusar en CTA y footer. */
export const LINKS = {
  // Número placeholder de Paraguay — reemplazar por el real.
  whatsapp:
    "https://wa.me/595000000000?text=Hola%20Grit%2C%20quiero%20conseguir%20mi%20pulsera",
  instagram: "https://instagram.com/grit.py",
  contacto: "mailto:hola@grit.py",
} as const;
