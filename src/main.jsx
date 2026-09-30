import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css';

/*
 * Sentry recoge los errores de la app para poder arreglarlos. Solo lo
 * imprescindible: la app maneja nombres de niños, direcciones y teléfonos,
 * y nada de eso tiene por qué salir de ella.
 *  - sendDefaultPii: false  → sin IP ni datos de la cuenta en los informes.
 *  - Grabación de pantalla solo cuando hay un error (nunca de una sesión
 *    normal), con todo el texto, los campos y las imágenes tapados.
 *
 * Tapar el texto no bastaba: los botones llevan el nombre del estudiante en
 * aria-label o title ("Ver la ficha de Ana…"), y la ficha, su teléfono y su
 * dirección en enlaces tel: y de Google Maps. Sentry copia esos atributos al
 * describir un clic (migas de un error, grabación y medición de interacción)
 * y la grabación guarda los href tal cual. Por eso:
 *  - maskAttributes: aria-label y alt también se tapan en la grabación.
 *  - block: los enlaces de contacto salen como un recuadro vacío.
 *  - sinAtributosPrivados: se borran esos valores de todo selector que envíe.
 */
const ATRIBUTOS_PRIVADOS = /\[(aria-label|title|alt)="[\s\S]*?"\](?=\[|\s>\s|\s|$)/g;
const sinAtributosPrivados = (texto) => (
  typeof texto === 'string' ? texto.replace(ATRIBUTOS_PRIVADOS, '[$1]') : texto
);

const ENLACES_DE_CONTACTO = ['a[href^="tel:"]', 'a[href^="mailto:"]', 'a[href^="sms:"]', 'a[href*="google.com/maps"]', 'a[href*="wa.me"]'];

Sentry.init({
  dsn: "https://608dfb89ee52ac528ae19442fe6d5d24@o4510494262165504.ingest.us.sentry.io/4510494301487104",

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      maskAttributes: ['title', 'placeholder', 'aria-label', 'alt'],
      block: ENLACES_DE_CONTACTO,
      // Las migas de clic que van dentro de la grabación no pasan por beforeBreadcrumb.
      beforeAddRecordingEvent: (evento) => {
        const miga = evento?.data?.tag === 'breadcrumb' ? evento.data.payload : null;
        if (miga?.message) miga.message = sinAtributosPrivados(miga.message);
        return evento;
      },
    }),
  ],

  tracesSampleRate: 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  environment: import.meta.env.MODE || 'development',
  sendDefaultPii: false,

  beforeBreadcrumb: (miga) => {
    if (miga?.category?.startsWith('ui.')) miga.message = sinAtributosPrivados(miga.message);
    return miga;
  },
  // La medición de interacción (INP) nombra el span con el selector del botón pulsado.
  beforeSendSpan: (span) => ({ ...span, description: sinAtributosPrivados(span.description) }),

  debug: false,
});

/*
 * Si se publica una versión nueva con la app abierta, las pantallas que aún
 * no se habían cargado ya no existen en el servidor con su nombre anterior y
 * abrirlas fallaba con una pantalla en blanco. Se recarga una vez para tomar
 * la versión nueva. El registro en sessionStorage evita recargar en bucle si
 * el fallo es otro.
 */
window.addEventListener('vite:preloadError', (evento) => {
  const CLAVE = 'recargaPorVersionNueva';
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) || 0);
    if (Date.now() - ultima < 30_000) return;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch { /* sin sessionStorage: se recarga igualmente */ }
  evento.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);