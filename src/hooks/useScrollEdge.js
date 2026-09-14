import { useEffect, useRef, useState } from 'react';

/**
 * Marca cuándo el contenido ha pasado por debajo del chrome flotante.
 *
 * Sirve para el efecto de borde de scroll: en vez de un divisor de 1px fijo
 * bajo una cabecera pegajosa, se funde un degradado suave solo cuando la UI
 * flotante realmente solapa contenido.
 *
 * @param {number} threshold px de scroll a partir de los cuales se considera solapado
 * @returns {{ ref: React.RefObject, scrolled: boolean }} `ref` opcional para un
 *   contenedor con scroll propio; si no se usa, escucha el scroll de la ventana.
 */
export function useScrollEdge(threshold = 4) {
  const ref = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const target = ref.current;
    const read = () => {
      const offset = target ? target.scrollTop : window.scrollY;
      setScrolled(offset > threshold);
    };

    const source = target || window;
    read();
    source.addEventListener('scroll', read, { passive: true });
    return () => source.removeEventListener('scroll', read);
  }, [threshold]);

  return { ref, scrolled };
}
