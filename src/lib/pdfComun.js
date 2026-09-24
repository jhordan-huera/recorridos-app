/**
 * Piezas compartidas por los documentos en PDF (estado de cuenta de recorridos
 * y de riegos).
 *
 * Están aquí y no duplicadas en cada informe para que los dos documentos no
 * puedan divergir: si mañana cambia el color de acento o el formato de la
 * moneda, cambia en un sitio. Cada informe conserva su propia maquetación,
 * que es lo único que de verdad difiere entre ellos.
 *
 * Decisiones de impresión, comunes a ambos:
 *  · Sin rayado alterno ni cabeceras de color sólido: en papel gastan tinta y
 *    ensucian la lectura. Línea fina bajo cada fila, fondo muy tenue en el
 *    encabezado y una regla marcada que lo separa del cuerpo.
 *  · Un único color de acento, y solo en reglas, el membrete y los totales. El
 *    resto es escala de grises, que es lo que mejor se imprime y mejor envejece.
 */

export const COLOR = {
  texto: [17, 24, 39],
  suave: [107, 114, 128],
  tenue: [156, 163, 175],
  linea: [226, 232, 240],
  acento: [10, 77, 140],
  tinte: [243, 246, 250],  // fondo del encabezado de tabla y del recuadro total
  blanco: [255, 255, 255],
};

export const MARGEN = 18;

/* Ecuador usa el dólar y, en comprobantes, el punto como separador decimal
   (así los emite el SRI). `es-EC` daría "$239,86", que en una factura local se
   lee como un error de formato. */
export const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const hora = (valor) => (valor ? String(valor).slice(0, 5) : '—');
export const dosDigitos = (n) => String(n).padStart(2, '0');

