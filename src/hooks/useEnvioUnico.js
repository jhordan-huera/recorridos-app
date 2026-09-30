import { useCallback, useRef } from 'react';

/**
 * Envuelve el manejador de un formulario para que no corra dos veces a la
 * vez: mientras un envío está en marcha, los siguientes se ignoran.
 *
 * Desactivar el botón no bastaba. El botón se desactiva cuando React vuelve
 * a pintar, y dos pulsaciones que llegan antes de eso (un doble toque muy
 * rápido, un dispositivo lento) enviaban el formulario dos veces y dejaban
 * el registro duplicado. Esta marca cambia en el acto, sin esperar a nadie.
 *
 * Si recibe un evento, lo anula siempre, también en los envíos ignorados:
 * si no, el navegador haría su envío por defecto y recargaría la página.
 */
export const useEnvioUnico = (manejador) => {
  const enCurso = useRef(false);
  const actual = useRef(manejador);
  actual.current = manejador;

  return useCallback(async (...argumentos) => {
    argumentos[0]?.preventDefault?.();
    if (enCurso.current) return undefined;
    enCurso.current = true;
    try {
      return await actual.current(...argumentos);
    } finally {
      enCurso.current = false;
    }
  }, []);
};
