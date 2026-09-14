/**
 * Estado global de "hay trabajo en curso".
 *
 * Vive fuera de React —es un almacén con suscripción— para que cualquier
 * capa pueda avisar, incluidos los interceptores de axios, sin arrastrar un
 * provider hasta ahí.
 *
 * Dos detalles de oficio que evitan que la barra moleste más de lo que ayuda:
 *
 * - **No aparece si la respuesta es rápida.** Por debajo de `RETARDO` no se
 *   muestra nada: un parpadeo de 80 ms se lee como un fallo de pintado, no
 *   como información.
 * - **Nunca promete un porcentaje que no conoce.** Avanza deprisa al
 *   principio y se va frenando hacia el 90%, donde espera. El salto al 100%
 *   solo ocurre cuando el trabajo termina de verdad.
 */

const RETARDO = 180;      // ms antes de mostrarla
const TECHO = 0.9;        // hasta dónde avanza mientras no sabemos nada
const PASO = 220;         // cada cuánto avanza
const CIERRE = 260;       // ms visible tras completarse, para que se vea llegar

let activas = 0;
let valor = 0;
let visible = false;
let temporizadorInicio = null;
let temporizadorAvance = null;
let temporizadorCierre = null;

const oyentes = new Set();
// `useSyncExternalStore` compara por identidad: hay que devolver el mismo
// objeto mientras nada cambie, o React entra en un bucle de renders.
let instantanea = { visible: false, valor: 0 };

const publicar = () => {
  instantanea = { visible, valor };
  oyentes.forEach((oyente) => oyente());
};

const avanzar = () => {
  // Cuanto más cerca del techo, más pequeño el paso: nunca lo alcanza.
  const restante = TECHO - valor;
  if (restante <= 0.001) return;
  valor += Math.max(restante * 0.12, 0.004);
  publicar();
};

const detenerTemporizadores = () => {
  clearTimeout(temporizadorInicio);
  clearInterval(temporizadorAvance);
  clearTimeout(temporizadorCierre);
  temporizadorInicio = null;
  temporizadorAvance = null;
  temporizadorCierre = null;
};

/** Declara que empieza una tarea. Siempre debe emparejarse con `terminar()`. */
export function empezar() {
  activas += 1;
  if (activas > 1) return;

  clearTimeout(temporizadorCierre);
  temporizadorCierre = null;

  temporizadorInicio = setTimeout(() => {
    visible = true;
    valor = 0.06;
    publicar();
    temporizadorAvance = setInterval(avanzar, PASO);
  }, RETARDO);
}

/** Declara que una tarea terminó, haya ido bien o mal. */
export function terminar() {
  activas = Math.max(0, activas - 1);
  if (activas > 0) return;

  clearTimeout(temporizadorInicio);
  clearInterval(temporizadorAvance);
  temporizadorInicio = null;
  temporizadorAvance = null;

  // Nunca llegó a mostrarse: no hay nada que cerrar.
  if (!visible) {
    valor = 0;
    publicar();
    return;
  }

  valor = 1;
  publicar();
  temporizadorCierre = setTimeout(() => {
    visible = false;
    valor = 0;
    publicar();
  }, CIERRE);
}

/** Envuelve una promesa para que la barra la siga sin tener que emparejar a mano. */
export async function conProgreso(promesa) {
  empezar();
  try {
    return await promesa;
  } finally {
    terminar();
  }
}

export function suscribir(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function leer() {
  return instantanea;
}

/** Solo para pruebas: deja el almacén como recién cargado. */
export function reiniciar() {
  detenerTemporizadores();
  activas = 0;
  valor = 0;
  visible = false;
  publicar();
}
