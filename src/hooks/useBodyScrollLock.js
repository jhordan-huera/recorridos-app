import { useEffect } from 'react';

/**
 * Congela el scroll del documento mientras hay una capa modal encima, sin
 * perder la posición ni provocar el salto de layout al ocultar la barra de
 * scroll. Cuenta las capas activas para que cerrar un modal apilado sobre
 * otro no libere el scroll antes de tiempo.
 */
let lockCount = 0;
let restore = null;

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    if (lockCount === 0) {
      const { body } = document;
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      restore = () => {
        body.style.position = '';
        body.style.top = '';
        body.style.width = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
        window.scrollTo(0, scrollY);
      };

      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
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
