import React from 'react';
import Card from './Card';

/**
 * Cifra destacada.
 *
 * El valor es lo más grande y lo más pesado porque es lo que se viene a
 * mirar; la etiqueta lo acompaña sin competir. A veces añadir contexto
 * simplifica: el pie explica de qué periodo habla la cifra.
 */
const StatCard = ({ label, value, icon: Icon, tone = 'accent', footnote = null, className = '' }) => {
  const tones = {
    accent: 'bg-accent/12 text-accent',
    positive: 'bg-positive/14 text-positive',
    critical: 'bg-critical/14 text-critical',
    caution: 'bg-caution/16 text-caution',
    brand: 'bg-brand/14 text-brand',
    info: 'bg-info/14 text-info',
    neutral: 'bg-fill/12 text-label-secondary',
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-footnote font-medium text-label-secondary">{label}</p>
          <p className="tabular mt-1.5 text-title1 font-semibold text-label">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-field ${tones[tone] || tones.accent}`}>
            <Icon size={18} strokeWidth={2.1} />
          </span>
        )}
      </div>
      {footnote && <p className="mt-3 text-footnote text-label-tertiary">{footnote}</p>}
    </Card>
  );
};

export default StatCard;
