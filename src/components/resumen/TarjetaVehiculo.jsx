import React from 'react';
import { Car } from 'lucide-react';
import Card from '../ui/Card';

/**
 * Un vehículo y lo que dio de sí en el mes.
 *
 * El estado va en versalitas junto al nombre, con un punto de color y el texto
 * dicho: el punto solo no bastaría para quien no distinga los colores.
 */
const TarjetaVehiculo = ({ nombre, estado, estadoActivo, subtitulo, accion }) => (
  <Card className="flex items-center gap-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fill/10 text-label">
      <Car size={20} strokeWidth={1.9} />
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <p className="truncate text-headline font-semibold text-label">{nombre}</p>
        <span
          className={`flex items-center gap-1.5 text-caption2 font-semibold uppercase tracking-wide ${
            estadoActivo ? 'text-positive' : 'text-label-tertiary'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${estadoActivo ? 'bg-positive' : 'bg-label-tertiary'}`}
          />
          {estado}
        </span>
      </div>
      <p className="tabular truncate text-footnote text-label-secondary">{subtitulo}</p>
    </div>

    {accion}
  </Card>
);

export default TarjetaVehiculo;
