import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  LogIn, LogOut, Bus, Users, StickyNote, Check, Search, TriangleAlert, Route as RouteIcon,
} from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { Seccion, OpcionesGrandes, FechaYHora, CajaCampo } from './Formulario';
import { springSnappy, haptics } from '../../lib/motion';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** A partir de cuántos estudiantes aparece el buscador. */
const BUSCAR_DESDE = 9;

const TIPOS = [
  { valor: 'traer', titulo: 'Traer', detalle: 'Traer estudiantes', icono: LogIn, tono: 'positive' },
  { valor: 'llevar', titulo: 'Llevar', detalle: 'Llevar estudiantes', icono: LogOut, tono: 'caution' },
];

const iniciales = (n) => `${n.nombre?.charAt(0) ?? ''}${n.apellidos?.charAt(0) ?? ''}`.toUpperCase() || '?';

/** El vehículo elegido, o null. */
const vehiculoDe = (datos, vehiculos) => vehiculos.find((v) => String(v.id) === String(datos.vehiculo_id)) ?? null;

/**
 * La línea del pie: lo que se va a guardar, en pocas palabras. En un alta
 * dice el costo, que sale de la tarifa del vehículo; al editar no, porque
 * cambiar de vehículo no cambia el costo de un recorrido ya registrado.
 */
export const ResumenRecorrido = ({ datos, vehiculos, seleccionados, editando }) => {
  const vehiculo = vehiculoDe(datos, vehiculos);
  const n = seleccionados.length;
  const estudiantes = `${n} ${n === 1 ? 'estudiante' : 'estudiantes'}`;
  if (editando) return estudiantes;
  if (!vehiculo) return 'Elige el vehículo para ver el costo';
  return (
    <>
      Costo <span className="tabular font-semibold text-label">{dinero.format(parseFloat(vehiculo.costo_por_recorrido || 0))}</span>
      {' · '}{estudiantes}
    </>
  );
};

/** Tarjeta elegible de un vehículo: nombre, tarifa y plazas. */
const TarjetaVehiculo = ({ vehiculo, activa, onElegir, deshabilitado }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={activa}
      disabled={deshabilitado}
      onClick={() => { haptics.tick(); onElegir(String(vehiculo.id)); }}
      whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.97 }}
      transition={springSnappy}
      className={`tappable relative flex min-w-0 items-center gap-2.5 rounded-[1.1rem] border-2 p-2.5 text-left transition-colors
                  disabled:opacity-50 ${activa ? 'border-accent bg-accent/10' : 'border-separator/50 bg-surface hover:border-separator'}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          activa ? 'bg-accent text-white' : 'bg-fill/10 text-label-secondary'
        }`}
      >
        {activa ? <Check size={17} strokeWidth={2.8} /> : <Bus size={17} strokeWidth={2} />}
      </span>
      <span className="min-w-0">
        <span className={`line-clamp-2 block text-footnote font-semibold leading-tight ${activa ? 'text-accent' : 'text-label'}`}>
          {vehiculo.descripcion}
        </span>
        <span className="tabular block truncate text-caption text-label-secondary">
          {dinero.format(parseFloat(vehiculo.costo_por_recorrido || 0))}
          {vehiculo.capacidad ? ` · ${vehiculo.capacidad} plazas` : ''}
        </span>
      </span>
    </motion.button>
  );
};

