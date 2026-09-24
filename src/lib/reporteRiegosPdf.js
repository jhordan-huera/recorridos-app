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
  COLOR, MARGEN, dinero, MESES, mayuscula, dosDigitos, fechaCorta,
  bloque, regla, rotulo, membrete, textoALaDerecha, recuadroTotal, pintarPies,
} from './pdfComun.js';
import { tablaDeRiegos, ordenarRiegos, sumar, diasDistintos } from './tablasPdf.js';

/**
 * @param {object[]} riegos  Lista del periodo: { fecha, hora, costo }
 * @param {number}   mes     1-12
 * @param {number}   anio
 * @param {object}   usuario { nombre, usuario }
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
  const ordenados = ordenarRiegos(riegos);

  const total = sumar(ordenados);
  const dias = diasDistintos(ordenados);
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
  textoALaDerecha(doc, 'ESTADO DE CUENTA · RIEGOS', derecha, 17.5, 0.4);
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
    valor: usuario.nombre || '—', detalle: usuario.usuario || '',
  });
  bloque(doc, {
    x: MARGEN + 58, y: 42, etiqueta: 'Periodo facturado',
    valor: periodo, detalle: rango,
  });

  regla(doc, 67, MARGEN, util);

  /* ── Resumen ────────────────────────────────────────────────────────────── */
  rotulo(doc, 'RESUMEN DEL PERIODO', MARGEN, 75);

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

  rotulo(doc, 'DETALLE', MARGEN, 104);

  /* ── Detalle a dos columnas ─────────────────────────────────────────────── */
  tablaDeRiegos(doc, autoTable, {
    riegos: ordenados, mes, anio, startY: 108,
    numeroDoc, periodo, util, derecha,
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
