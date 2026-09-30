import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, CalendarDays, Clock, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import { hoyISO, horaActual, sumarDias } from '../../lib/fechas';
import { springSnappy, haptics } from '../../lib/motion';

/*
 * Piezas de los formularios para registrar (recorridos, riegos, estudiantes,
 * vehículos). Iguales en el móvil, donde el formulario sube como una hoja
 * desde abajo, y en escritorio, donde es un diálogo centrado.
 */

/**
 * Tonos para las opciones elegibles. Clases escritas enteras (no armadas
 * con plantillas): Tailwind solo genera las que encuentra tal cual.
 */
const TONOS = {
  accent: { activa: 'border-accent bg-accent/10', icono: 'bg-accent text-white', texto: 'text-accent' },
  positive: { activa: 'border-positive bg-positive/10', icono: 'bg-positive text-white', texto: 'text-positive' },
  caution: { activa: 'border-caution bg-caution/10', icono: 'bg-caution text-white', texto: 'text-caution' },
  info: { activa: 'border-info bg-info/10', icono: 'bg-info text-white', texto: 'text-info' },
};

/** Un bloque del formulario, con su título pequeño y, a la derecha, un extra. */
export const Seccion = ({ icono: Icono, titulo, extra = null, children, className = '' }) => (
  <fieldset className={`min-w-0 ${className}`}>
    <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
      <legend className="flex items-center gap-1.5 text-footnote font-semibold text-label-secondary">
        {Icono && <Icono size={14} strokeWidth={2.2} aria-hidden="true" />}
        {titulo}
      </legend>
      {extra}
    </div>
    {children}
  </fieldset>
);

/**
 * Opciones grandes, como Traer / Llevar: icono, nombre y una línea que
 * explica. La elegida se tiñe de su color y lleva una marca.
 *
 * `apilar`: una debajo de otra en el móvil. Para opciones con nombres
 * largos ("Administrador"), que en media pantalla no caben.
 */
export const OpcionesGrandes = ({ etiqueta, opciones, valor, onCambiar, deshabilitado = false, apilar = false }) => {
  const reduceMotion = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`grid gap-2 ${apilar ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
      {opciones.map(({ valor: v, titulo, detalle, icono: Icono, tono = 'accent' }) => {
        const activa = v === valor;
        const t = TONOS[tono] || TONOS.accent;
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={activa}
            disabled={deshabilitado}
            onClick={() => { haptics.tick(); onCambiar(v); }}
            whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.97 }}
            transition={springSnappy}
            className={`tappable relative flex items-center gap-3 rounded-[1.1rem] border-2 p-3 text-left transition-colors
                        disabled:opacity-50 ${activa ? t.activa : 'border-separator/50 bg-surface hover:border-separator'}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                activa ? t.icono : 'bg-fill/10 text-label-secondary'
              }`}
            >
              <Icono size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={`block text-subhead font-semibold ${activa ? t.texto : 'text-label'}`}>{titulo}</span>
              {detalle && <span className="line-clamp-2 block text-caption leading-tight text-label-secondary">{detalle}</span>}
            </span>
            {activa && (
              <span className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full ${t.icono}`}>
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

/** Botón píldora pequeño (atajos como "Hoy", "Ayer", "Ahora"). */
export const Atajo = ({ activo = false, children, ...props }) => (
  <button
    type="button"
    aria-pressed={activo}
    className={`tappable flex h-8 items-center gap-1 rounded-full px-3 text-footnote font-semibold transition-colors disabled:opacity-50 ${
      activo ? 'bg-accent text-white' : 'bg-fill/10 text-label-secondary hover:bg-fill/16 hover:text-label'
    }`}
    {...props}
  >
    {children}
  </button>
);

/**
 * Caja con icono y la etiqueta pequeña dentro, encima del valor. Envuelve
 * un único `<input>` o `<select>`; `trailing` va al final (el ojo de una
 * contraseña, por ejemplo).
 */
