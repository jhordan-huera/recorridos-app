import React from 'react';
import { Triangle } from 'lucide-react';
import Card from '../ui/Card';

/**
 * Cifra principal con su tendencia.
 *
 * El número es lo más grande de la tarjeta porque es lo que se viene a mirar.
 * La tendencia va al lado, pequeña, y siempre con texto además del color:
 * "sube" o "baja" no pueden depender de distinguir verde de naranja.
 *
 * `tendencia.bueno` decide el color, no la dirección: más recorridos es
 * bueno, pero más gasto no.
 */
const Kpi = ({ icono: Icono, etiqueta, valor, tendencia = null, className = '' }) => {
  const color = !tendencia || tendencia.direccion === 'igual'
    ? 'text-label-tertiary'
    : tendencia.bueno ? 'text-positive' : 'text-caution';

  return (
    <Card className={`flex items-center gap-4 ${className}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fill/10 text-label">
        <Icono size={20} strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-footnote text-label-secondary">{etiqueta}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="tabular text-large-title font-bold tracking-tight text-label">{valor}</p>

          {tendencia && (
            <div className="leading-tight">
              <p className={`tabular flex items-center gap-1 text-footnote font-semibold ${color}`}>
                {tendencia.direccion !== 'igual' && (
                  <Triangle
                    size={9}
                    fill="currentColor"
                    strokeWidth={0}
                    className={tendencia.direccion === 'baja' ? 'rotate-180' : ''}
                    aria-hidden="true"
                  />
                )}
                {tendencia.texto}
              </p>
              <p className="text-caption text-label-tertiary">{tendencia.contra}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Kpi;
