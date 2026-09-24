/**
 * Las tablas de detalle, aparte de los documentos que las usan.
 *
 * Cada una aparece en dos sitios: en el informe de su servicio y en el informe
 * general que los junta. Copiarlas era garantizar que el día que se ajuste una
 * columna solo se ajuste en uno de los dos.
 */

import {
  COLOR, MARGEN, dinero, hora, etiquetaDia, cabeceraDeContinuacion,
} from './pdfComun.js';

const TIPO = { traer: 'Traer', llevar: 'Llevar' };

/** Día del mes de un registro, ya venga calculado o haya que leerlo. */
const diaDe = (registro) => (
  registro._dia != null ? Number(registro._dia) : Number(String(registro.fecha ?? '').slice(8, 10))
);

export const ordenarRecorridos = (recorridos) => [...recorridos].sort((a, b) => {
  const d = diaDe(a) - diaDe(b);
  return d !== 0 ? d : String(a.hora_inicio).localeCompare(String(b.hora_inicio));
});

export const ordenarRiegos = (riegos) => [...riegos].sort((a, b) => {
  const d = diaDe(a) - diaDe(b);
  return d !== 0 ? d : String(a.hora).localeCompare(String(b.hora));
});

export const sumar = (registros) => registros.reduce(
  (total, r) => total + (parseFloat(r.costo) || 0), 0
);

export const diasDistintos = (registros) => new Set(registros.map(diaDe)).size;

export const desglosePorTipo = (recorridos) => recorridos.reduce((acc, r) => {
  const clave = TIPO[r.tipo_recorrido] || r.tipo_recorrido || 'Otro';
  acc[clave] = (acc[clave] || 0) + 1;
  return acc;
}, {});

/**
 * Estilos que comparten las dos tablas, para que se lean como una sola pieza.
 *
 * Los cuerpos iban a 8 pt. En papel se leen de sobra, pero el documento se
 * abre casi siempre en el móvil, donde una A4 entra a un tercio de su tamaño
 * y 8 pt quedan en unos cinco píxeles. A 9 pt siguen cabiendo las mismas
 * columnas y el mes entero, y se leen sin ampliar.
 */
const ESTILOS = {
  theme: 'plain',
  styles: {
    font: 'helvetica', fontSize: 9, textColor: COLOR.texto,
    cellPadding: { top: 2.8, bottom: 2.8, left: 2, right: 2 },
    valign: 'top',
  },
  headStyles: {
    fontStyle: 'bold', fontSize: 7.4, textColor: COLOR.texto,
    fillColor: COLOR.tinte, charSpace: 0.3,
    cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 },
    lineWidth: { bottom: 0.5 }, lineColor: COLOR.acento,
  },
  bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea },
  // Una fila que no cabe entera pasa completa a la página siguiente. Partirla
  // dejaba en la hoja nueva pasajeros sueltos, sin día, vehículo ni costo.
  rowPageBreak: 'avoid',
};

/**
 * Detalle de recorridos: una fila por recorrido, con la nota en su propia
 * línea sangrada y rotulada. Dentro de la celda del vehículo tenía el mismo
 * peso visual y se leía como parte del nombre.
 */
export const tablaDeRecorridos = (doc, autoTable, {
  recorridos, mes, anio, startY, numeroDoc, periodo, util, derecha,
  etiquetaContinuacion = 'Estado de cuenta',
}) => {
  let ultimoDia = null;
  const filas = [];
  // El día de cada fila, aunque no se escriba: hace falta para repetirlo si
  // la fila abre una página nueva.
  const diaDeFila = [];

  recorridos.forEach((r) => {
    const dia = diaDe(r);
    const mostrarDia = dia !== ultimoDia;
    ultimoDia = dia;

    const lista = r.ninos || [];
    const nombres = lista.map((n) => `${n.nombre} ${n.apellidos}`).join(', ');

    const celdas = [
      mostrarDia ? etiquetaDia(dia, mes, anio) : '',
      hora(r.hora_inicio),
      r.vehiculo_descripcion || 'Sin vehículo',
      TIPO[r.tipo_recorrido] || r.tipo_recorrido || '—',
      lista.length ? String(lista.length) : '—',
      nombres || '—',
      dinero.format(parseFloat(r.costo) || 0),
    ];

    if (r.notas) {
      // La celda del día abarca las dos filas (rowSpan): autoTable trata así el
      // recorrido y su nota como un bloque, y si no caben juntos los pasa
      // enteros a la página siguiente. Sin esto, la nota podía quedar sola
      // arriba de la hoja nueva sin saber de qué viaje era.
      const [celdaDia, ...resto] = celdas;
      filas.push([
        { content: celdaDia, rowSpan: 2, styles: { lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea } },
        // Sin línea inferior: la fila y su nota son una sola unidad.
        ...resto.map((content) => ({ content, styles: { lineWidth: 0 } })),
      ]);
      diaDeFila.push(etiquetaDia(dia, mes, anio));
      filas.push([{
        content: `Nota:  ${r.notas}`,
        colSpan: 6,
        styles: {
          fontSize: 8, textColor: COLOR.suave, fontStyle: 'italic',
          // Empieza en la columna de la hora: 14 mm la salta y alinea la nota
          // con el vehículo.
          cellPadding: { top: 0, bottom: 2.6, left: 16, right: 3 },
          lineWidth: { bottom: 0.1 }, lineColor: COLOR.linea,
        },
      }]);
      diaDeFila.push(null);    // la fila de la nota no tiene celda de día
    } else {
      diaDeFila.push(etiquetaDia(dia, mes, anio));
      filas.push(celdas);
    }
  });

  let paginaConDia = 0;

  autoTable(doc, {
    ...ESTILOS,
    startY,
    margin: { left: MARGEN, right: MARGEN, top: 30, bottom: 24 },
    head: [['Día', 'Hora', 'Vehículo', 'Tipo', 'Pax', 'Pasajeros', 'Costo']],
    body: filas,
    styles: { ...ESTILOS.styles, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 17, fontStyle: 'bold' },
      1: { cellWidth: 14, textColor: COLOR.suave },
      2: { cellWidth: 43 },
      3: { cellWidth: 20, textColor: COLOR.suave },
      4: { cellWidth: 9, halign: 'center', textColor: COLOR.suave },
      5: { cellWidth: 'auto', fontSize: 8.2, textColor: COLOR.suave },
      6: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
    },
    // headStyles gana a columnStyles en la cabecera, así que "Costo" quedaba
    // alineado a la izquierda sobre cifras alineadas a la derecha.
    didParseCell: ({ column, cell, section }) => {
      if (section === 'head' && column.index === 6) cell.styles.halign = 'right';
    },
    // El día solo se escribe en el primer viaje de cada día. Si una página
    // empieza a mitad de un día, su primera fila quedaría sin fecha: se repite.
    willDrawCell: ({ section, column, row, cell, pageNumber }) => {
      if (section !== 'body' || column.index !== 0 || pageNumber === paginaConDia) return;
      paginaConDia = pageNumber;
      if (!cell.text.join('').trim() && diaDeFila[row.index]) cell.text = [diaDeFila[row.index]];
    },
    didDrawPage: cabeceraDeContinuacion(doc, {
      etiqueta: etiquetaContinuacion, numeroDoc, periodo, util, derecha,
    }),
  });

  return doc.lastAutoTable.finalY;
};

