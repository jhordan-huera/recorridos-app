import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Route as RouteIcon, Droplets, Bus, CalendarDays, Clock, DollarSign, Plus, ArrowRight,
} from 'lucide-react';
import { hoyISO, horaActual } from '../../lib/fechas';
import { nuevoId } from '../../lib/pendientes';
import { springSnappy } from '../../lib/motion';
import { useEnvioUnico } from '../../hooks/useEnvioUnico';

/**
 * Un campo de la tarjeta: icono, etiqueta pequeña encima y el valor debajo,
 * como los "Desde / Hacia" de un buscador de vuelos.
 */
const Campo = ({ icono: Icono, etiqueta, children, compacto = false, className = '' }) => {
  const id = useId();
  return (
    <div
      className={`flex h-[3.75rem] min-w-0 items-center gap-3 rounded-[1.1rem] border border-separator/60
                  bg-surface transition-[border-color,box-shadow] duration-[var(--t-fast)]
                  focus-within:border-accent focus-within:shadow-focus
                  ${compacto ? 'px-3 sm:px-3.5' : 'px-3.5'} ${className}`}
    >
      {/* En los campos compactos (fecha y hora) el icono solo cabe en
          pantallas medianas: en un móvil de 360 px le quitaba sitio al valor. */}
      <Icono
        size={19} strokeWidth={1.9} aria-hidden="true"
        className={`shrink-0 text-label-tertiary ${compacto ? 'hidden sm:block' : ''}`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-caption text-label-tertiary">{etiqueta}</label>
        {React.cloneElement(children, {
          id,
          className: `block w-full min-w-0 bg-transparent p-0 text-subhead font-semibold
                      text-label outline-none [&::-webkit-date-and-time-value]:text-left
                      ${children.props.className || ''}`,
        })}
      </div>
    </div>
  );
};

/* El icono del calendario que Chrome pone dentro de fecha y hora se come el
   valor en el móvil. Ahí sobra: tocar el campo ya abre el selector. */
const SIN_ICONO_NATIVO = 'appearance-none max-sm:[&::-webkit-calendar-picker-indicator]:hidden';

/** El botón redondo grande de la tarjeta, como la lupa de un buscador. */
const BotonRedondo = ({ etiqueta, icono: Icono, onClick, ocupado }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      aria-label={etiqueta}
      title={etiqueta}
      whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.92 }}
      transition={springSnappy}
      className="tappable flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-full
                 bg-gradient-to-br from-accent to-brand text-white shadow-[0_12px_26px_-10px_rgb(var(--c-accent)/0.8)]
                 transition-[filter] hover:brightness-110 disabled:opacity-60"
    >
      {ocupado
        ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        : <Icono size={24} strokeWidth={2.3} />}
    </motion.button>
  );
};

/**
 * Registro rápido, la tarjeta que se monta sobre la portada del Resumen.
 *
 * Pestañas para Recorridos y Riegos (solo las que la cuenta puede usar):
 *  - Riego: fecha, hora y costo opcional; el botón lo registra al momento.
 *  - Recorrido: vehículo, tipo, fecha y hora; el botón abre el formulario
 *    completo con todo eso ya puesto, para añadir los estudiantes y
 *    confirmar. Registrarlo sin estudiantes dejaría el estado de cuenta sin
 *    el detalle de quién viajó.
 *
 * La hora sigue al reloj mientras nadie la toque: quien abre la app a las
 * 7:05 y registra a las 7:20 no tiene que corregirla.
 */
