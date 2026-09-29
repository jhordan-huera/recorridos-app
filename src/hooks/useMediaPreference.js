import { useEffect, useState } from 'react';

/**
 * Suscribe a una media query. Devuelve `false` en el primer render del
 * servidor y se sincroniza en cuanto hay `window`.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Transparencia reducida. Los materiales translúcidos se vuelven sólidos:
 * sube la opacidad del fondo y se quita el desenfoque.
 */
export function useReducedTransparency() {
  return useMediaQuery('(prefers-reduced-transparency: reduce)');
}

/** Más contraste: fondos casi sólidos con borde definido. */
export function useHighContrast() {
  return useMediaQuery('(prefers-contrast: more)');
}

/**
 * Pantalla de móvil: por debajo de 768 px, donde no hay cabecera y la app
 * cambia a su presentación de móvil. Tableta y escritorio quedan fuera.
 */
export const CONSULTA_MOVIL = '(max-width: 767.98px)';
export function useEsMovil() {
  return useMediaQuery(CONSULTA_MOVIL);
}

/** El puntero es grueso (dedo) en lugar de fino (ratón). */
export function useCoarsePointer() {
  return useMediaQuery('(pointer: coarse)');
}
