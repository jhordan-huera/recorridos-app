import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Search, ArrowUpRight, Trash2 } from 'lucide-react';
import { springSnappy, haptics } from '../../lib/motion';

/*
 * Piezas de la presentación móvil (menos de 768 px): fondo azul suave,
 * tarjetas en azul pastel, botones en azul marino y listas en dos columnas.
 * En tableta y escritorio las pantallas siguen con su diseño de siempre;
 * cada una elige cuál pintar con useEsMovil().
 */

/**
 * El aspecto de toda tarjeta pastel: fondo pastel, un borde fino y una
 * sombra corta. Sin el borde y la sombra, sobre el fondo azul del móvil
 * las tarjetas se fundían y no se veía dónde acababa una y empezaba otra.
 */
export const TARJETA_PASTEL = 'bg-[rgb(var(--c-pastel))] ring-1 ring-inset ring-[rgb(var(--c-marino)/0.07)] shadow-[0_2px_10px_-4px_rgb(var(--c-marino)/0.22)]';
export const TARJETA_PASTEL_FUERTE = 'bg-[rgb(var(--c-pastel-2))] ring-1 ring-inset ring-[rgb(var(--c-marino)/0.1)] shadow-[0_4px_14px_-6px_rgb(var(--c-marino)/0.35)]';

/** Botón redondo blanco, como los de las esquinas de la cabecera. */
export const BotonCircular = ({ etiqueta, icono: Icono, onClick, className = '', ...props }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={(e) => { haptics.tick(); onClick?.(e); }}
      aria-label={etiqueta}
      title={etiqueta}
      whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }}
      transition={springSnappy}
      className={`tappable flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))]
                  shadow-level-1 ring-1 ring-separator/30 ${className}`}
      {...props}
    >
      <Icono size={20} strokeWidth={2.1} />
    </motion.button>
  );
};

/** Título centrado con, a la derecha, la acción principal de la pantalla. */
export const CabeceraMovil = ({ titulo, accion = null }) => (
  <div className="mb-4 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
    <span aria-hidden="true" />
    <h1 className="truncate text-center text-title3 font-bold text-label">{titulo}</h1>
    {accion ? <BotonCircular {...accion} /> : <span aria-hidden="true" />}
  </div>
);

/** Buscador en píldora. */
export const BuscadorMovil = ({ valor, onCambiar, placeholder, etiqueta = placeholder }) => (
  <label className="relative mb-4 block">
    <span className="sr-only">{etiqueta}</span>
    <Search
      size={18} strokeWidth={2} aria-hidden="true"
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-label-tertiary"
    />
    <input
      type="search"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-full border border-separator/40 bg-surface pl-11 pr-4 text-subhead text-label
                 shadow-level-1 outline-none placeholder:text-label-tertiary focus:border-accent focus:shadow-focus"
    />
  </label>
);

/** Filtros en píldoras: la elegida en marino, las demás en pastel. */
export const FiltrosMovil = ({ opciones, valor, onCambiar, etiqueta }) => (
  <div role="radiogroup" aria-label={etiqueta} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {opciones.map((opcion) => {
      const activa = opcion.valor === valor;
      return (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={activa}
          onClick={() => { haptics.tick(); onCambiar(opcion.valor); }}
          className={`tappable shrink-0 rounded-full px-4 py-2 text-footnote font-semibold transition-colors ${
            activa ? 'bg-[rgb(var(--c-marino))] text-white shadow-level-1' : 'bg-[rgb(var(--c-pastel))] text-label-secondary'
          }`}
        >
          {opcion.etiqueta}
        </button>
      );
    })}
  </div>
);

/**
 * Cifras en recuadros pequeños: icono en un círculo, el número grande y lo
 * que es debajo. Hasta cuatro en fila.
 */
