import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css';

// CONFIGURACIÓN SENTRY - Versión actualizada
Sentry.init({
  dsn: "https://608dfb89ee52ac528ae19442fe6d5d24@o4510494262165504.ingest.us.sentry.io/4510494301487104",
  
  // Integraciones disponibles directamente desde @sentry/react
  integrations: [
    Sentry.browserTracingIntegration(), // ← Nueva forma
    Sentry.replayIntegration(), // ← Si quieres session replay
  ],
  
  // Configuración de Performance
  tracesSampleRate: 1.0,
  
  // Configuración de Session Replay (opcional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  environment: import.meta.env.MODE || 'development',
  sendDefaultPii: true,
  
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