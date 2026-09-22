import React, { useMemo } from 'react';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Rejilla de un mes, con la semana empezando en lunes.
 *
 * El componente solo sabe de días: qué se pinta dentro de cada casilla lo
 * decide quien lo usa, porque el cronograma de recorridos y el de riegos
 * muestran cosas distintas sobre la misma cuadrícula.
 *
 * `altura` viaja como clases literales para que Tailwind las vea al compilar;
 * construirlas concatenando (`h-${n}`) las dejaría fuera del CSS final.
 */
const CalendarioMes = ({ mes, anio, renderDia, altura = 'h-14 sm:h-24' }) => {
  const celdas = useMemo(() => {
    const diasEnElMes = new Date(anio, mes, 0).getDate();
    const hoy = new Date();
    const esMesActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();

    // getDay() cuenta desde el domingo; la rejilla empieza en lunes.
    const primerDia = new Date(anio, mes - 1, 1).getDay();
    const huecos = Array(primerDia === 0 ? 6 : primerDia - 1).fill(null);

    return [
      ...huecos,
      ...Array.from({ length: diasEnElMes }, (_, i) => ({
        numero: i + 1,
        esHoy: esMesActual && i + 1 === hoy.getDate(),
      })),
    ];
  }, [mes, anio]);

  return (
    <>
      <div className="mb-2 grid grid-cols-7">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="text-center text-caption font-medium text-label-tertiary">
            {dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {celdas.map((dia, index) => {
          if (!dia) return <div key={`vacio-${index}`} className={altura} />;

          return (
            <div
              key={dia.numero}
              className={`flex ${altura} flex-col rounded-field border p-1 sm:rounded-control sm:p-2 ${
                dia.esHoy ? 'border-accent bg-accent/8' : 'border-separator/50 bg-surface-secondary'
              }`}
            >
              <span
                className={`tabular self-end text-caption ${
                  dia.esHoy
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white'
                    : 'px-1 text-label-tertiary'
                }`}
              >
                {dia.numero}
              </span>
              {renderDia?.(dia.numero, dia)}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CalendarioMes;
