import React from 'react';

/**
 * Cabecera de página.
 *
 * Responde a "¿dónde estoy?" con un título directo y a "¿qué puedo hacer
 * aquí?" con las acciones a la derecha. La jerarquía sale del conjunto
 * tamaño + peso + interlineado, no de apretar el tracking de un texto
 * diminuto en mayúsculas.
 */
const PageHeader = ({ title, subtitle, actions = null, className = '' }) => (
  <div className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div className="min-w-0">
      <h1 className="text-large-title font-semibold text-label">{title}</h1>
      {subtitle && <p className="mt-1 text-subhead text-label-secondary">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
