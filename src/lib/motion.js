/**
 * Vocabulario de movimiento.
 *
 * Apple sustituyó el trío físico (masa/rigidez/amortiguación) por dos
 * parámetros: **damping** (cuánto sobrepasa el objetivo) y **response**
 * (cuán rápido lo alcanza, en segundos — no es una duración fija, el tiempo
 * de asentamiento emerge de los parámetros).
 *
 * La API de springs de Motion usa `bounce` + `duration`, que mapea casi
 * directamente:  bounce ≈ 1 − damping.
 *
 *   damping 1.0  (crítico, sin rebote)  → bounce 0
 *   damping 0.8  (rebote leve)          → bounce 0.2
 *
 * Regla de la casa: springs críticamente amortiguados por defecto. El rebote
 * se reserva para cuando el propio gesto traía inercia (un flick, un
 * arrastre soltado). Un menú que solo apareció no debe sobrepasar.
 */

/** Reposicionar / mover. El caballo de batalla. */
export const springDefault = { type: 'spring', bounce: 0, duration: 0.4 };

/** Respuesta más corta para controles pequeños y cambios de estado. */
export const springSnappy = { type: 'spring', bounce: 0, duration: 0.3 };

/** Cajones y sheets: el gesto trae inercia, así que un poco de rebote. */
export const springSheet = { type: 'spring', bounce: 0.2, duration: 0.3 };

/** Tras soltar un flick: el objeto se lanza y asienta. */
export const springMomentum = { type: 'spring', bounce: 0.2, duration: 0.4 };

/** Rotaciones. */
export const springRotate = { type: 'spring', bounce: 0.2, duration: 0.4 };

/**
 * Equivalente no vestibular: un fundido corto en lugar del spring.
 * Se conserva el cambio de opacidad porque ayuda a entender qué ocurrió.
 */
export const crossFade = { type: 'tween', duration: 0.2, ease: [0.32, 0.72, 0, 1] };

/** Curvas espejadas para transiciones reversibles: la de salida es la inversa. */
export const easeOutApple = [0.32, 0.72, 0, 1];
export const easeInApple = [1, 0, 0.68, 0.28];

/**
 * Proyección de momentum — la función exacta del código de ejemplo de
 * *Designing Fluid Interfaces*.
 *
 * No se salta al punto de anclaje más cercano al punto de SOLTAR: se proyecta
 * dónde acabaría el dedo con la deceleración del scroll y se elige el destino
 * más cercano a ESE punto. Es lo que hace que un flick se sienta como un
 * lanzamiento.
 *
 * Ojo: la fórmula de libro de texto v²/(2·a) no es la que usa Apple.
 *
 * @param {number} initialVelocity px/s al soltar
 * @param {number} decelerationRate 0.998 ≈ scroll normal, 0.99 más seco
 * @returns {number} desplazamiento adicional proyectado, en px
 */
export function project(initialVelocity, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Del punto proyectado al punto de anclaje más cercano.
 *
 * @param {number} position posición actual
 * @param {number} velocity px/s al soltar
 * @param {number[]} snapPoints anclajes candidatos
 */
export function projectToSnapPoint(position, velocity, snapPoints) {
  const projected = position + project(velocity);
  return snapPoints.reduce((closest, point) =>
    Math.abs(point - projected) < Math.abs(closest - projected) ? point : closest
  );
}

/**
 * Resistencia elástica en los bordes.
 *
 * Un tope duro se lee como "congelado"; una resistencia que crece se lee como
 * "responde, pero aquí no hay más". Cuanto más se pasa del límite, menos
 * sigue el elemento al dedo.
 *
 * @param {number} overshoot cuánto se ha pasado del límite
 * @param {number} dimension tamaño del eje que se arrastra
 * @param {number} constant  0.55 es el valor que usa UIKit
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Convierte una velocidad de gesto en velocidad relativa de spring, para las
 * APIs que la esperan normalizada por la distancia que queda al objetivo.
 * Motion acepta px/s directamente en `velocity`, así que esto solo hace falta
 * al hablar con otros motores.
 */
export function relativeVelocity(gestureVelocity, current, target) {
  const distance = target - current;
  if (distance === 0) return 0;
  return gestureVelocity / distance;
}

/** Umbral de histéresis antes de comprometerse con una dirección de arrastre. */
export const DRAG_THRESHOLD = 10;

/**
 * ¿Descartar o volver al sitio? Se decide por el SIGNO de la velocidad, no
 * por la posición: un flick corto y rápido hacia fuera descarta, aunque el
 * elemento apenas se haya movido.
 *
 * @param {number} offset   desplazamiento acumulado
 * @param {number} velocity px/s al soltar
 * @param {number} distanceThreshold fracción recorrida que basta por sí sola
 */
export function shouldDismiss(offset, velocity, distanceThreshold) {
  if (velocity > 500) return true;                 // flick decidido hacia fuera
  if (velocity < -500) return false;               // flick de vuelta: cancela
  return offset + project(velocity) > distanceThreshold;
}

/**
 * Retroalimentación háptica. Se dispara en el evento causal real (el
 * interruptor girando, el elemento encajando), nunca al final de una
 * animación, para que vibración, sonido e imagen caigan en el mismo frame.
 *
 * Se reserva para momentos con significado — éxito, error, encaje. El exceso
 * de feedback enseña a ignorarlo todo.
 */
export const haptics = {
  /** Encaje o selección. */
  tick() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
  },
  /** Confirmación de una acción con consecuencias. */
  success() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10, 40, 16]);
  },
  /** Algo salió mal. */
  error() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([24, 60, 24]);
  },
};
