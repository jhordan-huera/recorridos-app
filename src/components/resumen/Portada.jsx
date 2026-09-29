import React from 'react';
import { Link } from 'react-router-dom';
import { NotebookPen, CalendarDays } from 'lucide-react';
import Paisaje from '../ilustracion/Paisaje';
import SelectorDeMes from '../ui/SelectorDeMes';

const fechaDeHoy = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
/** "Martes, 29 de septiembre": mayúscula solo al principio, no en cada palabra. */
const hoy = () => {
  const texto = fechaDeHoy.format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * Portada del Resumen: el paisaje de Bitácora con el saludo, cómo va el mes
 * y el selector de mes, que gobierna toda la pantalla.
 *
 * En el móvil ocupa todo el ancho, pegada arriba, como la cabecera de una
 * app. Deja espacio abajo (`pb-20`) para que la tarjeta de registro rápido
 * se monte encima del borde.
 */
const Portada = ({ nombre, inicial, resumen, detalle, mes, anio, onCambiarMes }) => (
  <section className="relative -mx-4 -mt-4 md:mx-0 md:mt-0" aria-labelledby="saludo">
    <div className="relative overflow-hidden md:rounded-panel">
      <Paisaje className="absolute inset-0 h-full w-full md:hidden" />
      <Paisaje encuadre="franja" className="absolute inset-0 hidden h-full w-full md:block" />
      {/* El texto va a la izquierda y arriba: se oscurece esa zona para que
          se lea, y se deja el sol y las montañas a la vista a la derecha. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#020b22]/70 via-[#020b22]/30 to-[#020b22]/10 md:bg-gradient-to-r md:from-[#020b22]/80 md:via-[#020b22]/35 md:to-transparent"
      />

      <div className="relative px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 md:px-10 md:pb-24 md:pt-8">
        {/* Arriba: en el móvil, la marca y el perfil (no hay cabecera); en
            escritorio la cabecera ya los tiene, y aquí va la fecha. */}
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-white/15 ring-1 ring-white/25 backdrop-blur-thin">
              <NotebookPen size={17} strokeWidth={2.2} />
            </span>
            <span className="text-headline font-semibold">Bitácora</span>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-footnote text-white/85 ring-1 ring-white/20 backdrop-blur-thin md:flex">
            <CalendarDays size={14} strokeWidth={2} aria-hidden="true" />
            {hoy()}
          </span>
          <Link
            to="/perfil"
            aria-label="Mi perfil"
            className="tappable flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-subhead font-semibold ring-1 ring-white/25 backdrop-blur-thin md:hidden"
          >
            {inicial}
          </Link>
        </div>

        <h1 id="saludo" className="mt-6 text-[2.5rem] font-bold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl md:mt-7">
          Hola,<br />
          <span className="text-[#8fc0ff]">{nombre}</span>
        </h1>
        <p className="mt-3 max-w-md text-subhead text-white/85 sm:text-body">
          {resumen}
          {detalle && <span className="block text-white/65">{detalle}</span>}
        </p>

        <div className="mt-5">
          <SelectorDeMes mes={mes} anio={anio} onCambiar={onCambiarMes} variante="cristal" />
        </div>
      </div>
    </div>
  </section>
);

export default Portada;
