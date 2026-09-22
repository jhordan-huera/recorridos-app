import React from 'react';

/**
 * Interruptor de encendido/apagado.
 *
 * Por dentro es un checkbox de verdad, solo que oculto: así el teclado, los
 * lectores de pantalla y el `label` funcionan sin tener que reimplementarlos.
 * La pista de color es únicamente el adorno visual encima.
 *
 * El texto de la izquierda dice qué se activa; el estado nunca depende solo
 * del color, porque quien no lo distinga se quedaría sin saber si está puesto.
 */
const Switch = ({ checked, onChange, label, description, icon: Icon, disabled = false }) => (
  <label
    className={`flex items-start gap-3 rounded-control border p-3.5 transition-colors ${
      disabled
        ? 'cursor-not-allowed border-separator/40 bg-fill/5 opacity-60'
        : 'cursor-pointer border-separator/50 bg-surface-secondary hover:border-separator'
    }`}
  >
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />

    {Icon && (
      <span className={`mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-field ${
        checked ? 'bg-accent/12 text-accent' : 'bg-fill/12 text-label-tertiary'
      }`}>
        <Icon size={16} strokeWidth={2} />
      </span>
    )}

    <span className="min-w-0 flex-1">
      <span className="block text-subhead font-medium text-label">{label}</span>
      {description && (
        <span className="mt-0.5 block text-footnote text-label-secondary">{description}</span>
      )}
    </span>

    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        checked ? 'bg-accent' : 'bg-fill/25'
      } peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-level-1 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </span>
  </label>
);

export default Switch;
