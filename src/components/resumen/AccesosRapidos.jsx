import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { springSnappy, haptics } from '../../lib/motion';

/**
 * Fila de accesos rápidos en círculos, con su nombre debajo.
 *
 * Cada acceso: { clave, etiqueta, icono, onClick, deshabilitado, tono }.
 * El tono pinta el círculo; por defecto, el azul de la app.
 */
const TONOS = {
  accent: 'bg-accent/12 text-accent',
  positive: 'bg-positive/14 text-positive',
  caution: 'bg-caution/16 text-caution',
  info: 'bg-info/14 text-info',
  brand: 'bg-brand/14 text-brand',
};

const AccesosRapidos = ({ accesos, className = '' }) => {
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Accesos rápidos" className={className}>
      <ul className="grid grid-cols-4 gap-1 sm:gap-3">
        {accesos.map(({ clave, etiqueta, icono: Icono, onClick, deshabilitado, tono = 'accent' }) => (
          <li key={clave}>
            <motion.button
              type="button"
              onClick={() => { haptics.tick(); onClick(); }}
              disabled={deshabilitado}
              whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.94 }}
              transition={springSnappy}
              className="tappable group flex w-full flex-col items-center gap-2 rounded-card px-1 py-1.5
                         disabled:opacity-40 disabled:pointer-events-none"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.03]
                            transition-transform duration-[var(--t-fast)] group-hover:-translate-y-0.5 ${TONOS[tono] || TONOS.accent}`}
              >
                <Icono size={22} strokeWidth={2} />
              </span>
              <span className="text-center text-caption font-medium leading-tight text-label-secondary">
                {etiqueta}
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default AccesosRapidos;
