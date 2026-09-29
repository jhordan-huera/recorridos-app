import { useId } from 'react';

/**
 * Paisaje de Bitácora: cielo, sol, montañas y lago en los azules de la app.
 *
 * Es un SVG y no una foto a propósito: pesa unos pocos KB, se ve nítido en
 * cualquier pantalla, queda guardado con la app para abrirla sin conexión y
 * usa los colores del sistema (acento, índigo y verde azulado) en lugar de los
 * de una imagen ajena. Los colores son fijos: es una ilustración, se ve igual
 * en claro y en oscuro.
 *
 * Cubre su contenedor como un `background-size: cover`. El texto que vaya
 * encima necesita su propio degradado para leerse bien.
 *
 * `encuadre="franja"` es para huecos muy anchos y bajos (la portada del
 * Resumen en escritorio): recorta el lago y se queda con el cielo, el sol y
 * las montañas. Sin él, la orilla del lago asomaba como una raya al pie.
 */
const ENCUADRES = {
  completo: '0 0 1600 1000',
  franja: '0 120 1600 600',
};

// Estrellas fijas (no aleatorias: el dibujo tiene que salir igual siempre).
const ESTRELLAS = [
  [90, 70, 1.6], [210, 150, 1.1], [330, 60, 1.4], [470, 130, 1], [610, 50, 1.5],
  [760, 110, 1.1], [880, 40, 1.3], [1130, 70, 1.2], [1260, 150, 1], [1390, 60, 1.6],
  [1510, 120, 1.1], [150, 260, 1], [560, 230, 1.2], [1330, 260, 1], [1560, 230, 1.3],
];

const Paisaje = ({ className = '', encuadre = 'completo' }) => {
  // Ids únicos por dibujo: dos paisajes en la misma página compartirían los
  // degradados, y al desmontarse uno el otro se quedaría sin colores.
  const base = `pb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const id = (nombre) => `${base}-${nombre}`;
  const url = (nombre) => `url(#${id(nombre)})`;

  return (
    <svg
      viewBox={ENCUADRES[encuadre] || ENCUADRES.completo}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={id('cielo')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020b22" />
          <stop offset="0.42" stopColor="#0a2c74" />
          <stop offset="0.72" stopColor="#1d5fd6" />
          <stop offset="1" stopColor="#7db3ff" />
        </linearGradient>
        <radialGradient id={id('halo')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#bfdcff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#bfdcff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('sol')} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#dcebff" />
          <stop offset="1" stopColor="#8fbcff" />
        </radialGradient>
        <linearGradient id={id('fondo')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d6be6" />
          <stop offset="1" stopColor="#3a39b0" />
        </linearGradient>
        <linearGradient id={id('medio')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a6fe8" />
          <stop offset="1" stopColor="#0b2f80" />
        </linearGradient>
        <linearGradient id={id('frente')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c2f78" />
          <stop offset="1" stopColor="#030f2e" />
        </linearGradient>
        <linearGradient id={id('lago')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a56c4" />
          <stop offset="0.35" stopColor="#0b2f80" />
          <stop offset="1" stopColor="#020b22" />
        </linearGradient>
        <linearGradient id={id('orilla')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#40c8e0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#40c8e0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cielo, estrellas y dos estelas de luz */}
      <rect width="1600" height="1000" fill={url('cielo')} />
      {ESTRELLAS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.55" />
      ))}
      <path d="M300 210 L540 110" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
      <path d="M1180 170 L1330 105" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />

      {/* La ruta punteada: los recorridos del día */}
      <path
        d="M180 380 C 420 250, 640 330, 860 230 S 1260 150, 1480 70"
        fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="3"
        strokeDasharray="4 16" strokeLinecap="round"
      />
      <circle cx="1480" cy="70" r="7" fill="#ffffff" opacity="0.6" />

      {/* Sol con su halo, detrás de las montañas */}
      <circle cx="1030" cy="560" r="420" fill={url('halo')} />
      <circle cx="1030" cy="560" r="215" fill={url('sol')} />

      {/* Tres capas de montañas, de la más lejana a la más cercana */}
      <path
        d="M0 640 C 120 560, 200 520, 300 560 S 480 470, 600 520 S 820 600, 940 560 S 1140 480, 1260 540 S 1480 500, 1600 520 L1600 720 L0 720 Z"
        fill={url('fondo')} opacity="0.9"
      />
      <path
        d="M0 560 C 80 520, 160 420, 260 380 C 340 350, 400 430, 470 470 C 540 510, 600 470, 660 500 C 760 550, 860 640, 980 660 C 1100 680, 1200 620, 1300 600 C 1420 575, 1520 610, 1600 590 L1600 720 L0 720 Z"
        fill={url('medio')}
      />

      {/* Lago con el reflejo de las montañas y del sol */}
      <rect y="720" width="1600" height="280" fill={url('lago')} />
      <rect y="720" width="1600" height="70" fill={url('orilla')} />
      <g transform="translate(0 1440) scale(1 -1)" opacity="0.22">
        <path
          d="M0 560 C 80 520, 160 420, 260 380 C 340 350, 400 430, 470 470 C 540 510, 600 470, 660 500 C 760 550, 860 640, 980 660 C 1100 680, 1200 620, 1300 600 C 1420 575, 1520 610, 1600 590 L1600 720 L0 720 Z"
          fill="#0a2c74"
        />
      </g>
      {[
        [746, 250, 0.42], [770, 190, 0.32], [796, 140, 0.24], [826, 96, 0.18], [860, 60, 0.12],
      ].map(([y, ancho, opacidad]) => (
        <rect
          key={y} x={1030 - ancho / 2} y={y} width={ancho} height="6" rx="3"
          fill="#dcebff" opacity={opacidad}
        />
      ))}

      <path
        d="M0 420 C 90 400, 170 470, 250 520 C 330 570, 420 600, 520 650 C 600 690, 680 710, 760 720 L0 720 Z"
        fill={url('frente')}
      />
      <path
        d="M1600 600 C 1520 620, 1440 660, 1360 690 C 1300 710, 1240 720, 1200 720 L1600 720 Z"
        fill={url('frente')}
      />
    </svg>
  );
};

export default Paisaje;
