import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { springSnappy } from '../../lib/motion';

const variants = {
  // Superficie sólida: el sitio donde vive el contenido.
  base: 'bg-surface border-separator/60 shadow-level-1',
  // Más elevación para lo que flota sobre el resto.
  raised: 'bg-surface border-separator/50 shadow-level-2',
  // Agrupación silenciosa dentro de otra superficie.
  subtle: 'bg-surface-secondary border-separator/40',
  // Capa translúcida. Nunca apilar una sobre otra: la legibilidad se cae.
  material: 'material-regular border-separator/40 shadow-level-2',
};

/**
 * Contenedor de contenido.
 *
 * `interactive` convierte la tarjeta en algo pulsable: se hunde en
 * `pointerdown` igual que un botón, en lugar de reaccionar solo al soltar.
 */
const Card = ({
  children,
  className = '',
  padding = 'p-5',
  variant = 'base',
  interactive = false,
  as = 'div',
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const base = 'rounded-card border transition-colors duration-[var(--t-base)]';
  const classes = `${base} ${variants[variant] || variants.base} ${padding} ${className}`;

  if (!interactive) {
    const Tag = as;
    return <Tag className={classes} {...props}>{children}</Tag>;
  }

  const Motion = motion[as] || motion.div;
  return (
    <Motion
      className={`${classes} tappable cursor-pointer hover:shadow-level-2`}
      whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.985 }}
      transition={springSnappy}
      {...props}
    >
      {children}
    </Motion>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-5 pt-4 border-t border-separator/50 ${className}`}>{children}</div>
);

export default Card;
