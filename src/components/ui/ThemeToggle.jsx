import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { springSnappy, haptics } from '../../lib/motion';

const options = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

/**
 * Control segmentado de tema.
 *
 * Tres opciones en vez de un interruptor: seguir al sistema es una elección
 * legítima, no la ausencia de una. El indicador se desplaza con un spring
 * compartido, de forma que la selección se mueve en lugar de parpadear entre
 * posiciones.
 */
const ThemeToggle = ({ className = '' }) => {
  const { theme, setTheme } = useApp();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Apariencia"
      className={`inline-flex items-center gap-0.5 rounded-control bg-fill/10 p-0.5 ${className}`}
    >
      {options.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => { haptics.tick(); setTheme(value); }}
            className="tappable relative flex h-8 w-9 items-center justify-center rounded-[0.625rem]
                       text-label-secondary transition-colors hover:text-label"
          >
            {selected && (
              <motion.span
                layoutId="theme-indicator"
                transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                className="absolute inset-0 rounded-[0.625rem] bg-surface shadow-level-1"
              />
            )}
            <Icon
              size={16}
              strokeWidth={2.1}
              className={`relative z-10 transition-colors ${selected ? 'text-label' : ''}`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
