import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Mantiene el foco dentro de una capa modal y lo devuelve a su origen al
 * cerrarla. Nadie debe quedar atrapado: la capa siempre tiene salida (Escape
 * y el botón de cerrar), y al salir el foco vuelve exactamente donde estaba.
 */
export function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    // Enfoca el primer control real; si no hay, el propio contenedor.
    const initial = container.querySelector(FOCUSABLE);
    (initial || container).focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const items = Array.from(container.querySelectorAll(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}
