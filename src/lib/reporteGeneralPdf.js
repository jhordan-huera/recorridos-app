/**
 * Estado de cuenta general: transporte y riego en un solo documento.
 *
 * Es el que se emite cuando la cuenta usa los dos servicios. Dos documentos
 * sueltos obligaban a sumarlos a mano para saber cuánto se paga en total, que
 * es justo la pregunta que el papel tiene que contestar.
 *
 * Los detalles se conservan enteros, cada uno en su sección: el total dice
 * cuánto, y debajo está de dónde sale.
 */

import {
  COLOR, MARGEN, dinero, MESES, mayuscula, dosDigitos, fechaCorta,
  bloque, regla, rotulo, membrete, recuadroTotal, pintarPies,
} from './pdfComun.js';
import {
  tablaDeRecorridos, tablaDeRiegos, ordenarRecorridos, ordenarRiegos,
  sumar, diasDistintos, desglosePorTipo,
} from './tablasPdf.js';

const diaDe = (r) => (r._dia != null ? Number(r._dia) : Number(String(r.fecha ?? '').slice(8, 10)));

/**
 * @param {object[]} recorridos Lista del periodo
 * @param {object[]} riegos     Lista del periodo
 * @param {number}   mes        1-12
 * @param {number}   anio
 * @param {object}   usuario    { nombre, usuario }
 */
