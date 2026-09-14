import React from 'react';

const variants = {
  // Sin medidas propias: para componer marcadores con la forma del contenido.
  // Las variantes de abajo traen ancho y alto, y esos utilities ganarían o
  // perderían frente a los que se pasen por `className` según el orden del CSS
  // generado, no según el orden en que se escriban. Con `bare` no hay pelea.
  bare: 'rounded-field',
  rect: 'h-24 w-full rounded-card',
  circle: 'h-12 w-12 rounded-full',
  text: 'h-4 w-3/4 rounded-field',
  title: 'h-7 w-1/2 rounded-field',
  card: 'h-44 w-full rounded-card',
  stat: 'h-28 w-full rounded-card',
};

/**
 * Marcador de contenido en carga.
 *
 * Un barrido lento y de bajo contraste, no un parpadeo: las oscilaciones
 * cercanas a un ciclo cada 5s y los saltos bruscos de brillo molestan. Con
 * movimiento reducido el CSS global lo deja quieto y queda como un bloque
 * plano, que sigue comunicando "aquí viene algo".
 */
const Skeleton = ({ className = '', variant = 'rect', ...props }) => (
  <div
    role="status"
    aria-label="Cargando"
    className={`
      animate-shimmer bg-[length:200%_100%]
      bg-[linear-gradient(90deg,rgb(var(--c-fill)/0.08),rgb(var(--c-fill)/0.16),rgb(var(--c-fill)/0.08))]
      ${variants[variant] || variants.rect} ${className}
    `}
    {...props}
  />
);

export default Skeleton;
