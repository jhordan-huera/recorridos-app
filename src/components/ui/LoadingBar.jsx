import React, { useSyncExternalStore } from 'react';
import { leer, suscribir } from '../../lib/progress';

/**
 * Barra de progreso global.
 *
 * Una línea fina en el borde superior, por encima de la cabecera translúcida.
 * Comunica *estado en curso*, que es uno de los cuatro tipos de feedback que
 * una interfaz debe dar: mientras algo tarda, la pantalla no puede quedarse
 * muda.
 *
 * Es deliberadamente discreta: no bloquea, no tapa contenido y no compite con
 * la tarea que la persona tenga entre manos. La anchura se anima con
 * `transform`, que va al compositor y no provoca reflow.
 */
const LoadingBar = () => {
  const { visible, valor } = useSyncExternalStore(suscribir, leer, leer);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
    >
      <div
        role="progressbar"
        aria-label="Cargando"
        className="h-full w-full origin-left bg-accent"
        style={{
          transform: `scaleX(${visible ? valor : 0})`,
          opacity: visible ? 1 : 0,
          transition: 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease',
          // Un resplandor en la punta para que se lea el avance incluso
          // cuando el tramo recorrido es corto.
          boxShadow: visible ? '0 0 8px rgb(var(--c-accent) / 0.6)' : 'none',
        }}
      />
    </div>
  );
};

export default LoadingBar;
