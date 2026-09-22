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
export const bloque = (doc, { x, y, etiqueta, valor, detalle, alinear = 'left', tam = 10.5 }) => {
  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text(etiqueta.toUpperCase(), x, y, { align: alinear, charSpace: 0.4 });

  doc.setFont('helvetica', 'bold').setFontSize(tam).setTextColor(...COLOR.texto);
  doc.text(valor, x, y + 5.6, { align: alinear });

  if (detalle) {
    doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
    doc.text(detalle, x, y + 10.4, { align: alinear });
  }
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
    doc.text(etiqueta.toUpperCase(), derecha - 5, y + alto * 0.33, { align: 'right', charSpace: 0.4 });
  }
  doc.setFont('helvetica', 'bold').setFontSize(tamValor).setTextColor(...COLOR.acento);
  doc.text(valor, derecha - 5, y + alto * (etiquetaIzquierda ? 0.68 : 0.79), { align: 'right' });
};

/** Pie con numeración, escrito al final porque antes no se sabe el total. */
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
