import React from 'react';

/**
 * Una frase que resume algo del mes, con una acción opcional a la derecha.
 *
 * Va sobre el gris de fondo y no sobre blanco: es un comentario sobre los
 * datos, no un dato más, y así no compite con las tarjetas.
 */
const Aviso = ({ icono: Icono, children, accion = null }) => (
  <div className="flex items-center gap-3.5 rounded-card bg-fill/8 px-4 py-3.5 sm:px-5">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-label shadow-level-1">
      <Icono size={18} strokeWidth={1.9} />
    </span>
    <p className="min-w-0 flex-1 text-subhead text-label-secondary">{children}</p>
    {accion}
  </div>
);

export default Aviso;
