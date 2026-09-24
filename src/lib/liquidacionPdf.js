/**
 * Liquidación de un vehículo: lo que hay que entregarle a su dueño en el mes.
 *
 * Documento aparte del estado de cuenta a propósito. El estado de cuenta es
 * lo que se le cobra al cliente, y el reparto entre el chofer y el dueño del
 * auto es un asunto entre ellos dos: meterlo ahí le enseñaría al cliente
 * cuánto gana cada uno. Por la misma razón es un documento POR VEHÍCULO: al
 * dueño de un auto no le corresponde ver lo de los demás.
 */

import {
  COLOR, MARGEN, dinero, MESES, mayuscula, dosDigitos, fechaCorta,
  bloque, regla, rotulo, membrete, textoALaDerecha, recuadroTotal, pintarPies,
} from './pdfComun.js';
import { tablaDeLiquidacion, ordenarRecorridos, sumar, diasDistintos } from './tablasPdf.js';

/**
 * @param {object}   vehiculo   { descripcion, placa }
 * @param {object[]} recorridos Los del vehículo en el periodo, con parte_auto y parte_chofer
 * @param {number}   mes        1-12
 * @param {number}   anio
 * @param {object}   usuario    { nombre, usuario }
 */
export const construirLiquidacionPdf = async ({ vehiculo = {}, recorridos = [], mes, anio, usuario = {} }) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const derecha = ancho - MARGEN;

  /* ── Métricas ───────────────────────────────────────────────────────────── */
  const ordenados = ordenarRecorridos(recorridos);
  const cobrado = sumar(ordenados);
  const paraElAuto = ordenados.reduce((s, r) => s + (parseFloat(r.parte_auto) || 0), 0);
  const paraElChofer = ordenados.reduce((s, r) => s + (parseFloat(r.parte_chofer) || 0), 0);
  const dias = diasDistintos(ordenados);

  const periodo = `${mayuscula(MESES[mes - 1])} ${anio}`;
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const rango = `Del 01 al ${ultimoDiaMes} de ${MESES[mes - 1]} de ${anio}`;
  const numeroDoc = `LQ-${anio}-${dosDigitos(mes)}`;
  const nombreVehiculo = vehiculo.descripcion || 'Vehículo';

  /* ── Membrete ───────────────────────────────────────────────────────────── */
  membrete(doc, 14);
  doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
  doc.text('Liquidación al dueño del vehículo', MARGEN + 14.5, 27.5);

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  textoALaDerecha(doc, 'LIQUIDACIÓN', derecha, 17.5, 0.4);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...COLOR.texto);
  doc.text(`N.º ${numeroDoc}`, derecha, 23.5, { align: 'right' });

  regla(doc, 32, MARGEN, util, 0.6, COLOR.acento);

  /* ── Identificación y total ─────────────────────────────────────────────── */
  // Arriba a la derecha va lo que recibe el dueño, no lo que se cobró: es la
  // cifra que este documento existe para comunicar.
  recuadroTotal(doc, {
    x: derecha - 60, y: 39, ancho: 60, alto: 21,
    etiqueta: 'A entregar', valor: dinero.format(paraElAuto), derecha,
  });

  bloque(doc, {
    x: MARGEN, y: 42, ancho: 54, etiqueta: 'Vehículo',
    valor: nombreVehiculo, detalle: vehiculo.placa || '',
  });
  bloque(doc, {
    x: MARGEN + 58, y: 42, ancho: derecha - 60 - (MARGEN + 58) - 4, etiqueta: 'Periodo',
    valor: periodo, detalle: rango,
  });

  regla(doc, 67, MARGEN, util);

  /* ── Resumen ────────────────────────────────────────────────────────────── */
  rotulo(doc, 'RESUMEN DEL PERIODO', MARGEN, 75);

  const metricas = [
    [String(ordenados.length), ordenados.length === 1 ? 'Viaje' : 'Viajes'],
    [dinero.format(cobrado), 'Cobrado'],
    [dinero.format(paraElAuto), 'Para el auto'],
    [dinero.format(paraElChofer), 'Para el chofer'],
  ];
  metricas.forEach(([valor, etiqueta], i) => {
    const x = MARGEN + (util / metricas.length) * i;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...COLOR.texto);
    doc.text(valor, x, 84);
    doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
    doc.text(etiqueta, x, 89);
  });

  regla(doc, 96, MARGEN, util);
  rotulo(doc, 'DETALLE POR VIAJE', MARGEN, 104);

  /* ── Detalle ────────────────────────────────────────────────────────────── */
  let y = tablaDeLiquidacion(doc, autoTable, {
    recorridos: ordenados, mes, anio, startY: 108, numeroDoc, periodo, util, derecha,
  });

  /* ── Cierre ─────────────────────────────────────────────────────────────── */
  y += 10;
  if (y > alto - 30) { doc.addPage(); y = 38; }

  recuadroTotal(doc, {
    x: derecha - 72, y, ancho: 72, alto: 15,
    etiqueta: 'Total a entregar', valor: dinero.format(paraElAuto), derecha,
    tamValor: 15, etiquetaIzquierda: true,
  });

  doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
  doc.text(
    `${ordenados.length} ${ordenados.length === 1 ? 'viaje' : 'viajes'} · ${dias} ${dias === 1 ? 'día' : 'días'}`,
    MARGEN, y + 6
  );
  doc.setFontSize(7).setTextColor(...COLOR.tenue);
  doc.text(`Emitido por ${usuario.nombre || '—'} el ${fechaCorta(new Date())}`, MARGEN, y + 11);

  pintarPies(doc, { numeroDoc, usuario, alto, util, derecha, documento: 'Liquidación' });

  return { doc, nombre: `Liquidación ${nombreVehiculo} ${numeroDoc}.pdf` };
};

/** Construye el documento y lo descarga. Es lo que usa la aplicación. */
export const generarLiquidacionPdf = async (datos) => {
  const { doc, nombre } = await construirLiquidacionPdf(datos);
  doc.save(nombre);
  return nombre;
};
