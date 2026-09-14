/**
 * Estado de cuenta mensual en PDF.
 *
 * El documento se entrega a un tercero para cobrar o justificar el gasto del
 * periodo, así que está construido como un comprobante y no como un listado:
 * lleva número de documento, remitente, periodo cerrado y total destacado.
 *
 * Decisiones de impresión:
 *  · Sin rayado alterno ni cabeceras de color sólido: en papel gastan tinta y
 *    ensucian la lectura. Se usa una línea fina bajo cada fila, un fondo muy
 *    tenue en el encabezado y una regla marcada que lo separa del cuerpo.
 *  · Un único color de acento, y solo en reglas, el membrete y los totales. El
 *    resto es escala de grises, que es lo que mejor se imprime y mejor envejece.
 *  · La fecha se escribe una sola vez por día: repetirla en cada fila añade
 *    ruido y dificulta ver dónde empieza un día nuevo.
 *  · El número de pasajeros va en su propia columna. Mezclado con los nombres
 *    ("4 Benjamín Cedeño, …") se leía como si formara parte del primer nombre.
 */

const COLOR = {
  texto: [17, 24, 39],
  suave: [107, 114, 128],
  tenue: [156, 163, 175],
  linea: [226, 232, 240],
  acento: [10, 77, 140],
  tinte: [243, 246, 250],  // fondo del encabezado de tabla y del recuadro total
  blanco: [255, 255, 255],
};

const MARGEN = 18;

/* Ecuador usa el dólar y, en comprobantes, el punto como separador decimal
   (así los emite el SRI). `es-EC` daría "$239,86", que en una factura local se
   lee como un error de formato. */
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TIPO = { traer: 'Traer', llevar: 'Llevar', ambos: 'Ida y vuelta' };

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const hora = (valor) => (valor ? String(valor).slice(0, 5) : '—');
const dosDigitos = (n) => String(n).padStart(2, '0');

