import React from 'react';
import { Route as RouteIcon, Droplets, ArrowRight, Clock, CloudUpload } from 'lucide-react';
import { MESES } from '../../lib/fechas';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** "lun 22 sep" a partir de YYYY-MM-DD, sin pasar por la zona horaria. */
const dia = (fecha) => {
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '';
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`;
};

/** El color de cada tarjeta, el mismo que usa el calendario para ese tipo. */
const FONDOS = {
  traer: 'linear-gradient(155deg, rgb(var(--c-green)) 0%, rgb(var(--c-teal)) 100%)',
  llevar: 'linear-gradient(155deg, rgb(var(--c-orange)) 0%, rgb(var(--c-red) / 0.85) 100%)',
  riego: 'linear-gradient(155deg, rgb(var(--c-teal)) 0%, rgb(var(--c-accent)) 100%)',
};

const TarjetaRegistro = ({ tipo, registro }) => {
  const esRiego = tipo === 'riego';
  const clase = esRiego ? 'riego' : registro.tipo_recorrido === 'llevar' ? 'llevar' : 'traer';
  const Icono = esRiego ? Droplets : RouteIcon;
  const hora = String((esRiego ? registro.hora : registro.hora_inicio) ?? '').slice(0, 5);
  const titulo = esRiego ? 'Riego' : clase === 'llevar' ? 'Llevar' : 'Traer';
  const subtitulo = esRiego
    ? dinero.format(parseFloat(registro.costo) || 0)
    : registro.vehiculo_descripcion || 'Sin vehículo';

  return (
    <li
      className="relative h-44 w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] text-white shadow-level-2 sm:w-40"
      style={{ backgroundImage: FONDOS[clase] }}
    >
      {/* El icono grande y desvaído hace de "foto" de la tarjeta */}
      <Icono
        size={112} strokeWidth={1.4} aria-hidden="true"
        className="absolute -right-6 top-6 text-white/20"
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />

      <div className="relative flex h-full flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-1">
          {registro._pendiente ? (
            <span className="flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-caption2 font-semibold backdrop-blur-thin">
              <CloudUpload size={11} strokeWidth={2.4} aria-hidden="true" />
              {registro._pendiente === 'rechazado' ? 'Sin enviar' : 'Por enviar'}
            </span>
          ) : <span />}
          <span className="tabular flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-caption2 font-semibold backdrop-blur-thin">
            <Clock size={11} strokeWidth={2.4} aria-hidden="true" />
            {hora}
          </span>
        </div>

        <div>
          <p className="text-headline font-bold leading-tight">{titulo}</p>
          <p className="truncate text-footnote text-white/90">{subtitulo}</p>
          <p className="mt-0.5 text-caption text-white/75">{dia(registro.fecha)}</p>
        </div>
      </div>
    </li>
  );
};

/**
 * Lo último que se registró en el mes, en tarjetas que se deslizan de lado.
 * Es un vistazo rápido; el detalle completo está en la Actividad, junto al
 * calendario, y "Ver todo" lleva hasta allí.
 */
const UltimosRegistros = ({ registros, nombreMes, onVerTodo }) => (
  <section aria-labelledby="ultimos-registros" className="mb-6">
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 id="ultimos-registros" className="text-title3 font-bold text-label">Lo último del mes</h2>
      {registros.length > 0 && (
        <button
          type="button"
          onClick={onVerTodo}
          className="tappable flex items-center gap-1 rounded-full px-2 py-1 text-subhead font-medium text-accent hover:bg-accent/10"
        >
          Ver todo <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </div>

    {registros.length === 0 ? (
      <p className="rounded-card border border-dashed border-separator/70 px-4 py-8 text-center text-subhead text-label-secondary">
        Todavía no hay nada registrado en {nombreMes}.
      </p>
    ) : (
      // Se sale del margen en el móvil para que la última tarjeta asome
      // cortada: así se nota que la fila se puede deslizar.
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {registros.map(({ tipo, registro, clave }) => (
          <TarjetaRegistro key={clave} tipo={tipo} registro={registro} />
        ))}
      </ul>
    )}
  </section>
);

export default UltimosRegistros;