export const construirReporteGeneralPdf = async ({
  recorridos = [], riegos = [], mes, anio, usuario = {},
}) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const derecha = ancho - MARGEN;

  /* ── Métricas ───────────────────────────────────────────────────────────── */
  const losRecorridos = ordenarRecorridos(recorridos);
  const losRiegos = ordenarRiegos(riegos);

  const totalRecorridos = sumar(losRecorridos);
  const totalRiegos = sumar(losRiegos);
  const total = totalRecorridos + totalRiegos;

  // Días con algo registrado, venga de donde venga: sumar los días de cada
  // servicio contaría dos veces los que tienen recorrido y riego.
  const diasConActividad = new Set([
    ...losRecorridos.map(diaDe),
    ...losRiegos.map(diaDe),
  ]).size;

  const periodo = `${mayuscula(MESES[mes - 1])} ${anio}`;
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const rango = `Del 01 al ${ultimoDiaMes} de ${MESES[mes - 1]} de ${anio}`;
  const numeroDoc = `GN-${anio}-${dosDigitos(mes)}`;

  /* ── Membrete ───────────────────────────────────────────────────────────── */
  membrete(doc, 14);
  doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
  doc.text('Transporte y riego', MARGEN + 14.5, 27.5);

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('ESTADO DE CUENTA GENERAL', derecha, 17.5, { align: 'right', charSpace: 0.4 });
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...COLOR.texto);
  doc.text(`N.º ${numeroDoc}`, derecha, 23.5, { align: 'right' });

  regla(doc, 32, MARGEN, util, 0.6, COLOR.acento);

  /* ── Identificación y total ─────────────────────────────────────────────── */
  // El total va arriba a la derecha: es el dato que busca de inmediato quien
  // recibe el documento.
  recuadroTotal(doc, {
    x: derecha - 60, y: 39, ancho: 60, alto: 21,
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

  const porTipo = Object.entries(desglosePorTipo(losRecorridos))
    .map(([k, v]) => `${k} ${v}`).join('     ');
  if (porTipo) {
    doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
    doc.text(porTipo, derecha, 75, { align: 'right' });
  }

  const metricas = [
    [String(losRecorridos.length), losRecorridos.length === 1 ? 'Recorrido' : 'Recorridos'],
    [String(losRiegos.length), losRiegos.length === 1 ? 'Riego' : 'Riegos'],
    [String(diasConActividad), `${diasConActividad === 1 ? 'Día' : 'Días'} con actividad`],
    [String(losRecorridos.reduce((s, r) => s + (r.ninos?.length || 0), 0)), 'Traslados de pasajeros'],
  ];
  metricas.forEach(([valor, etiqueta], i) => {
    const x = MARGEN + (util / metricas.length) * i;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...COLOR.texto);
    doc.text(valor, x, 84);
    doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
    doc.text(etiqueta, x, 89);
  });

  /* ── Desglose: de dónde sale el total ───────────────────────────────────── */
  // Se enseña la suma completa, no solo el resultado: quien recibe el
  // documento puede comprobar que las dos partes dan el total sin buscarlo
  // en las tablas de abajo.
  regla(doc, 96, MARGEN, util);

  rotulo(doc, 'DESGLOSE', MARGEN, 104);

  const lineas = [
    ['Transporte', totalRecorridos, losRecorridos.length],
    ['Riego de césped', totalRiegos, losRiegos.length],
  ];

  let yDesglose = 111;
  lineas.forEach(([etiqueta, importe, cuantos]) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...COLOR.texto);
    doc.text(etiqueta, MARGEN, yDesglose);
    doc.setFontSize(7.6).setTextColor(...COLOR.suave);
    doc.text(`${cuantos} ${cuantos === 1 ? 'registro' : 'registros'}`, MARGEN + 42, yDesglose);
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...COLOR.texto);
    doc.text(dinero.format(importe), derecha, yDesglose, { align: 'right' });
    yDesglose += 7;
  });

  regla(doc, yDesglose - 3.5, MARGEN, util, 0.4);
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...COLOR.texto);
  doc.text('Total del periodo', MARGEN, yDesglose + 2.5);
  doc.setFontSize(11).setTextColor(...COLOR.acento);
  doc.text(dinero.format(total), derecha, yDesglose + 2.5, { align: 'right' });

  /* ── Detalle de recorridos ──────────────────────────────────────────────── */
  const comun = { mes, anio, numeroDoc, periodo, util, derecha, etiquetaContinuacion: 'Estado de cuenta general' };
  let y = yDesglose + 14;

  if (losRecorridos.length) {
    rotulo(doc, 'DETALLE DE TRANSPORTE', MARGEN, y);
    y = tablaDeRecorridos(doc, autoTable, { ...comun, recorridos: losRecorridos, startY: y + 4 });
  }

  /* ── Detalle de riegos ──────────────────────────────────────────────────── */
  if (losRiegos.length) {
    y += 12;
    // 34 mm: el rótulo, la cabecera de la tabla y dos filas. Con menos, la
    // sección arrancaría partida justo debajo de su propio título.
    if (y > alto - 34) { doc.addPage(); y = 38; }

    rotulo(doc, 'DETALLE DE RIEGO DE CÉSPED', MARGEN, y);
    y = tablaDeRiegos(doc, autoTable, { ...comun, riegos: losRiegos, startY: y + 4 });
  }

  /* ── Cierre ─────────────────────────────────────────────────────────────── */
  y += 10;
  if (y > alto - 30) { doc.addPage(); y = 38; }

  recuadroTotal(doc, {
    x: derecha - 72, y, ancho: 72, alto: 15,
    etiqueta: 'Total a pagar', valor: dinero.format(total), derecha,
    tamValor: 15, etiquetaIzquierda: true,
  });

  const partes = [
    `${losRecorridos.length} ${losRecorridos.length === 1 ? 'recorrido' : 'recorridos'}`,
    `${losRiegos.length} ${losRiegos.length === 1 ? 'riego' : 'riegos'}`,
    `${diasConActividad} ${diasConActividad === 1 ? 'día' : 'días'} con actividad`,
  ];
  doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
  doc.text(partes.join(' · '), MARGEN, y + 6);
  doc.setFontSize(7).setTextColor(...COLOR.tenue);
  doc.text(`Emitido el ${fechaCorta(new Date())}`, MARGEN, y + 11);

  pintarPies(doc, { numeroDoc, usuario, alto, util, derecha, documento: 'Estado de cuenta general' });

  return { doc, nombre: `Estado de cuenta general ${numeroDoc}.pdf` };
};

/** Construye el documento y lo descarga. Es lo que usa la aplicación. */
export const generarReporteGeneralPdf = async (datos) => {
  const { doc, nombre } = await construirReporteGeneralPdf(datos);
  doc.save(nombre);
  return nombre;
};
