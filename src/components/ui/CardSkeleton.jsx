import React from 'react';
import Card from './Card';
import Skeleton from './Skeleton';

/**
 * Marcador de carga para una tarjeta de listado.
 *
 * Reproduce la estructura real —avatar, etiqueta de estado, título, líneas de
 * detalle y pie de acciones— para que la espera se lea como contenido en
 * camino y para que al llegar los datos no haya salto de layout: el hueco ya
 * mide lo que va a ocupar.
 */
const CardSkeleton = ({ lineas = 2 }) => (
  <Card padding="p-0" className="overflow-hidden">
    <div className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Skeleton variant="bare" className="h-11 w-11 rounded-field" />
        <Skeleton variant="bare" className="h-5 w-16 rounded-full" />
      </div>

      <Skeleton variant="bare" className="h-4 w-2/3" />

      <div className="mt-3 space-y-2">
        {Array.from({ length: lineas }).map((_, i) => (
          <Skeleton key={i} variant="bare" className={`h-3 ${i % 2 ? 'w-4/5' : 'w-3/5'}`} />
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2 border-t border-separator/60 bg-surface-secondary px-4 py-3">
      <Skeleton variant="bare" className="h-8 flex-1 rounded-field" />
      <Skeleton variant="bare" className="h-8 w-9 rounded-field" />
    </div>
  </Card>
);

export default CardSkeleton;
