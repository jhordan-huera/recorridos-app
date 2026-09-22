/**
 * Estado de cuenta mensual en PDF.
 *
 * El documento se entrega a un tercero para cobrar o justificar el gasto del
 * periodo, así que está construido como un comprobante y no como un listado:
 * lleva número de documento, remitente, periodo cerrado y total destacado.
 *
 * El aspecto común a los dos informes (colores, membrete, moneda, pies) vive
 * en pdfComun.js; aquí queda solo la maquetación propia.
 *
 * Decisiones de este documento:
 *  · La fecha se escribe una sola vez por día: repetirla en cada fila añade
 *    ruido y dificulta ver dónde empieza un día nuevo.
 *  · El número de pasajeros va en su propia columna. Mezclado con los nombres
 *    ("4 Benjamín Cedeño, …") se leía como si formara parte del primer nombre.
 */

import {
  COLOR, MARGEN, dinero, MESES, mayuscula, dosDigitos, fechaCorta,
  bloque, regla, rotulo, membrete, pintarPies,
} from './pdfComun.js';
import {
  tablaDeRecorridos, ordenarRecorridos, sumar, diasDistintos, desglosePorTipo,
} from './tablasPdf.js';

/** Propio de este informe: los riegos no tienen tipo de servicio. */

/**
 * @param {object[]} recorridos Lista plana del periodo.
 * @param {number}   mes        1-12
 * @param {number}   anio
 * @param {object}   usuario    { nombre, usuario }
 */
export const construirReportePdf = async ({ recorridos = [], mes, anio, usuario = {} }) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const derecha = ancho - MARGEN;

  /* ── Métricas ───────────────────────────────────────────────────────────── */
  const ordenados = ordenarRecorridos(recorridos);

  const total = sumar(ordenados);
  const dias = diasDistintos(ordenados);
  const promedio = ordenados.length ? total / ordenados.length : 0;
  const pasajeros = ordenados.reduce((suma, r) => suma + (r.ninos?.length || 0), 0);

  const porTipo = desglosePorTipo(ordenados);

  const periodo = `${mayuscula(MESES[mes - 1])} ${anio}`;
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const rango = `Del 01 al ${ultimoDiaMes} de ${MESES[mes - 1]} de ${anio}`;
  const numeroDoc = `EC-${anio}-${dosDigitos(mes)}`;
  const emitido = new Date();

  /* ── Membrete ───────────────────────────────────────────────────────────── */
  membrete(doc, 14);
  doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
  doc.text('Servicio de transporte', MARGEN + 14.5, 27.5);

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('ESTADO DE CUENTA', derecha, 17.5, { align: 'right', charSpace: 0.4 });
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...COLOR.texto);
  doc.text(`N.º ${numeroDoc}`, derecha, 23.5, { align: 'right' });

  regla(doc, 32, MARGEN, util, 0.6, COLOR.acento);

  /* ── Identificación y total ─────────────────────────────────────────────── */
  // El recuadro del total va arriba a la derecha: es el dato que busca de
  // inmediato quien recibe el documento.
  const anchoCaja = 60;
  const xCaja = derecha - anchoCaja;
  doc.setFillColor(...COLOR.tinte);
  doc.rect(xCaja, 39, anchoCaja, 21, 'F');
  doc.setFillColor(...COLOR.acento);
  doc.rect(xCaja, 39, 1.4, 21, 'F');   // filete de acento en el canto

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.suave);
  doc.text('TOTAL DEL PERIODO', derecha - 5, 46, { align: 'right', charSpace: 0.4 });
  doc.setFont('helvetica', 'bold').setFontSize(19).setTextColor(...COLOR.acento);
  doc.text(dinero.format(total), derecha - 5, 55.5, { align: 'right' });

  bloque(doc, {
    x: MARGEN, y: 42, etiqueta: 'Emitido por',
    valor: usuario.nombre || '—', detalle: usuario.usuario || '',
  });
  bloque(doc, {
    x: MARGEN + 58, y: 42, etiqueta: 'Periodo facturado',
    valor: periodo, detalle: rango, tam: 10.5,
  });

  regla(doc, 67, MARGEN, util);

  /* ── Resumen ────────────────────────────────────────────────────────────── */
  rotulo(doc, 'RESUMEN DEL PERIODO', MARGEN, 75);

  // El desglose por tipo va en esta misma línea, a la derecha: debajo chocaba
  // con la etiqueta de la tercera métrica y se superponían los textos.
  const desglose = Object.entries(porTipo).map(([k, v]) => `${k} ${v}`).join('     ');
  if (desglose) {
    doc.setFont('helvetica', 'normal').setFontSize(7.4).setTextColor(...COLOR.suave);
    doc.text(desglose, derecha, 75, { align: 'right' });
  }

  const metricas = [
    [String(ordenados.length), ordenados.length === 1 ? 'Recorrido' : 'Recorridos'],
    [String(dias), `${dias === 1 ? 'Día' : 'Días'} con servicio`],
    [String(pasajeros), 'Traslados de pasajeros'],
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

  rotulo(doc, 'DETALLE DEL SERVICIO', MARGEN, 104);

  /* ── Detalle ────────────────────────────────────────────────────────────── */
  tablaDeRecorridos(doc, autoTable, {
    recorridos: ordenados, mes, anio, startY: 108,
    numeroDoc, periodo, util, derecha,
  });

  /* ── Cierre ─────────────────────────────────────────────────────────────── */
  // 30 mm: el recuadro del total más la leyenda de la izquierda. Si no caben
  // enteros, el cierre empieza en página propia.
  let y = doc.lastAutoTable.finalY + 10;
  if (y > alto - 30) { doc.addPage(); y = 38; }

  const xTot = derecha - 72;
  doc.setFillColor(...COLOR.tinte);
  doc.rect(xTot, y, 72, 15, 'F');
  doc.setFillColor(...COLOR.acento);
  doc.rect(xTot, y, 1.4, 15, 'F');

  doc.setFont('helvetica', 'bold').setFontSize(7.4).setTextColor(...COLOR.texto);
  doc.text('TOTAL A PAGAR', xTot + 6, y + 9.4, { charSpace: 0.3 });
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...COLOR.acento);
  doc.text(dinero.format(total), derecha - 5, y + 10.2, { align: 'right' });

  doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
  doc.text(
    `${ordenados.length} ${ordenados.length === 1 ? 'recorrido' : 'recorridos'} · ${dias} ${dias === 1 ? 'día' : 'días'} con servicio`,
    MARGEN, y + 6
  );
  doc.setFontSize(7).setTextColor(...COLOR.tenue);
  doc.text(`Emitido el ${fechaCorta(emitido)}`, MARGEN, y + 11);

  /* ── Pie, con el total de páginas ya conocido ───────────────────────────── */
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    regla(doc, alto - 16, MARGEN, util);
    doc.setFont('helvetica', 'normal').setFontSize(6.8).setTextColor(...COLOR.tenue);
    doc.text(
      `Estado de cuenta N.º ${numeroDoc}  ·  ${usuario.nombre || ''}  ·  Documento informativo, no constituye comprobante tributario`,
      MARGEN, alto - 11
    );
    doc.text(`${p} de ${paginas}`, derecha, alto - 11, { align: 'right' });
  }

  return { doc, nombre: `Estado de cuenta ${numeroDoc}.pdf` };
};

/** Construye el documento y lo descarga. Es lo que usa la aplicación. */
export const generarReportePdf = async (datos) => {
  const { doc, nombre } = await construirReportePdf(datos);
  doc.save(nombre);
  return nombre;
};
