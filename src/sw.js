/* global self */
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

/**
 * Service worker de Bitácora: lo que permite abrir la app sin conexión.
 *
 * Guarda en el teléfono la app entera (HTML, JS, CSS e iconos) de cada versión
 * publicada. Los datos NO pasan por aquí: los guarda la propia app
 * (src/lib/almacen.js), que sabe de quién son y cuándo se guardaron.
 */

// Una versión nueva toma el control en cuanto se instala, sin esperar a que
// se cierren todas las pestañas: es lo que hacía registerType 'autoUpdate'.
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/** Cuánto se espera a la red al abrir la app antes de tirar de lo guardado. */
const ESPERA_MAXIMA_MS = 4000;

const conTiempoLimite = (promesa, ms) => new Promise((resolve, reject) => {
  const reloj = setTimeout(() => reject(new Error('sin respuesta a tiempo')), ms);
  promesa.then(
    (valor) => { clearTimeout(reloj); resolve(valor); },
    (error) => { clearTimeout(reloj); reject(error); },
  );
});

/**
 * Abrir la app (cualquier ruta: /, /riegos…) va SIEMPRE primero a la red,
 * para cargar la versión recién publicada. Solo si no hay red, o no contesta
 * en 4 s (una barra de señal), se sirve el index.html guardado.
 *
 * Ese index.html es siempre el de la misma versión que los JS y CSS guardados
 * con él, así que nunca pide archivos que ya no existen. Por eso no se guarda
 * aparte una copia de cada página: una copia de otra versión apuntaría a
 * archivos borrados y la app se abriría en blanco.
 */
registerRoute(new NavigationRoute(async ({ request }) => {
  try {
    return await conTiempoLimite(fetch(request), ESPERA_MAXIMA_MS);
  } catch {
    return (await matchPrecache('index.html')) ?? Response.error();
  }
}));
