/**
 * Almacén en el propio teléfono (IndexedDB) para trabajar sin conexión.
 *
 * Dos cajones:
 *   copias      la última respuesta buena de cada consulta, para enseñarla
 *               cuando no hay red. Clave: `${userId}|${consulta}`.
 *   pendientes  lo que se registró sin conexión y aún no llegó al servidor.
 *               Clave: el id del registro.
 *
 * IndexedDB y no localStorage: localStorage se queda en unos 5 MB y bloquea
 * la pantalla mientras escribe, y el historial completo de recorridos crece.
 *
 * Si el navegador no deja abrir IndexedDB (alguna ventana privada antigua),
 * se trabaja en memoria: la app sigue funcionando, pero lo guardado se pierde
 * al cerrarla. Es preferible a que no funcione nada.
 */

const NOMBRE = 'bitacora';
const VERSION = 1;

export const COPIAS = 'copias';
export const PENDIENTES = 'pendientes';

let conexion = null;
const memoria = { [COPIAS]: new Map(), [PENDIENTES]: new Map() };
let enMemoria = false;

const abrir = () => {
  if (conexion) return conexion;
  conexion = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no tiene IndexedDB'));
      return;
    }
    const peticion = indexedDB.open(NOMBRE, VERSION);
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(COPIAS)) db.createObjectStore(COPIAS);
      if (!db.objectStoreNames.contains(PENDIENTES)) db.createObjectStore(PENDIENTES, { keyPath: 'id' });
    };
    peticion.onsuccess = () => {
      const db = peticion.result;
      // Otra pestaña con una versión nueva de la app necesita actualizar el
      // esquema: esta cierra la suya y la vuelve a abrir en la próxima operación.
      db.onversionchange = () => { db.close(); conexion = null; };
      resolve(db);
    };
    peticion.onerror = () => reject(peticion.error);
  }).catch((error) => {
    enMemoria = true;
    console.warn('Sin IndexedDB; lo guardado sin conexión solo dura mientras la app esté abierta.', error);
    return null;
  });
  return conexion;
};

/** Ejecuta una operación en un cajón y resuelve cuando la transacción termina. */
const operar = async (cajon, modo, accion, enMemoriaHaz) => {
  const db = await abrir();
  if (!db || enMemoria) return enMemoriaHaz(memoria[cajon]);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(cajon, modo);
    const peticion = accion(tx.objectStore(cajon));
    let resultado;
    if (peticion) peticion.onsuccess = () => { resultado = peticion.result; };
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const leer = (cajon, clave) => operar(
  cajon, 'readonly',
  (store) => store.get(clave),
  (mapa) => mapa.get(clave),
);

/** En `pendientes` la clave sale del propio valor (su id); en `copias` se pasa aparte. */
export const guardar = (cajon, valor, clave) => operar(
  cajon, 'readwrite',
  (store) => (clave === undefined ? store.put(valor) : store.put(valor, clave)),
  (mapa) => { mapa.set(clave ?? valor.id, valor); },
);

export const borrar = (cajon, clave) => operar(
  cajon, 'readwrite',
  (store) => store.delete(clave),
  (mapa) => { mapa.delete(clave); },
);

export const todos = (cajon) => operar(
  cajon, 'readonly',
  (store) => store.getAll(),
  (mapa) => [...mapa.values()],
);

/** Borra todas las claves que empiezan por `prefijo` (las copias de una cuenta). */
export const borrarPorPrefijo = (cajon, prefijo) => operar(
  cajon, 'readwrite',
  (store) => store.delete(IDBKeyRange.bound(prefijo, `${prefijo}￿`)),
  (mapa) => { [...mapa.keys()].forEach((k) => { if (String(k).startsWith(prefijo)) mapa.delete(k); }); },
);

/**
 * Pide al navegador que no borre lo guardado cuando le falte espacio.
 *
 * Importa sobre todo en el iPhone, que limpia los datos de las webs que no se
 * usan en un tiempo. Con la app instalada en la pantalla de inicio suele
 * concederlo sin preguntar. Si no, no pasa nada: se intentó.
 */
export const pedirQueNoSeBorre = async () => {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return;
    await navigator.storage?.persist?.();
  } catch { /* opcional */ }
};
