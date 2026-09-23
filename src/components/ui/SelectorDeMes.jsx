import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { springSnappy } from '../../lib/motion';
import { MESES } from '../../lib/fechas';

/** Píldora con el mes a la vista y flechas para moverse de uno en uno. */
const SelectorDeMes = ({ mes, anio, onCambiar }) => {
  const reduceMotion = useReducedMotion();
  const pulsar = reduceMotion ? { opacity: 0.6 } : { scale: 0.9 };
  const clases = 'tappable rounded-full p-1.5 text-label-secondary transition-colors hover:bg-fill/12 hover:text-label';

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-separator/70 bg-surface p-0.5">
      <motion.button type="button" onClick={() => onCambiar(-1)} aria-label="Mes anterior"
        whileTap={pulsar} transition={springSnappy} className={clases}>
        <ChevronLeft size={17} strokeWidth={2.2} />
      </motion.button>
      <span className="min-w-[8.5rem] text-center text-footnote font-semibold text-label" aria-live="polite">
        {MESES[mes - 1]} <span className="tabular font-normal text-label-tertiary">{anio}</span>
      </span>
      <motion.button type="button" onClick={() => onCambiar(1)} aria-label="Mes siguiente"
        whileTap={pulsar} transition={springSnappy} className={clases}>
        <ChevronRight size={17} strokeWidth={2.2} />
      </motion.button>
    </div>
  );
};

export default SelectorDeMes;
