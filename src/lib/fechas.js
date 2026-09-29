/**
 * Fechas del calendario.
 *
 * Todo se maneja como texto `YYYY-MM-DD`. Pasar por `Date` para formatear o
 * comparar arrastra la zona horaria del navegador, y un riego de las 23:00
 * aparecería el día siguiente. La API devuelve la fecha en texto justo por eso.
 */

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const dosDigitos = (n) => String(n).padStart(2, '0');

/** Primer y último día del mes, listos para mandar como filtro a la API. */
export const rangoDelMes = (mes, anio) => ({
  desde: `${anio}-${dosDigitos(mes)}-01`,
  hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(new Date(anio, mes, 0).getDate())}`,
});

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
};

/** La hora del reloj del equipo, como `HH:MM`, que es lo que acepta un input time. */
export const horaActual = () => {
  const d = new Date();
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
};

/** Día del mes de una fecha `YYYY-MM-DD`, o null si no se puede leer. */
export const diaDeFecha = (fecha) => {
  const dia = parseInt(String(fecha ?? '').slice(8, 10), 10);
  return Number.isNaN(dia) ? null : dia;
};

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const partes = (fecha) => {
  const [a, m, d] = String(fecha ?? '').slice(0, 10).split('-').map(Number);
  return a && m && d ? { a, m, d, dia: new Date(a, m - 1, d).getDay() } : null;
};

/** "lun 28 sep" a partir de YYYY-MM-DD, sin pasar por la zona horaria. */
export const fechaCorta = (fecha) => {
  const p = partes(fecha);
  return p ? `${DIAS_CORTOS[p.dia]} ${p.d} ${MESES[p.m - 1].slice(0, 3).toLowerCase()}` : String(fecha ?? '');
};

/** "Lunes, 28 de septiembre de 2026". */
export const fechaLarga = (fecha) => {
  const p = partes(fecha);
  if (!p) return String(fecha ?? '');
  const texto = `${DIAS_LARGOS[p.dia]}, ${p.d} de ${MESES[p.m - 1].toLowerCase()} de ${p.a}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