const RegistroRapido = ({
  puedeRecorridos, puedeRiegos, vehiculos, vehiculoSugerido,
  onRecorrido, onRiego, className = '',
}) => {
  const [pestana, setPestana] = useState(puedeRecorridos ? 'recorrido' : 'riego');
  const [vehiculoId, setVehiculoId] = useState('');
  const [tipo, setTipo] = useState('traer');
  const [fecha, setFecha] = useState(hoyISO);
  const [hora, setHora] = useState(horaActual);
  const [horaTocada, setHoraTocada] = useState(false);
  const [costo, setCosto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Id del próximo riego: el mismo mientras no se registre, para que un
  // envío repetido no lo duplique en el servidor.
  const idRiego = useRef(null);
  if (idRiego.current === null) idRiego.current = nuevoId();
  const [aviso, setAviso] = useState('');
  const reduceMotion = useReducedMotion();

  // Si la cuenta cambia de permisos, la pestaña tiene que existir.
  useEffect(() => {
    if (pestana === 'recorrido' && !puedeRecorridos) setPestana('riego');
    if (pestana === 'riego' && !puedeRiegos) setPestana('recorrido');
  }, [pestana, puedeRecorridos, puedeRiegos]);

  // Vehículo por defecto: el del último recorrido, o el único que haya.
  useEffect(() => {
    if (vehiculoId) return;
    const activos = vehiculos.filter((v) => v.activo !== false);
    const sugerido = activos.find((v) => String(v.id) === String(vehiculoSugerido));
    if (sugerido) setVehiculoId(String(sugerido.id));
    else if (activos.length === 1) setVehiculoId(String(activos[0].id));
  }, [vehiculos, vehiculoSugerido, vehiculoId]);

  useEffect(() => {
    if (horaTocada) return undefined;
    const reloj = setInterval(() => {
      setHora(horaActual());
      setFecha(hoyISO());
    }, 30_000);
    return () => clearInterval(reloj);
  }, [horaTocada]);

  const reiniciarHora = () => {
    setHoraTocada(false);
    setHora(horaActual());
    setFecha(hoyISO());
  };

  const continuarRecorrido = () => {
    if (!vehiculoId) {
      setAviso('Elige el vehículo');
      return;
    }
    setAviso('');
    onRecorrido({ vehiculo_id: vehiculoId, tipo_recorrido: tipo, fecha, hora_inicio: hora });
    reiniciarHora();
  };

  const registrarRiego = useEnvioUnico(async () => {
    if (!fecha || !hora) {
      setAviso('Pon la fecha y la hora');
      return;
    }
    setAviso('');
    setOcupado(true);
    const datos = { fecha, hora };
    // Vacío: lo pone la base de datos ($1.00), como en el formulario de riegos.
    if (String(costo).trim() !== '') datos.costo = parseFloat(costo);
    const bien = await onRiego(datos, idRiego.current);
    setOcupado(false);
    if (bien) {
      idRiego.current = nuevoId();
      setCosto('');
      reiniciarHora();
    }
  });

  const pestanas = [
    puedeRecorridos && { clave: 'recorrido', etiqueta: 'Recorridos', icono: RouteIcon },
    puedeRiegos && { clave: 'riego', etiqueta: 'Riegos', icono: Droplets },
  ].filter(Boolean);

  const campoFechaHora = (
    <div className="grid min-w-0 flex-1 grid-cols-[1.25fr_1fr] gap-2">
      <Campo icono={CalendarDays} etiqueta="Fecha" compacto>
        <input
          type="date" value={fecha} className={SIN_ICONO_NATIVO}
          onChange={(e) => { setFecha(e.target.value); setHoraTocada(true); }}
        />
      </Campo>
      <Campo icono={Clock} etiqueta="Hora" compacto>
        <input
          type="time" value={hora} className={SIN_ICONO_NATIVO}
          onChange={(e) => { setHora(e.target.value); setHoraTocada(true); }}
        />
      </Campo>
    </div>
  );

  return (
    <div className={`rounded-[1.6rem] border border-separator/40 bg-surface p-3 shadow-level-3 sm:p-4 ${className}`}>
      {/* Pestañas: icono encima y una barra bajo la elegida */}
      {pestanas.length > 1 && (
        <div role="tablist" aria-label="Qué registrar" className="mb-3 grid grid-cols-2 gap-1 rounded-[1.1rem] bg-fill/8 p-1">
          {pestanas.map(({ clave, etiqueta, icono: Icono }) => {
            const activa = pestana === clave;
            return (
              <button
                key={clave}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => { setPestana(clave); setAviso(''); }}
                className={`tappable relative flex flex-col items-center gap-0.5 rounded-[0.85rem] py-2 text-footnote font-medium transition-colors ${
                  activa ? 'text-accent' : 'text-label-secondary hover:text-label'
                }`}
              >
                {activa && (
                  <motion.span
                    layoutId="registro-rapido-pestana"
                    transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                    className="absolute inset-0 rounded-[0.85rem] bg-surface shadow-level-1"
                  />
                )}
                <Icono size={19} strokeWidth={activa ? 2.3 : 1.9} className="relative" />
                <span className="relative">{etiqueta}</span>
              </button>
            );
          })}
        </div>
      )}

      {pestana === 'recorrido' ? (
        <div className="space-y-2" role="tabpanel" aria-label="Registrar recorrido">
          <div className="flex gap-2">
            <Campo icono={Bus} etiqueta="Vehículo" className="flex-1">
              <select value={vehiculoId} onChange={(e) => { setVehiculoId(e.target.value); setAviso(''); }}>
                <option value="">Elegir…</option>
                {vehiculos.filter((v) => v.activo !== false).map((v) => (
                  <option key={v.id} value={v.id}>{v.descripcion}</option>
                ))}
              </select>
            </Campo>
            {/* Traer / Llevar: el "ida y vuelta" del buscador */}
            <div role="radiogroup" aria-label="Tipo de recorrido" className="flex shrink-0 flex-col justify-center gap-1 rounded-[1.1rem] bg-fill/8 p-1">
              {[['traer', 'Traer'], ['llevar', 'Llevar']].map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={tipo === valor}
                  onClick={() => setTipo(valor)}
                  className={`tappable rounded-[0.7rem] px-3 py-1 text-footnote font-semibold transition-colors ${
                    tipo === valor
                      ? valor === 'traer' ? 'bg-positive text-white' : 'bg-caution text-white'
                      : 'text-label-secondary hover:bg-fill/12'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {campoFechaHora}
            <BotonRedondo etiqueta="Continuar: añadir estudiantes" icono={ArrowRight} onClick={continuarRecorrido} />
          </div>
          <p className={`px-1 text-caption ${aviso ? 'font-medium text-critical' : 'text-label-tertiary'}`} role={aviso ? 'alert' : undefined}>
            {aviso || 'Después eliges los estudiantes y confirmas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="tabpanel" aria-label="Registrar riego">
          {campoFechaHora}
          <div className="flex items-center gap-2">
            <Campo icono={DollarSign} etiqueta="Costo (opcional)" className="flex-1">
              <input
                type="number" inputMode="decimal" step="0.01" min="0" placeholder="1.00"
                value={costo} onChange={(e) => setCosto(e.target.value)}
              />
            </Campo>
            <BotonRedondo etiqueta="Registrar riego" icono={Plus} onClick={registrarRiego} ocupado={ocupado} />
          </div>
          <p className={`px-1 text-caption ${aviso ? 'font-medium text-critical' : 'text-label-tertiary'}`} role={aviso ? 'alert' : undefined}>
            {aviso || 'Sin costo se registra como $1.00.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RegistroRapido;
