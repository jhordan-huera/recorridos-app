import { useEffect, useState } from 'react';
import { Route as RouteIcon } from 'lucide-react';

/** A partir de cuánto se avisa de que está tardando. */
const AVISO_MS = 6000;

/**
 * Lo que se ve mientras se comprueba la sesión o se descarga la aplicación.
 *
 * La barra es indeterminada: un tramo que la recorre de lado a lado sin parar.
 * No promete un porcentaje que no conocemos, pero se ve claramente que algo
 * está pasando. La anterior era un tercio fijo con un brillo por dentro, y en
 * el móvil parecía atascada.
 *
 * Si tarda, lo dice. En un arranque en frío del servidor, con mala señal, la
 * espera puede pasar de unos segundos; sin un aviso eso se lee como "se colgó".
 */
const PantallaDeCarga = () => {
  const [tardando, setTardando] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setTardando(true), AVISO_MS);
    return () => clearTimeout(temporizador);
  }, []);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-canvas px-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando la aplicación"
    >
      <div className="carga-entrada flex h-14 w-14 items-center justify-center rounded-panel bg-accent text-white shadow-level-2">
        <RouteIcon size={26} strokeWidth={2.3} />
      </div>

      <div className="carga-entrada carga-entrada-2 flex flex-col items-center gap-3">
        <p className="text-subhead font-medium text-label-secondary">Recorridos</p>
        <span className="relative block h-1 w-32 overflow-hidden rounded-full bg-fill/15">
          <span className="carga-indeterminada absolute inset-y-0 left-0 block w-2/5 rounded-full bg-accent" />
        </span>
        <p
          className={`h-4 text-footnote text-label-tertiary transition-opacity duration-500 ${
            tardando ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Conectando con el servidor…
        </p>
      </div>
    </div>
  );
};

export default PantallaDeCarga;
