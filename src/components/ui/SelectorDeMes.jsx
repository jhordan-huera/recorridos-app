import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { springSnappy } from '../../lib/motion';
import { MESES } from '../../lib/fechas';

/**
 * Píldora con el mes a la vista y flechas para moverse de uno en uno.
 *
 * `cristal` es la versión para ir encima de una imagen (la portada del
 * Resumen): translúcida y con texto blanco.
 */
const ESTILOS = {
  normal: {
    caja: 'border-separator/70 bg-surface',
    boton: 'text-label-secondary hover:bg-fill/12 hover:text-label',
    mes: 'text-label',
    anio: 'text-label-tertiary',
  },
  cristal: {
    caja: 'border-white/25 bg-white/15 backdrop-blur-thin',
    boton: 'text-white/85 hover:bg-white/15 hover:text-white',
    mes: 'text-white',
    anio: 'text-white/70',
  },
};

const SelectorDeMes = ({ mes, anio, onCambiar, variante = 'normal' }) => {
  const reduceMotion = useReducedMotion();
  const pulsar = reduceMotion ? { opacity: 0.6 } : { scale: 0.9 };
  const estilo = ESTILOS[variante] || ESTILOS.normal;
  const clases = `tappable rounded-full p-1.5 transition-colors ${estilo.boton}`;

  return (
    <div className={`flex w-fit items-center gap-0.5 rounded-full border p-0.5 ${estilo.caja}`}>
      <motion.button type="button" onClick={() => onCambiar(-1)} aria-label="Mes anterior"
        whileTap={pulsar} transition={springSnappy} className={clases}>
        <ChevronLeft size={17} strokeWidth={2.2} />
      </motion.button>
      <span className={`min-w-[8.5rem] text-center text-footnote font-semibold ${estilo.mes}`} aria-live="polite">
        {MESES[mes - 1]} <span className={`tabular font-normal ${estilo.anio}`}>{anio}</span>
      </span>
      <motion.button type="button" onClick={() => onCambiar(1)} aria-label="Mes siguiente"
        whileTap={pulsar} transition={springSnappy} className={clases}>
        <ChevronRight size={17} strokeWidth={2.2} />
      </motion.button>
    </div>
  );
};

export default SelectorDeMes;
