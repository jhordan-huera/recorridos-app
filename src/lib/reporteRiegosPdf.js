/**
 * Estado de cuenta mensual de riegos.
 *
 * Documento propio y no una sección del estado de cuenta de recorridos: son
 * servicios distintos y pueden cobrarse a personas distintas. Comparte el
 * aspecto con aquel a través de pdfComun.js, así que los dos se reconocen como
 * emitidos por el mismo negocio.
 *
 * Decisión de maquetación: cada riego son tres datos (día, hora y costo). Una
 * tabla a todo el ancho dejaría 10 cm de papel en blanco por fila, así que el
 * detalle va a DOS columnas y se lee hacia abajo por la izquierda y luego por
 * la derecha. Un mes entero cabe en una página en vez de tres.
 */

import {
  COLOR, MARGEN, dinero, MESES, mayuscula, hora, dosDigitos, fechaCorta,
  etiquetaDia, bloque, regla, membrete, recuadroTotal, pintarPies,
} from './pdfComun.js';

/**
 * @param {object[]} riegos  Lista del periodo: { fecha, hora, costo }
 * @param {number}   mes     1-12
 * @param {number}   anio
 * @param {object}   usuario { nombre, email }
 */
export const construirReporteRiegosPdf = async ({ riegos = [], mes, anio, usuario = {} }) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const derecha = ancho - MARGEN;

  /* ── Métricas ───────────────────────────────────────────────────────────── */
  const dia = (r) => Number(String(r.fecha).slice(8, 10));
  const ordenados = [...riegos].sort((a, b) => {
    const d = dia(a) - dia(b);
    return d !== 0 ? d : String(a.hora).localeCompare(String(b.hora));
  });

  const total = ordenados.reduce((suma, r) => suma + (parseFloat(r.costo) || 0), 0);
  const dias = new Set(ordenados.map(dia)).size;
  const promedio = ordenados.length ? total / ordenados.length : 0;

  const periodo = `${mayuscula(MESES[mes - 1])} ${anio}`;
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const rango = `Del 01 al ${ultimoDiaMes} de ${MESES[mes - 1]} de ${anio}`;
  const numeroDoc = `RG-${anio}-${dosDigitos(mes)}`;

  /* ── Membrete ───────────────────────────────────────────────────────────── */
  membrete(doc, 14);
  doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
  doc.text('Riego de césped', MARGEN + 14.5, 27.5);

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('ESTADO DE CUENTA · RIEGOS', derecha, 17.5, { align: 'right', charSpace: 0.4 });
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...COLOR.texto);
  doc.text(`N.º ${numeroDoc}`, derecha, 23.5, { align: 'right' });

  regla(doc, 32, MARGEN, util, 0.6, COLOR.acento);

  /* ── Identificación y total ─────────────────────────────────────────────── */
  const anchoCaja = 60;
  recuadroTotal(doc, {
    x: derecha - anchoCaja, y: 39, ancho: anchoCaja, alto: 21,
    etiqueta: 'Total del periodo', valor: dinero.format(total), derecha,
  });

  bloque(doc, {
    x: MARGEN, y: 42, etiqueta: 'Emitido por',
    valor: usuario.nombre || '—', detalle: usuario.email || '',
  });
  bloque(doc, {
    x: MARGEN + 58, y: 42, etiqueta: 'Periodo facturado',
    valor: periodo, detalle: rango,
  });

  regla(doc, 67, MARGEN, util);

  /* ── Resumen ────────────────────────────────────────────────────────────── */
  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('RESUMEN DEL PERIODO', MARGEN, 75, { charSpace: 0.4 });

  const metricas = [
    [String(ordenados.length), ordenados.length === 1 ? 'Riego' : 'Riegos'],
    [String(dias), `${dias === 1 ? 'Día' : 'Días'} con riego`],
    [dinero.format(promedio), 'Costo promedio'],
  ];
  metricas.forEach(([valor, etiqueta], i) => {
    const x = MARGEN + (util / metricas.length) * i;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...COLOR.texto);
    doc.text(valor, x, 84);
    doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
    doc.text(etiqueta, x, 89);
  });

  regla(doc, 96, MARGEN, util);

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('DETALLE', MARGEN, 104, { charSpace: 0.4 });

  /* ── Detalle a dos columnas ─────────────────────────────────────────────── */
  // Se parte por la mitad y no de forma alterna: así cada columna queda en
  // orden cronológico y se lee de arriba abajo, como una lista normal.
  const mitad = Math.ceil(ordenados.length / 2);
  const izquierda = ordenados.slice(0, mitad);
  const derechaCol = ordenados.slice(mitad);

  const celdas = (r) => (r
    ? [etiquetaDia(dia(r), mes, anio), hora(r.hora), dinero.format(parseFloat(r.costo) || 0)]
    : ['', '', '']);

  const filas = izquierda.map((r, i) => [...celdas(r), '', ...celdas(derechaCol[i])]);

  autoTable(doc, {
    startY: 108,
    margin: { left: MARGEN, right: MARGEN, top: 30, bottom: 24 },
    head: [['Día', 'Hora', 'Costo', '', 'Día', 'Hora', 'Costo']],
    body: filas,
    theme: 'plain',
    styles: {
      font: 'helvetica', fontSize: 8, textColor: COLOR.texto,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      valign: 'top',
    },
    headStyles: {
      fontStyle: 'bold', fontSize: 6.6, textColor: COLOR.texto,
      fillColor: COLOR.tinte, charSpace: 0.3,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
      lineWidth: { bottom: 0.5 }, lineColor: COLOR.acento,
    },
    bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 18, textColor: COLOR.suave },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },  // halign aplica también a la cabecera
      // Canal central: separa las dos mitades sin pintar nada.
      3: { cellWidth: 30, lineWidth: 0 },
      4: { cellWidth: 24, fontStyle: 'bold' },
      5: { cellWidth: 18, textColor: COLOR.suave },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: ({ row, column, cell, section }) => {
      // headStyles gana a columnStyles en las celdas de cabecera, así que el
      // halign de la columna de importes no llegaba a aplicarse y "Costo"
      // quedaba a la izquierda de sus propias cifras.
      if (section === 'head' && (column.index === 2 || column.index === 6)) {
        cell.styles.halign = 'right';
      }
      // Una fila sin pareja no debe pintar la línea inferior de la mitad vacía.
      if (section === 'body' && column.index >= 4 && !row.raw[4]) cell.styles.lineWidth = 0;
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber === 1) return;
      membrete(doc, 12, 7.5);
      doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
      doc.text(`Riegos N.º ${numeroDoc}  ·  ${periodo}`, derecha, 17.5, { align: 'right' });
      regla(doc, 22, MARGEN, util, 0.4, COLOR.acento);
    },
  });

  /* ── Cierre ─────────────────────────────────────────────────────────────── */
  let y = doc.lastAutoTable.finalY + 10;
  if (y > alto - 30) { doc.addPage(); y = 38; }

  recuadroTotal(doc, {
    x: derecha - 72, y, ancho: 72, alto: 15,
    etiqueta: 'Total a pagar', valor: dinero.format(total), derecha,
    tamValor: 15, etiquetaIzquierda: true,
  });

  doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
  doc.text(
    `${ordenados.length} ${ordenados.length === 1 ? 'riego' : 'riegos'} · ${dias} ${dias === 1 ? 'día' : 'días'}`,
    MARGEN, y + 6
  );
  doc.setFontSize(7).setTextColor(...COLOR.tenue);
  doc.text(`Emitido el ${fechaCorta(new Date())}`, MARGEN, y + 11);

  pintarPies(doc, { numeroDoc, usuario, alto, util, derecha, documento: 'Riegos' });

  return { doc, nombre: `Riegos ${numeroDoc}.pdf` };
};

/** Construye el documento y lo descarga. Es lo que usa la aplicación. */
export const generarReporteRiegosPdf = async (datos) => {
  const { doc, nombre } = await construirReporteRiegosPdf(datos);
  doc.save(nombre);
  return nombre;
};