/**
 * Detalle de riegos a DOS columnas.
 *
 * Cada riego son tres datos. A todo el ancho dejaría 10 cm de papel en blanco
 * por fila, así que se parte por la mitad y se lee hacia abajo por la
 * izquierda y luego por la derecha: un mes entero cabe en una página.
 */
export const tablaDeRiegos = (doc, autoTable, {
  riegos, mes, anio, startY, numeroDoc, periodo, util, derecha,
  etiquetaContinuacion = 'Riegos',
}) => {
  // Se parte por la mitad y no de forma alterna: así cada columna queda en
  // orden cronológico y se lee de arriba abajo, como una lista normal.
  const mitad = Math.ceil(riegos.length / 2);
  const izquierda = riegos.slice(0, mitad);
  const derechaCol = riegos.slice(mitad);

  const celdas = (r) => (r
    ? [etiquetaDia(diaDe(r), mes, anio), hora(r.hora), dinero.format(parseFloat(r.costo) || 0)]
    : ['', '', '']);

  autoTable(doc, {
    ...ESTILOS,
    startY,
    margin: { left: MARGEN, right: MARGEN, top: 30, bottom: 24 },
    head: [['Día', 'Hora', 'Costo', '', 'Día', 'Hora', 'Costo']],
    body: izquierda.map((r, i) => [...celdas(r), '', ...celdas(derechaCol[i])]),
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 18, textColor: COLOR.suave },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
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
    didDrawPage: cabeceraDeContinuacion(doc, {
      etiqueta: etiquetaContinuacion, numeroDoc, periodo, util, derecha,
    }),
  });

  return doc.lastAutoTable.finalY;
};

/**
 * Detalle de la liquidación de un vehículo: cada viaje con lo cobrado y lo
 * que le corresponde al auto. Es lo que el dueño del auto necesita para
 * comprobar la cifra que recibe, viaje por viaje.
 */
export const tablaDeLiquidacion = (doc, autoTable, {
  recorridos, mes, anio, startY, numeroDoc, periodo, util, derecha,
}) => {
  let ultimoDia = null;
  const filas = recorridos.map((r) => {
    const dia = diaDe(r);
    const mostrarDia = dia !== ultimoDia;
    ultimoDia = dia;
    return [
      mostrarDia ? etiquetaDia(dia, mes, anio) : '',
      hora(r.hora_inicio),
      TIPO[r.tipo_recorrido] || r.tipo_recorrido || '—',
      dinero.format(parseFloat(r.costo) || 0),
      dinero.format(parseFloat(r.parte_auto) || 0),
    ];
  });

  autoTable(doc, {
    ...ESTILOS,
    startY,
    margin: { left: MARGEN, right: MARGEN, top: 30, bottom: 24 },
    head: [['Día', 'Hora', 'Tipo', 'Cobrado', 'Para el auto']],
    body: filas,
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 20, textColor: COLOR.suave },
      2: { cellWidth: 'auto', textColor: COLOR.suave },
      3: { cellWidth: 30, halign: 'right', textColor: COLOR.suave },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: ({ column, cell, section }) => {
      if (section === 'head' && column.index >= 3) cell.styles.halign = 'right';
    },
    didDrawPage: cabeceraDeContinuacion(doc, {
      etiqueta: 'Liquidación', numeroDoc, periodo, util, derecha,
    }),
  });

  return doc.lastAutoTable.finalY;
};