/** Ficha de un estudiante: se toca para subirlo o bajarlo del recorrido. */
const FichaEstudiante = ({ nino, elegido, onAlternar, deshabilitado }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={elegido}
    disabled={deshabilitado}
    onClick={() => { haptics.tick(); onAlternar(nino); }}
    className={`tappable flex h-10 max-w-full items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-footnote font-medium
                transition-colors disabled:opacity-50 ${
      elegido
        ? 'border-accent bg-accent text-white shadow-level-1'
        : 'border-separator/60 bg-surface text-label hover:border-separator'
    }`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
        elegido ? 'bg-white/20 text-white' : 'bg-fill/10 text-label-secondary'
      }`}
    >
      {elegido ? <Check size={15} strokeWidth={3} /> : iniciales(nino)}
    </span>
    <span className="truncate">{nino.nombre} {nino.apellidos}</span>
  </button>
);

/**
 * Formulario de un recorrido, el mismo en la pantalla de Recorridos y en el
 * Resumen. Solo pinta y avisa de cambios: guardar es cosa de la pantalla.
 *
 *  - Tipo: Traer o Llevar, en dos opciones grandes.
 *  - Vehículo: tarjetas con la tarifa y las plazas, en lugar de un
 *    desplegable que obligaba a abrirlo para saber qué había.
 *  - Cuándo: fecha y hora con los atajos Hoy, Ayer y Ahora.
 *  - Estudiantes: fichas que se tocan para añadir o quitar, con las plazas
 *    ocupadas del vehículo. Con muchos estudiantes aparece un buscador.
 *  - Notas.
 *
 * `seleccionados` tiene la forma que manda la API: { nino_id, nombre,
 * apellidos, notas }.
 */
const FormularioRecorrido = ({
  id, onSubmit, datos, onCampo, vehiculos, ninos, seleccionados, onSeleccion,
  deshabilitado = false, cargando = false,
}) => {
  const [busqueda, setBusqueda] = useState('');

  const activos = useMemo(() => vehiculos.filter((v) => v.activo !== false), [vehiculos]);
  const vehiculo = vehiculoDe(datos, activos);
  // Un recorrido antiguo puede tener un vehículo que ya se desactivó.
  const vehiculoPerdido = Boolean(datos.vehiculo_id) && !vehiculo;

  const idsElegidos = useMemo(() => new Set(seleccionados.map((n) => String(n.nino_id))), [seleccionados]);

  // Todos los estudiantes activos, más los elegidos que ya no lo estén (un
  // recorrido antiguo), para que se vean y se puedan quitar.
  const todos = useMemo(() => {
    const lista = ninos.map((n) => ({ id: String(n.id), nombre: n.nombre, apellidos: n.apellidos }));
    const conocidos = new Set(lista.map((n) => n.id));
    seleccionados.forEach((s) => {
      if (!conocidos.has(String(s.nino_id))) {
        lista.push({ id: String(s.nino_id), nombre: s.nombre, apellidos: s.apellidos });
      }
    });
    return lista.sort((a, b) => `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`, 'es'));
  }, [ninos, seleccionados]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return todos;
    return todos.filter((n) => idsElegidos.has(n.id) || `${n.nombre} ${n.apellidos}`.toLowerCase().includes(termino));
  }, [todos, busqueda, idsElegidos]);

  const alternar = (nino) => {
    if (idsElegidos.has(nino.id)) {
      onSeleccion(seleccionados.filter((s) => String(s.nino_id) !== nino.id));
    } else {
      onSeleccion([...seleccionados, { nino_id: nino.id, nombre: nino.nombre, apellidos: nino.apellidos, notas: '' }]);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-5 py-1" aria-busy="true">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton variant="text" className="h-16 w-full !rounded-[1.1rem]" />
          <Skeleton variant="text" className="h-16 w-full !rounded-[1.1rem]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton variant="text" className="h-14 w-full !rounded-[1.1rem]" />
          <Skeleton variant="text" className="h-14 w-full !rounded-[1.1rem]" />
        </div>
        <Skeleton variant="text" className="h-[3.75rem] w-full !rounded-[1.1rem]" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="text" className="h-10 w-32 !rounded-full" />)}
        </div>
      </div>
    );
  }

  const capacidad = Number(vehiculo?.capacidad) || 0;
  const sobrecupo = capacidad > 0 && seleccionados.length > capacidad;

  return (
    <form id={id} onSubmit={onSubmit} className="space-y-5" noValidate>
      <Seccion icono={RouteIcon} titulo="Tipo de recorrido">
        <OpcionesGrandes
          etiqueta="Tipo de recorrido"
          opciones={TIPOS}
          valor={datos.tipo_recorrido}
          onCambiar={(v) => onCampo('tipo_recorrido', v)}
          deshabilitado={deshabilitado}
        />
      </Seccion>

      <Seccion icono={Bus} titulo="Vehículo">
        {activos.length === 0 ? (
          <p className="rounded-[1.1rem] border border-dashed border-separator/70 px-4 py-5 text-center text-footnote text-label-secondary">
            Aún no tienes vehículos.{' '}
            <Link to="/vehiculos" className="font-semibold text-accent">Registra uno</Link> para poder asignarlo.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Vehículo" className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {activos.map((v) => (
              <TarjetaVehiculo
                key={v.id}
                vehiculo={v}
                activa={String(v.id) === String(datos.vehiculo_id)}
                onElegir={(valor) => onCampo('vehiculo_id', valor)}
                deshabilitado={deshabilitado}
              />
            ))}
          </div>
        )}
        {vehiculoPerdido && (
          <p className="mt-2 flex items-start gap-1.5 px-0.5 text-caption text-caution">
            <TriangleAlert size={13} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden="true" />
            El vehículo de este recorrido ya no está activo. Elige otro para guardar.
          </p>
        )}
      </Seccion>

      <FechaYHora
        fecha={datos.fecha}
        hora={datos.hora_inicio}
        onFecha={(v) => onCampo('fecha', v)}
        onHora={(v) => onCampo('hora_inicio', v)}
        etiquetaHora="Salida"
        deshabilitado={deshabilitado}
      />

      <Seccion
        icono={Users}
        titulo="Estudiantes"
        extra={(
          <span className={`tabular rounded-full px-2.5 py-0.5 text-caption font-semibold ${
            sobrecupo ? 'bg-caution/16 text-caution' : 'bg-fill/10 text-label-secondary'
          }`}
          >
            {capacidad > 0 ? `${seleccionados.length} de ${capacidad} plazas` : `${seleccionados.length} elegidos`}
          </span>
        )}
      >
        {todos.length >= BUSCAR_DESDE && (
          <label className="relative mb-2.5 block">
            <span className="sr-only">Buscar estudiante</span>
            <Search size={16} strokeWidth={2} aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label-tertiary" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante"
              className="h-10 w-full rounded-full border border-separator/60 bg-surface pl-10 pr-4 text-subhead text-label
                         outline-none placeholder:text-label-tertiary focus:border-accent focus:shadow-focus"
            />
          </label>
        )}

        {todos.length === 0 ? (
          <p className="rounded-[1.1rem] border border-dashed border-separator/70 px-4 py-5 text-center text-footnote text-label-secondary">
            Aún no tienes estudiantes.{' '}
            <Link to="/ninos" className="font-semibold text-accent">Registra uno</Link> para subirlo a tus recorridos.
          </p>
        ) : (
          <div role="group" aria-label="Estudiantes del recorrido" className="scroll-area -m-1 flex max-h-56 flex-wrap gap-2 overflow-y-auto p-1">
            {visibles.map((n) => (
              <FichaEstudiante
                key={n.id}
                nino={n}
                elegido={idsElegidos.has(n.id)}
                onAlternar={alternar}
                deshabilitado={deshabilitado}
              />
            ))}
            {visibles.length === 0 && (
              <p className="w-full py-3 text-center text-footnote text-label-tertiary">Ningún estudiante coincide.</p>
            )}
          </div>
        )}

        {sobrecupo && (
          <p className="mt-2 flex items-start gap-1.5 px-0.5 text-caption text-caution" role="alert">
            <TriangleAlert size={13} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden="true" />
            {vehiculo.descripcion} admite {capacidad} estudiantes: con {seleccionados.length} no se podrá guardar.
          </p>
        )}
      </Seccion>

      <Seccion icono={StickyNote} titulo="Notas">
        <CajaCampo icono={StickyNote} etiqueta="Opcional">
          <input
            type="text"
            value={datos.notas}
            maxLength={1000}
            disabled={deshabilitado}
            placeholder="Tráfico, desvíos, novedades…"
            onChange={(e) => onCampo('notas', e.target.value)}
          />
        </CajaCampo>
      </Seccion>
    </form>
  );
};

export default FormularioRecorrido;
