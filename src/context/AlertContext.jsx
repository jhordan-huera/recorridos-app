import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { haptics } from '../lib/motion';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe ser usado dentro de un AlertProvider');
  }
  return context;
};

let nextId = 0;

/**
 * Cola de avisos.
 *
 * Antes había un único aviso y dos temporizadores compitiendo por ocultarlo
 * (uno aquí, otro en el componente), así que dos mensajes seguidos se pisaban.
 * Ahora cada aviso tiene su identidad y su propio temporizador, y se apilan.
 *
 * El feedback se clasifica en estado, finalización, advertencia y error; el
 * háptico solo acompaña a los que traen consecuencia.
 */
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const timers = useRef(new Map());

  const hideAlert = useCallback((id) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showAlert = useCallback((type, message, duration = 4000) => {
    const id = ++nextId;
    setAlerts((current) => [...current.slice(-2), { id, type, message }]);

    if (type === 'error') haptics.error();
    else if (type === 'success') haptics.success();

    const timer = setTimeout(() => {
      setAlerts((current) => current.filter((alert) => alert.id !== id));
      timers.current.delete(id);
    }, duration);
    timers.current.set(id, timer);

    return id;
  }, []);

  const value = useMemo(
    () => ({ alerts, showAlert, hideAlert }),
    [alerts, showAlert, hideAlert]
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};
