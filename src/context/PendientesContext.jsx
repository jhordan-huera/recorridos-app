import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { useConexion } from '../lib/conexion';
import {
  suscribir, leerFoto, cargarPendientes, enviarPendientes, registrar as registrarAlta,
  editarPendiente, descartarPendiente, reintentarPendiente,
} from '../lib/pendientes';

const PendientesContext = createContext(null);

/** Cada cuánto se reintenta mientras quede algo por enviar y la app esté abierta. */
const REINTENTO_MS = 30_000;

/**
 * Lo registrado sin conexión, a la vista de toda la app.
 *
 * Decide CUÁNDO enviar (lib/pendientes.js sabe CÓMO): al abrir la app o
 * entrar, al recuperar la conexión, al volver a la app desde otra y cada
 * medio minuto mientras quede algo. Todo con la app abierta: un navegador de
 * iPhone no deja que una web haga nada con la app cerrada.
 *
 * `envios` cuenta lo que ha ido llegando, por tipo. Las pantallas lo ponen en
 * las dependencias de su carga para traer la versión del servidor.
 */
export const PendientesProvider = ({ children }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { reconexiones } = useConexion();
  const foto = useSyncExternalStore(suscribir, leerFoto, leerFoto);
  const [envios, setEnvios] = useState({ riego: 0, recorrido: 0 });
  const userId = user?.id ?? null;

  const enviarAhora = useCallback(async () => {
    if (!userId) return;
    const { enviados, rechazados, porTipo } = await enviarPendientes(userId);

    if (enviados > 0) {
      setEnvios((antes) => ({
        riego: antes.riego + (porTipo.riego || 0),
        recorrido: antes.recorrido + (porTipo.recorrido || 0),
      }));
      showAlert('success', enviados === 1
        ? 'Se envió 1 registro que estaba guardado sin conexión'
        : `Se enviaron ${enviados} registros que estaban guardados sin conexión`);
    }
    if (rechazados > 0) {
      showAlert('error', rechazados === 1
        ? 'Un registro guardado sin conexión no se pudo enviar. Revísalo arriba.'
        : `${rechazados} registros guardados sin conexión no se pudieron enviar. Revísalos arriba.`, 7000);
    }
  }, [userId, showAlert]);

  // Al abrir la app o entrar con una cuenta.
  useEffect(() => {
    cargarPendientes().then(enviarAhora);
  }, [enviarAhora]);

  // Al recuperar la conexión.
  useEffect(() => {
    if (reconexiones > 0) enviarAhora();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconexiones]);

  // Al volver a la app: en el móvil es lo más parecido a "he vuelto a tener señal".
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') enviarAhora(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [enviarAhora]);

  const mios = useMemo(
    () => foto.items.filter((i) => i.userId === userId),
    [foto.items, userId]
  );
  const quedanPorEnviar = mios.some((i) => i.estado === 'pendiente');

  useEffect(() => {
    if (!quedanPorEnviar) return undefined;
    const reloj = setInterval(enviarAhora, REINTENTO_MS);
    return () => clearInterval(reloj);
  }, [quedanPorEnviar, enviarAhora]);

  const registrar = useCallback(
    (alta) => registrarAlta({ ...alta, userId }),
    [userId]
  );

  const reintentar = useCallback(async (id) => {
    await reintentarPendiente(id);
    enviarAhora();
  }, [enviarAhora]);

  const value = useMemo(() => ({
    /** Los de esta cuenta, incluidos los recién enviados (estado 'enviado'). */
    pendientes: mios,
    /** Solo los que aún no han llegado al servidor. */
    porEnviar: mios.filter((i) => i.estado !== 'enviado'),
    enviando: foto.enviando,
    envios,
    registrar,
    enviarAhora,
    editar: editarPendiente,
    descartar: descartarPendiente,
    reintentar,
  }), [mios, foto.enviando, envios, registrar, enviarAhora, reintentar]);

  return <PendientesContext.Provider value={value}>{children}</PendientesContext.Provider>;
};

export const usePendientes = () => {
  const contexto = useContext(PendientesContext);
  if (!contexto) throw new Error('usePendientes debe usarse dentro de PendientesProvider');
  return contexto;
};