/** dd/mm/aaaa con ceros. `toLocaleDateString` devolvía "14/9/2026". */
const fechaCorta = (d) => `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "lun 01" — el día de la semana ayuda a comprobar el patrón de servicio. */
const etiquetaDia = (dia, mes, anio) => {
  const fecha = new Date(anio, mes - 1, Number(dia));
  return `${DIAS_SEMANA[fecha.getDay()]} ${dosDigitos(dia)}`;
};

/** Etiqueta pequeña en versalitas + valor debajo. */
const bloque = (doc, { x, y, etiqueta, valor, detalle, alinear = 'left', tam = 10.5 }) => {
  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text(etiqueta.toUpperCase(), x, y, { align: alinear, charSpace: 0.4 });

  doc.setFont('helvetica', 'bold').setFontSize(tam).setTextColor(...COLOR.texto);
  doc.text(valor, x, y + 5.6, { align: alinear });

  if (detalle) {
    doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
    doc.text(detalle, x, y + 10.4, { align: alinear });
  }
};

const regla = (doc, y, desde, ancho, grosor = 0.2, color = COLOR.linea) => {
  doc.setDrawColor(...color).setLineWidth(grosor);
  doc.line(desde, y, desde + ancho, y);
};

/** Membrete: marca cuadrada + nombre. Se repite reducido en las páginas 2+. */
const membrete = (doc, y, tam = 10) => {
  doc.setFillColor(...COLOR.acento);
  doc.roundedRect(MARGEN, y, tam, tam, 1.4, 1.4, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(tam * 0.7).setTextColor(...COLOR.blanco);
  doc.text('R', MARGEN + tam / 2, y + tam * 0.685, { align: 'center' });

  doc.setFont('helvetica', 'bold').setFontSize(tam * 0.82).setTextColor(...COLOR.texto);
  doc.text('RECORRIDOS', MARGEN + tam + 4.5, y + tam * 0.66, { charSpace: 1.3 });
};

/**
 * @param {object[]} recorridos Lista plana del periodo.
 * @param {number}   mes        1-12
 * @param {number}   anio
 * @param {object}   usuario    { nombre, email }
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
  const ordenados = [...recorridos].sort((a, b) => {
    const d = Number(a._dia) - Number(b._dia);
    return d !== 0 ? d : String(a.hora_inicio).localeCompare(String(b.hora_inicio));
  });

  const total = ordenados.reduce((suma, r) => suma + (parseFloat(r.costo) || 0), 0);
  const dias = new Set(ordenados.map((r) => r._dia)).size;
  const promedio = ordenados.length ? total / ordenados.length : 0;
  const pasajeros = ordenados.reduce((suma, r) => suma + (r.ninos?.length || 0), 0);

  const porTipo = ordenados.reduce((acc, r) => {
    const clave = TIPO[r.tipo_recorrido] || r.tipo_recorrido || 'Otro';
    acc[clave] = (acc[clave] || 0) + 1;
    return acc;
  }, {});

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
    valor: usuario.nombre || '—', detalle: usuario.email || '',
  });
  bloque(doc, {
    x: MARGEN + 58, y: 42, etiqueta: 'Periodo facturado',
    valor: periodo, detalle: rango, tam: 10.5,
  });

  regla(doc, 67, MARGEN, util);

  /* ── Resumen ────────────────────────────────────────────────────────────── */
  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('RESUMEN DEL PERIODO', MARGEN, 75, { charSpace: 0.4 });

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

  doc.setFont('helvetica', 'bold').setFontSize(6.2).setTextColor(...COLOR.tenue);
  doc.text('DETALLE DEL SERVICIO', MARGEN, 104, { charSpace: 0.4 });

  /* ── Detalle ────────────────────────────────────────────────────────────── */
  let ultimoDia = null;
  const filas = [];

  ordenados.forEach((r) => {
    const mostrarDia = r._dia !== ultimoDia;
    ultimoDia = r._dia;

    const vehiculo = r.vehiculo_descripcion || 'Sin vehículo';
    const tipo = TIPO[r.tipo_recorrido] || r.tipo_recorrido || '—';

    const lista = r.ninos || [];
    const nombres = lista.map((n) => `${n.nombre} ${n.apellidos}`).join(', ');

    // La nota va en su propia fila, sangrada hasta la columna de servicio y
    // rotulada. Dentro de la celda de servicio tenía el mismo peso visual y se
    // leía como parte del nombre del vehículo; suelta y sin rótulo, no quedaba
    // claro a qué fila pertenecía.
    const celdas = [
      mostrarDia ? etiquetaDia(r._dia, mes, anio) : '',
      hora(r.hora_inicio),
      vehiculo,
      tipo,
      lista.length ? String(lista.length) : '—',
      nombres || '—',
      dinero.format(parseFloat(r.costo) || 0),
    ];

    if (r.notas) {
      // Sin línea inferior: la fila y su nota son una sola unidad.
      filas.push(celdas.map((content) => ({ content, styles: { lineWidth: 0 } })));
      filas.push([{
        content: `Nota:  ${r.notas}`,
        colSpan: 7,
        styles: {
          fontSize: 7.2, textColor: COLOR.suave, fontStyle: 'italic',
          cellPadding: { top: 0, bottom: 2.6, left: 33, right: 3 },
          lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea,
        },
      }]);
    } else {
      filas.push(celdas);
    }
  });

  autoTable(doc, {
    startY: 108,
    margin: { left: MARGEN, right: MARGEN, top: 30, bottom: 24 },
    head: [['Día', 'Hora', 'Vehículo', 'Tipo', 'Pax', 'Pasajeros', 'Costo']],
    body: filas,
    theme: 'plain',
    styles: {
      font: 'helvetica', fontSize: 8, textColor: COLOR.texto,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      valign: 'top', overflow: 'linebreak',
    },
    headStyles: {
      fontStyle: 'bold', fontSize: 6.6, textColor: COLOR.texto,
      fillColor: COLOR.tinte, charSpace: 0.3,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
      lineWidth: { bottom: 0.5 }, lineColor: COLOR.acento,
    },
    bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea },
    columnStyles: {
      0: { cellWidth: 17, fontStyle: 'bold' },
      1: { cellWidth: 14, textColor: COLOR.suave },
      2: { cellWidth: 43 },
      3: { cellWidth: 20, textColor: COLOR.suave },
      4: { cellWidth: 9, halign: 'center', textColor: COLOR.suave },
      5: { cellWidth: 'auto', fontSize: 7.5, textColor: COLOR.suave },
      6: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
    },
    // Membrete reducido en las páginas de continuación.
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber === 1) return;
      membrete(doc, 12, 7.5);
      doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(...COLOR.suave);
      doc.text(`Estado de cuenta N.º ${numeroDoc}  ·  ${periodo}`, derecha, 17.5, { align: 'right' });
      regla(doc, 22, MARGEN, util, 0.4, COLOR.acento);
    },
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
