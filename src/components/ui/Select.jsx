import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Desplegable.
 *
 * Sobre un `<select>` nativo a propósito: en móvil abre el selector del
 * sistema, que es el que la gente ya sabe usar, y hereda accesibilidad y
 * navegación por teclado sin reimplementarlas. Solo se reviste la caja.
 */
const Select = React.forwardRef(({
  label,
  error,
  hint,
  children,
  className = '',
  containerClassName = '',
  id,
  required,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={`flex w-full flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="px-0.5 text-footnote font-medium text-label-secondary">
          {label}
          {required && <span className="ml-0.5 text-critical" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`
            h-11 w-full appearance-none rounded-control border bg-surface pl-3 pr-9
            text-body text-label outline-none
            transition-[border-color,box-shadow] duration-[var(--t-fast)]
            disabled:cursor-not-allowed disabled:opacity-40
            ${error
              ? 'border-critical focus:border-critical'
              : 'border-separator/70 focus:border-accent focus:shadow-focus'}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          size={16}
          strokeWidth={2.2}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label-tertiary"
        />
      </div>

      {error ? (
        <p id={`${selectId}-error`} role="alert" className="px-0.5 text-footnote font-medium text-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="px-0.5 text-footnote text-label-tertiary">{hint}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
