import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { springSnappy } from '../../lib/motion';

/**
 * Variantes de relleno. El color va sobre una capa sólida — nunca sobre el
 * primer plano de una superficie translúcida, donde se lavaría.
 */
const variants = {
  primary:
    'bg-accent text-white border-transparent shadow-level-1 hover:brightness-110',
  // Relleno gris translúcido: se distingue sobre blanco y sobre el fondo de
  // la página sin depender de un borde de 1px que se pierde.
  secondary:
    'bg-fill/12 text-label border-transparent hover:bg-fill/20',
  // Solo para acciones terciarias dentro de una superficie ya delimitada.
  ghost:
    'bg-transparent text-label-secondary border-transparent hover:bg-fill/14 hover:text-label',
  tinted:
    'bg-accent/12 text-accent border-transparent hover:bg-accent/20',
  danger:
    'bg-critical/12 text-critical border-transparent hover:bg-critical/20',
  destructive:
    'bg-critical text-white border-transparent shadow-level-1 hover:brightness-110',
  success:
    'bg-positive/12 text-positive border-transparent hover:bg-positive/20',
  warning:
    'bg-caution/12 text-caution border-transparent hover:bg-caution/20',
  info:
    'bg-info/12 text-info border-transparent hover:bg-info/20',
};

const sizes = {
  sm: 'h-8 px-3 text-footnote gap-1.5 rounded-field',
  md: 'h-10 px-4 text-subhead gap-2 rounded-control',
  lg: 'h-12 px-5 text-body gap-2 rounded-control',
};

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

/**
 * Botón.
 *
 * El feedback vive en la PULSACIÓN, no en el release: `whileTap` de Motion se
 * dispara en `pointerdown`, así que el botón se hunde en el instante en que se
 * toca. Esperar al `click` para mostrar algo se siente muerto.
 *
 * Motion cancela el estado de pulsado si el dedo se aleja del control y lo
 * recupera si vuelve, que es justo el comportamiento de cancelar-arrastrando.
 */
const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,          // alias tolerado: ambos nombres estaban en uso
  loadingText = 'Cargando',
  disabled = false,
  className = '',
  icon = null,
  iconTrailing = null,
  type = 'button',
  ...props
}, ref) => {
  const reduceMotion = useReducedMotion();
  const busy = loading || isLoading;
  const isDisabled = disabled || busy;

  const base =
    'tappable relative inline-flex items-center justify-center border font-medium ' +
    'transition-colors duration-[var(--t-fast)] outline-none ' +
    'disabled:opacity-40 disabled:pointer-events-none select-none';

  // Con movimiento reducido no se escala: el mismo mensaje se da con un
  // cambio de opacidad, que no desplaza nada en pantalla.
  const pressFeedback = reduceMotion ? { opacity: 0.6 } : { scale: 0.96 };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      whileTap={isDisabled ? undefined : pressFeedback}
      transition={springSnappy}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {busy ? (
        <>
          <Spinner />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon}
          {children}
          {iconTrailing}
        </>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