export const CifrasMovil = ({ cifras }) => (
  <dl className={`mb-5 grid gap-2 ${cifras.length >= 4 ? 'grid-cols-4' : cifras.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
    {cifras.map(({ clave, icono: Icono, valor, etiqueta }) => (
      <div key={clave} className={`flex flex-col items-center rounded-[1.1rem] px-1.5 py-3 text-center ${TARJETA_PASTEL}`}>
        <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c-marino))] text-white">
          <Icono size={17} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <dd className="tabular max-w-full truncate text-headline font-bold text-label">{valor}</dd>
        <dt className="text-caption2 leading-tight text-label-secondary">{etiqueta}</dt>
      </div>
    ))}
  </dl>
);

/** Círculo con la inicial o un icono, como la foto de una ficha. */
export const AvatarMovil = ({ children, fondo = 'bg-surface text-[rgb(var(--c-marino))]', className = '' }) => (
  <span
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-subhead font-bold
                ring-2 ring-white/70 dark:ring-white/10 ${fondo} ${className}`}
  >
    {children}
  </span>
);

/**
 * Ficha pastel para las listas en dos columnas.
 *
 * Arriba, el avatar y el nombre; abajo, el dato principal con su detalle
 * y el botón ↗ que la abre. El botón de borrar va en la esquina y solo si
 * la pantalla lo permite.
 */
export const TarjetaMovil = ({
  avatar, titulo, subtitulo, insignia = null,
  valor, iconoValor: IconoValor = null, claseIconoValor = 'text-caution', detalle,
  onAbrir, etiquetaAbrir, onBorrar = null, etiquetaBorrar,
  destacada = false,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <article className={`relative flex h-full min-h-[10rem] flex-col rounded-[1.4rem] p-3 ${destacada ? TARJETA_PASTEL_FUERTE : TARJETA_PASTEL}`}>
      {/* Arriba el avatar y, en la otra esquina, borrar. El título va debajo
          a todo el ancho: al lado del avatar no cabía ni una fecha corta. */}
      <div className="flex items-start justify-between gap-2">
        {avatar}
        {onBorrar && (
          <button
            type="button"
            onClick={onBorrar}
            aria-label={etiquetaBorrar}
            className="tappable -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-label-tertiary
                       transition-colors hover:bg-critical/12 hover:text-critical"
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-subhead font-bold leading-tight text-label">{titulo}</h3>
      {subtitulo && <p className="mt-0.5 truncate text-caption text-label-secondary">{subtitulo}</p>}
      {insignia && <div className="mt-2">{insignia}</div>}

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="tabular flex items-center gap-1 text-subhead font-bold text-label">
            {IconoValor && <IconoValor size={15} strokeWidth={2.4} className={`shrink-0 ${claseIconoValor}`} aria-hidden="true" />}
            <span className="truncate">{valor}</span>
          </p>
          {detalle && <p className="truncate text-caption2 text-label-secondary">{detalle}</p>}
        </div>
        {onAbrir && (
          <motion.button
            type="button"
            onClick={onAbrir}
            aria-label={etiquetaAbrir}
            whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.88 }}
            transition={springSnappy}
            className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))] shadow-level-1"
          >
            <ArrowUpRight size={18} strokeWidth={2.3} />
          </motion.button>
        )}
      </div>
    </article>
  );
};

/** Etiqueta pequeña dentro de una ficha (estado, hora, "Por enviar"…). */
export const InsigniaMovil = ({ children, tono = 'neutra', title }) => {
  const tonos = {
    neutra: 'bg-surface/80 text-label-secondary',
    verde: 'bg-positive text-white',
    naranja: 'bg-caution text-white',
    azul: 'bg-info text-white',
    aviso: 'bg-caution/18 text-caution',
    error: 'bg-critical/14 text-critical',
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption2 font-semibold ${tonos[tono] || tonos.neutra}`}>
      {children}
    </span>
  );
};

/** Título de sección con su "Ver todo" a la derecha. */
export const SeccionMovil = ({ titulo, accion = null, children, className = '' }) => (
  <section className={`mb-6 ${className}`}>
    <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
      <h2 className="text-headline font-bold text-label">{titulo}</h2>
      {accion && (
        <button type="button" onClick={accion.onClick} className="tappable text-footnote font-medium text-accent">
          {accion.etiqueta}
        </button>
      )}
    </div>
    {children}
  </section>
);