/** dd/mm/aaaa con ceros. `toLocaleDateString` devolvía "14/9/2026". */
export const fechaCorta = (d) => `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "lun 01" — el día de la semana ayuda a comprobar el patrón de servicio. */
export const etiquetaDia = (dia, mes, anio) => {
  const fecha = new Date(anio, mes - 1, Number(dia));
  return `${DIAS_SEMANA[fecha.getDay()]} ${dosDigitos(dia)}`;
};

/** Etiqueta pequeña en versalitas + valor debajo. */
/**
 * Un texto partido en como mucho `maxLineas` líneas de `ancho` mm. Si ni así
 * cabe, la última se recorta con "…" en lugar de salirse de su columna.
 */
const ajustar = (doc, texto, ancho, maxLineas) => {
  if (!ancho) return [texto];
  const lineas = doc.splitTextToSize(String(texto), ancho);
  if (lineas.length <= maxLineas) return lineas;
  let ultima = lineas.slice(maxLineas - 1).join(' ');
  while (ultima.length > 1 && doc.getTextWidth(`${ultima}…`) > ancho) ultima = ultima.slice(0, -1).trimEnd();
  return [...lineas.slice(0, maxLineas - 1), `${ultima}…`];
};

/**
 * Etiqueta, valor y detalle apilados ("Emitido por", "Periodo"...).
 *
 * `ancho` es lo que hay hasta la columna siguiente. Sin él, un nombre largo
 * —"María Fernanda Salazar Villacís"— llegaba hasta el bloque de al lado y,
 * con una palabra más, se montaba encima. El valor se parte en dos líneas y,
 * si aun así no cabe, se recorta; el detalle baja lo que haga falta.
 */
export const bloque = (doc, { x, y, etiqueta, valor, detalle, alinear = 'left', tam = 10.5, ancho = null }) => {
  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text(etiqueta.toUpperCase(), x, y, { align: alinear, charSpace: 0.4 });

  doc.setFont('helvetica', 'bold').setFontSize(tam).setTextColor(...COLOR.texto);
  const lineas = ajustar(doc, valor, ancho, 2);
  const interlinea = tam * 0.42;   // mm por línea a este cuerpo
  doc.text(lineas, x, y + 5.6, { align: alinear, lineHeightFactor: 1.15 });

  if (detalle) {
    doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
    const extra = (lineas.length - 1) * interlinea;
    doc.text(ajustar(doc, detalle, ancho, 1), x, y + 10.4 + extra, { align: alinear });
  }
};

/**
 * Rótulo de sección ("RESUMEN DEL PERIODO", "DETALLE…").
 *
 * En versalitas pequeñas y gris claro se perdía al abrir el PDF en el móvil,
 * donde la página entra a un tercio de su tamaño. Va un punto más grande y en
 * el gris medio, no en el tenue: sigue siendo secundario, pero se lee.
 */
export const rotulo = (doc, texto, x, y) => {
  doc.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(...COLOR.suave);
  doc.text(texto, x, y, { charSpace: 0.4 });
};

/**
 * Texto alineado a la derecha con espaciado entre letras.
 *
 * jsPDF, con align: 'right', calcula el ancho SIN el charSpace y luego lo
 * dibuja con él: el texto se corría hacia la derecha tanto como el espaciado
 * acumulado (unos 7 mm en "TOTAL DEL PERIODO"), y se salía de su recuadro y
 * del margen. Aquí se mide el ancho real y se dibuja alineado a la izquierda
 * desde donde tiene que empezar para terminar justo en `x`.
 */
export const textoALaDerecha = (doc, texto, x, y, charSpace = 0) => {
  const ancho = doc.getTextWidth(texto) + charSpace * Math.max(0, texto.length - 1);
  doc.text(texto, x - ancho, y, { charSpace });
};

export const regla = (doc, y, desde, ancho, grosor = 0.2, color = COLOR.linea) => {
  doc.setDrawColor(...color).setLineWidth(grosor);
  doc.line(desde, y, desde + ancho, y);
};

/** Membrete: marca cuadrada + nombre. Se repite reducido en las páginas 2+. */
export const membrete = (doc, y, tam = 10) => {
  doc.setFillColor(...COLOR.acento);
  doc.roundedRect(MARGEN, y, tam, tam, 1.4, 1.4, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(tam * 0.7).setTextColor(...COLOR.blanco);
  doc.text('R', MARGEN + tam / 2, y + tam * 0.685, { align: 'center' });

  doc.setFont('helvetica', 'bold').setFontSize(tam * 0.82).setTextColor(...COLOR.texto);
  doc.text('RECORRIDOS', MARGEN + tam + 4.5, y + tam * 0.66, { charSpace: 1.3 });
};

/** Recuadro de total con filete de acento en el canto. */
export const recuadroTotal = (doc, { x, y, ancho, alto, etiqueta, valor, derecha, tamValor = 19, etiquetaIzquierda = false }) => {
  doc.setFillColor(...COLOR.tinte);
  doc.rect(x, y, ancho, alto, 'F');
  doc.setFillColor(...COLOR.acento);
  doc.rect(x, y, 1.4, alto, 'F');

  // En el encabezado la etiqueta va encima del importe; en el cierre, a su
  // izquierda y en la misma línea, que es como se lee un total de factura.
  if (etiquetaIzquierda) {
    doc.setFont('helvetica', 'bold').setFontSize(7.4).setTextColor(...COLOR.texto);
    doc.text(etiqueta.toUpperCase(), x + 6, y + alto * 0.63, { charSpace: 0.3 });
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.suave);
    textoALaDerecha(doc, etiqueta.toUpperCase(), derecha - 5, y + alto * 0.33, 0.4);
  }
  doc.setFont('helvetica', 'bold').setFontSize(tamValor).setTextColor(...COLOR.acento);
  doc.text(valor, derecha - 5, y + alto * (etiquetaIzquierda ? 0.68 : 0.79), { align: 'right' });
};

/** Pie con numeración, escrito al final porque antes no se sabe el total. */
/**
 * Cabecera reducida de las páginas de continuación.
 *
 * Devuelve el callback que espera autoTable: la primera página ya trae el
 * membrete completo, así que solo se pinta de la segunda en adelante.
 */
export const cabeceraDeContinuacion = (doc, { etiqueta, numeroDoc, periodo, util, derecha }) => (
  ({ pageNumber }) => {
    if (pageNumber === 1) return;
    membrete(doc, 12, 7.5);
    doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
    doc.text(`${etiqueta} N.º ${numeroDoc}  ·  ${periodo}`, derecha, 17.5, { align: 'right' });
    regla(doc, 22, MARGEN, util, 0.4, COLOR.acento);
  }
);

export const pintarPies = (doc, { numeroDoc, usuario, alto, util, derecha, documento = 'Estado de cuenta' }) => {
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    regla(doc, alto - 16, MARGEN, util);
    doc.setFont('helvetica', 'normal').setFontSize(6.8).setTextColor(...COLOR.tenue);
    doc.text(
      `${documento} N.º ${numeroDoc}  ·  ${usuario.nombre || ''}  ·  Documento informativo, no constituye comprobante tributario`,
      MARGEN, alto - 11
    );
    doc.text(`${p} de ${paginas}`, derecha, alto - 11, { align: 'right' });
  }
};
