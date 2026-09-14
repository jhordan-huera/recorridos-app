import React from 'react';

const tones = {
  neutral: 'bg-fill/12 text-label-secondary',
  accent: 'bg-accent/12 text-accent',
  positive: 'bg-positive/14 text-positive',
  critical: 'bg-critical/14 text-critical',
  caution: 'bg-caution/16 text-caution',
  info: 'bg-info/14 text-info',
  brand: 'bg-brand/14 text-brand',
  highlight: 'bg-highlight/14 text-highlight',
};

/**
 * Etiqueta de estado. Texto legible en mayúscula inicial, no versalitas
 * apretadas: una etiqueta hay que poder leerla de un vistazo.
 */
const Badge = ({ children, tone = 'neutral', className = '', ...props }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium ${tones[tone] || tones.neutral} ${className}`}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
