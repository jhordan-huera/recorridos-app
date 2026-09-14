import React from 'react';

/**
 * Estado vacío.
 *
 * Nunca deja a nadie atrapado: dice qué no hay y cuál es el siguiente paso.
 */
const EmptyState = ({ icon: Icon, title, message, action = null, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center rounded-card border border-dashed
                border-separator/70 bg-surface/50 px-6 py-16 text-center ${className}`}
  >
    {Icon && (
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fill/10 text-label-tertiary">
        <Icon size={26} strokeWidth={1.8} />
      </span>
    )}
    <h3 className="text-headline font-semibold text-label">{title}</h3>
    {message && <p className="mt-1.5 max-w-sm text-subhead text-label-secondary">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
