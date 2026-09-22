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
