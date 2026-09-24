import { useSyncExternalStore } from 'react';

/**
 * ¿Hay conexión con el servidor?
 *
 * `navigator.onLine` solo dice si el teléfono tiene red, no si llega a
 * internet: con un Wi-Fi sin salida o con una barra de señal dice que sí. Por
 * eso manda lo que pasa con las peticiones de verdad: una que no obtiene
 * respuesta marca "sin conexión", y cualquier respuesta del servidor, aunque
 * sea un error, marca "con conexión". El evento `offline` del navegador sí es
 * fiable en un sentido y se aprovecha para enterarse antes.
 *
 * `copiaDe` es la hora de la copia más antigua que se está enseñando en lugar
 * de datos frescos, para poder decir "mostrando lo guardado el…".
 * `reconexiones` sube cada vez que se recupera la conexión: las pantallas lo
 * usan para volver a pedir sus datos y cambiar la copia por lo actual.
 */

/**
 * true si una petición a la API no llegó a tener respuesta: sin red o sin
 * tiempo. Solo errores de axios: un fallo cualquiera del código (armando un
 * PDF, por ejemplo) tampoco trae `response` y no es un problema de conexión.
 * Una petición cancelada a propósito tampoco lo es.
 */
export const esFalloDeRed = (error) => Boolean(error?.isAxiosError)
  && !error.response
  && error.code !== 'ERR_CANCELED';

let estado = {
  enLinea: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  copiaDe: null,
  reconexiones: 0,
};
const oyentes = new Set();

const cambiar = (cambios) => {
  const nuevo = { ...estado, ...cambios };
  if (nuevo.enLinea === estado.enLinea && nuevo.copiaDe === estado.copiaDe
    && nuevo.reconexiones === estado.reconexiones) return;
  estado = nuevo;
  oyentes.forEach((fn) => fn());
};

export const marcarEnLinea = () => {
  if (estado.enLinea && estado.copiaDe === null) return;
  cambiar({
    enLinea: true,
    copiaDe: null,
    reconexiones: estado.enLinea ? estado.reconexiones : estado.reconexiones + 1,
  });
};

export const marcarSinConexion = () => cambiar({ enLinea: false });

/** Se está enseñando una copia guardada a esta hora (ms). */
export const anotarCopia = (guardadoEn) => {
  const antes = estado.copiaDe;
  cambiar({
    enLinea: false,
    copiaDe: antes === null ? guardadoEn : Math.min(antes, guardadoEn),
  });
};

export const estaEnLinea = () => estado.enLinea;

if (typeof window !== 'undefined') {
  window.addEventListener('offline', marcarSinConexion);
  // Que vuelva la red no garantiza que llegue al servidor. Se da por buena y
  // las pantallas vuelven a pedir sus datos: si no llega, esas mismas
  // peticiones lo marcarán otra vez como sin conexión.
  window.addEventListener('online', marcarEnLinea);
}

const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
const leerEstado = () => estado;

/** { enLinea, copiaDe, reconexiones } */
export const useConexion = () => useSyncExternalStore(suscribir, leerEstado, leerEstado);
