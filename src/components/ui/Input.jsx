import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { crossFade, springSnappy } from '../../lib/motion';

/**
 * Campo de texto.
 *
 * La validación se muestra EN LÍNEA y en cuanto hay algo que decir, no al
 * enviar el formulario: avisar antes del problema evita que alguien complete
 * diez campos para descubrir al final que el segundo estaba mal.
 *
 * El mensaje de error aparece con un fundido corto, no con un desplazamiento:
 * un error que empuja el layout hacia abajo mueve justo lo que la persona
 * estaba mirando.
 */
const Input = React.forwardRef(({
  label,
  error,
  hint,
  icon: Icon = null,
  trailing = null,
  className = '',
  containerClassName = '',
  id,
  required,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="px-0.5 text-footnote font-medium text-label-secondary">
          {label}
          {required && <span className="ml-0.5 text-critical" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span
            className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors duration-[var(--t-fast)] ${
              focused ? 'text-accent' : 'text-label-tertiary'
            }`}
          >
            {/* Acepta tanto un componente (icon={Mail}) como un elemento ya creado. */}
            {React.isValidElement(Icon) ? Icon : <Icon size={17} strokeWidth={1.9} />}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          className={`
            h-11 w-full rounded-control border bg-surface px-3 text-body text-label
            outline-none transition-[border-color,box-shadow,background-color] duration-[var(--t-fast)]
            placeholder:text-label-quaternary
            disabled:cursor-not-allowed disabled:opacity-40
            ${Icon ? 'pl-10' : ''}
            ${trailing ? 'pr-11' : ''}
            ${error
              ? 'border-critical focus:border-critical focus:shadow-[0_0_0_4px_rgb(var(--c-red)/0.18)]'
              : 'border-separator/70 focus:border-accent focus:shadow-focus'}
            ${className}
          `}
          {...props}
        />

        {trailing && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</span>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${inputId}-error`}
            role="alert"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
            transition={reduceMotion ? crossFade : springSnappy}
            className="px-0.5 text-footnote font-medium text-critical"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${inputId}-hint`} className="px-0.5 text-footnote text-label-tertiary">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
