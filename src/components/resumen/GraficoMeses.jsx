import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const TooltipMeses = ({ active, payload, colores, series }) => {
  if (!active || !payload?.length) return null;
  const mes = payload[0]?.payload;
  if (!mes) return null;

  return (
    <div className="rounded-control border border-separator/60 bg-surface px-3 py-2 shadow-level-3">
      <p className="text-caption text-label-tertiary">{mes.nombre} {mes.anio}</p>
      <ul className="mt-1.5 space-y-1">
        {series.map(({ clave, etiqueta }) => (
          <li key={clave} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colores[clave] }} />
            <span className="text-footnote text-label-secondary">{etiqueta}</span>
            <span className="tabular ml-auto pl-4 text-footnote font-semibold text-label">{dinero.format(mes[clave])}</span>
          </li>
        ))}
        {series.length > 1 && (
          <li className="flex items-center gap-2 border-t border-separator/40 pt-1">
            <span className="text-footnote text-label-secondary">Total</span>
            <span className="tabular ml-auto pl-4 text-footnote font-semibold text-label">{dinero.format(mes.total)}</span>
          </li>
        )}
      </ul>
    </div>
  );
};

/**
 * Gasto de los últimos meses en cápsulas apiladas, con la leyenda de importes
 * del mes a la vista al lado.
 *
 * Cada barra es una pista gris a toda altura con los tramos dentro, cada uno
 * redondeado por completo. El mes a la vista va en color pleno y los demás
 * atenuados: así destaca sin tener que buscarlo en el eje.
 */
const GraficoMeses = ({ meses, colores, puedeRecorridos, puedeRiegos, reduceMotion, leyenda }) => {
  const series = [
    puedeRecorridos && { clave: 'recorridos', etiqueta: 'Recorridos' },
    puedeRiegos && { clave: 'riegos', etiqueta: 'Riegos' },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      {/* flex-1 solo en fila: en columna, su base 0 anula la altura fija y el
          gráfico se quedaba a cero de alto en el móvil. */}
      <div className="h-[230px] w-full min-w-0 lg:flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={meses} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="rgb(var(--c-separator) / 0.5)" />
            <XAxis
              dataKey="etiqueta" axisLine={false} tickLine={false} dy={8}
              tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
            />
            <YAxis
              axisLine={false} tickLine={false} width={48}
              tickFormatter={(valor) => dinero.format(valor).replace('.00', '')}
              tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
            />
            <Tooltip
              content={<TooltipMeses colores={colores} series={series} />}
              cursor={{ fill: 'rgb(var(--c-fill) / 0.06)', radius: 12 }}
            />

            {series.map(({ clave }, i) => (
              <Bar
                key={clave}
                dataKey={clave}
                stackId="gasto"
                barSize={26}
                radius={999}
                stroke={colores.fondo}
                strokeWidth={3}
                isAnimationActive={!reduceMotion}
                // La pista va detrás solo una vez: con dos series se pintaría dos veces.
                background={i === 0 ? { fill: colores.pista, radius: 999 } : undefined}
              >
                {/* El color va en cada Cell: Cell reemplaza las props del
                    rectángulo, así que heredar el fill las dejaría transparentes. */}
                {meses.map((mes) => (
                  <Cell key={mes.clave} fill={colores[clave]} fillOpacity={mes.esActual ? 1 : 0.45} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className={`grid gap-2.5 lg:w-48 lg:grid-cols-1 lg:content-center ${
        leyenda.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
      }`}>
        {leyenda.map(({ etiqueta, valor, color }) => (
          <li key={etiqueta} className="flex items-center gap-3 rounded-control border border-separator/60 p-3">
            <span
              aria-hidden="true"
              className={`hidden h-8 w-8 shrink-0 rounded-field sm:block ${color ? '' : 'bg-fill/20'}`}
              style={color ? { backgroundColor: color } : undefined}
            />
            <div className="min-w-0">
              <p className="truncate text-caption text-label-secondary">{etiqueta}</p>
              <p className="tabular truncate text-headline font-bold text-label">{valor}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GraficoMeses;
