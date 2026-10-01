import { useEffect } from 'react';

/**
 * Congela el scroll del documento mientras hay una capa modal encima, sin
 * perder la posición ni provocar el salto de layout al ocultar la barra de
 * scroll. Cuenta las capas activas para que cerrar un modal apilado sobre
 * otro no libere el scroll antes de tiempo.
 *
 * Se bloquea con overflow: hidden y la página se queda donde estaba. Antes se
 * fijaba <body> con un `top` negativo, y eso movía el scroll del documento de
 * golpe a 0 al abrir la capa. En iOS, Safari seguía pintando la capa con la
 * posición anterior y su contenido con scroll salía vacío: editar un
 * recorrido con la lista desplazada enseñaba solo la cabecera y el pie.
 */
let lockCount = 0;
let restore = null;

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    if (lockCount === 0) {
      const html = document.documentElement;
      const { body } = document;
      const scrollbarWidth = window.innerWidth - html.clientWidth;

      restore = () => {
        html.style.overflow = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
      };

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }

    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0 && restore) {
        restore();
        restore = null;
      }
    };
  }, [active]);
}