export const CajaCampo = ({ icono: Icono, etiqueta, prefijo = null, trailing = null, children, className = '' }) => {
  const id = useId();
  return (
    <div
      data-campo
      className={`flex h-[3.75rem] min-w-0 items-center gap-3 rounded-[1.1rem] border border-separator/60 bg-surface px-3.5
                  transition-[border-color,box-shadow] duration-[var(--t-fast)]
                  focus-within:border-accent focus-within:shadow-focus ${className}`}
    >
      {Icono && <Icono size={19} strokeWidth={1.9} className="hidden shrink-0 text-label-tertiary min-[380px]:block" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-caption text-label-tertiary">{etiqueta}</label>
        <div className="flex items-baseline gap-0.5">
          {prefijo && <span className="text-subhead font-semibold text-label-secondary">{prefijo}</span>}
          {React.cloneElement(children, {
            id,
            className: `block w-full min-w-0 appearance-none bg-transparent p-0 text-subhead font-semibold text-label
                        outline-none placeholder:font-normal placeholder:text-label-quaternary
                        [&::-webkit-date-and-time-value]:text-left ${children.props.className || ''}`,
          })}
        </div>
      </div>
      {trailing}
    </div>
  );
};

/**
 * Opciones que se marcan y desmarcan por separado (varias a la vez), con el
 * mismo aspecto que OpcionesGrandes. Cada opción trae su `marcada` y su
 * `onCambiar`.
 */
export const OpcionesMarcables = ({ etiqueta, opciones, deshabilitado = false }) => {
  const reduceMotion = useReducedMotion();
  return (
    <div role="group" aria-label={etiqueta} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {opciones.map(({ clave, titulo, detalle, icono: Icono, tono = 'accent', marcada, onCambiar }) => {
        const t = TONOS[tono] || TONOS.accent;
        return (
          <motion.button
            key={clave}
            type="button"
            role="checkbox"
            aria-checked={marcada}
            disabled={deshabilitado}
            onClick={() => { haptics.tick(); onCambiar(!marcada); }}
            whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.97 }}
            transition={springSnappy}
            className={`tappable relative flex items-center gap-3 rounded-[1.1rem] border-2 p-3 text-left transition-colors
                        disabled:opacity-50 ${marcada ? t.activa : 'border-separator/50 bg-surface hover:border-separator'}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                marcada ? t.icono : 'bg-fill/10 text-label-secondary'
              }`}
            >
              <Icono size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-subhead font-semibold ${marcada ? t.texto : 'text-label'}`}>{titulo}</span>
              {detalle && <span className="line-clamp-2 block text-caption leading-tight text-label-secondary">{detalle}</span>}
            </span>
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                marcada ? `border-transparent ${t.icono}` : 'border-separator'
              }`}
            >
              {marcada && <Check size={13} strokeWidth={3} />}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

/**
 * Fecha y hora, con atajos: "Hoy" y "Ayer" cambian la fecha; "Ahora" pone
 * la fecha y la hora del reloj. Lo normal es registrar algo que acaba de
 * pasar o que pasó ayer y se olvidó.
 */
export const FechaYHora = ({ fecha, hora, onFecha, onHora, etiquetaHora = 'Hora', deshabilitado = false }) => {
  const hoy = hoyISO();
  const ayer = sumarDias(hoy, -1);
  return (
    <Seccion
      icono={CalendarDays}
      titulo="Cuándo"
      extra={(
        <div className="flex gap-1.5">
          <Atajo activo={fecha === hoy} onClick={() => onFecha(hoy)} disabled={deshabilitado}>Hoy</Atajo>
          <Atajo activo={fecha === ayer} onClick={() => onFecha(ayer)} disabled={deshabilitado}>Ayer</Atajo>
          <Atajo
            onClick={() => { onFecha(hoy); onHora(horaActual()); }}
            disabled={deshabilitado}
            aria-label="Poner la fecha y la hora de ahora"
          >
            <RotateCcw size={12} strokeWidth={2.6} aria-hidden="true" /> Ahora
          </Atajo>
        </div>
      )}
    >
      <div className="grid grid-cols-[1.2fr_1fr] gap-2">
        <CajaCampo icono={CalendarDays} etiqueta="Fecha">
          <input
            type="date" value={fecha} required disabled={deshabilitado}
            className="max-sm:[&::-webkit-calendar-picker-indicator]:hidden"
            onChange={(e) => onFecha(e.target.value)}
          />
        </CajaCampo>
        <CajaCampo icono={Clock} etiqueta={etiquetaHora}>
          <input
            type="time" value={hora} required disabled={deshabilitado}
            className="max-sm:[&::-webkit-calendar-picker-indicator]:hidden"
            onChange={(e) => onHora(e.target.value)}
          />
        </CajaCampo>
      </div>
    </Seccion>
  );
};

/**
 * Pie de los formularios: a la izquierda (arriba en el móvil) un resumen de
 * lo que se va a guardar; a la derecha, Cancelar y el botón principal.
 */
export const PieDeFormulario = ({
  resumen = null, onCancelar, form, textoEnviar, cargando = false, deshabilitado = false, icono = null,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 text-center text-footnote text-label-secondary sm:text-left" aria-live="polite">
      {resumen}
    </div>
    {/* En la misma fila también en el móvil: apilados se comían media hoja. */}
    <div className="flex gap-2">
      <Button variant="secondary" className="!rounded-full" onClick={onCancelar}>Cancelar</Button>
      <Button
        type="submit"
        form={form}
        loading={cargando}
        loadingText="Guardando"
        disabled={deshabilitado}
        icon={icono}
        className="!rounded-full flex-1 bg-gradient-to-r from-accent to-brand px-6 shadow-[0_10px_22px_-10px_rgb(var(--c-accent)/0.8)] sm:flex-none"
      >
        {textoEnviar}
      </Button>
    </div>
  </div>
);
