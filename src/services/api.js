import axios from 'axios';
import { empezar, terminar } from '../lib/progress';
import { esFalloDeRed, marcarEnLinea, marcarSinConexion, anotarCopia } from '../lib/conexion';
import { COPIAS, leer, guardar, borrarPorPrefijo } from '../lib/almacen';
import { dosDigitos } from '../lib/fechas';

export { esFalloDeRed };

/**
 * URL base de la API, desde VITE_API_URL.
 *
 * El proyecto no está desplegado: por defecto apunta al backend en local, que
 * escucha en el 3001 porque el 3000 lo ocupa este mismo dev server. Cuando
 * despliegues, define VITE_API_URL en el hosting del frontend.
 *
 * Sobre el saneado: la API monta sus rutas en la raíz (/auth, /ninos…), sin
 * prefijo /api. La variable de entorno arrastraba un ".../api" de una versión
 * antigua del backend que nadie notó porque el código anterior tenía la URL
 * escrita a mano e ignoraba la variable. Se normaliza para que un valor
 * heredado no convierta todas las peticiones en 404. Si algún día la API se
 * sirve de verdad tras un prefijo, hay que quitar este saneado.
 */
const normalizarBase = (url) => url.replace(/\/+$/, '').replace(/\/api$/, '');

const API_URL = normalizarBase(import.meta.env.VITE_API_URL || 'http://localhost:3001');

/* ─────────────────────────────────────────────────────────────────────────────
 * Almacenamiento de sesión
 *
 * La API pasó de un único token de 24h a un par access (2h) + refresh (30d).
 * El refresh ROTA: cada uso devuelve uno nuevo y anula el anterior, así que hay
 * que guardar siempre el último. Reutilizar uno ya rotado cierra todas las
 * sesiones del usuario, porque el backend lo interpreta como un token robado.
 * ───────────────────────────────────────────────────────────────────────────── */
const CLAVES = { access: 'access_token', refresh: 'refresh_token', user: 'user' };

export const getAccessToken = () => localStorage.getItem(CLAVES.access);
export const getRefreshToken = () => localStorage.getItem(CLAVES.refresh);

export const guardarSesion = ({ access_token, refresh_token, usuario }) => {
  if (access_token) localStorage.setItem(CLAVES.access, access_token);
  if (refresh_token) localStorage.setItem(CLAVES.refresh, refresh_token);
  if (usuario) localStorage.setItem(CLAVES.user, JSON.stringify(usuario));
};

/**
 * Cierra la sesión en este navegador.
 *
 * Las copias para trabajar sin conexión son datos de esta cuenta: en un
 * teléfono compartido no se pueden quedar a la vista del siguiente. Lo
 * pendiente de enviar NO se borra: se envía cuando esta cuenta vuelva a entrar.
 *
 * Devuelve la promesa del borrado de las copias. Quien vaya a recargar la
 * página después tiene que esperarla: una recarga a medias corta el borrado.
 */
export const limpiarSesion = () => {
  const userId = getCurrentUserInfo().id;
  const borrado = userId ? borrarPorPrefijo(COPIAS, `${userId}|`).catch(() => {}) : Promise.resolve();

  Object.values(CLAVES).forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem('authToken');    // clave del esquema anterior
  localStorage.removeItem('authUserCache');
  return borrado;
};

// Los tokens emitidos antes del cambio de JWT_SECRET ya no son válidos.
// Se limpian al cargar para no dejar al usuario en un limbo de 401 en bucle.
if (localStorage.getItem('authToken') && !localStorage.getItem(CLAVES.access)) {
  limpiarSesion();
}

/*
 * Tiempo máximo por petición. Sin él, una petición que se queda colgada —un
 * arranque en frío del servidor con mala señal en el móvil— no terminaba
 * nunca, y la pantalla de carga se quedaba ahí indefinidamente. 20 s cubren
 * de sobra un arranque en frío normal (unos 3-6 s) y cortan lo que ya no va
 * a llegar.
 */
export const TIEMPO_MAXIMO_MS = 20_000;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: TIEMPO_MAXIMO_MS,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Barra de progreso
 *
 * Se engancha aquí y no en cada pantalla: así cualquier petición alimenta el
 * indicador sin que las páginas tengan que acordarse de nada. El reintento
 * tras renovar el token vuelve a pasar por este par, de modo que la cuenta de
 * tareas activas sigue cuadrando.
 * ───────────────────────────────────────────────────────────────────────────── */
api.interceptors.request.use((config) => {
  empezar();
  return config;
}, (error) => {
  terminar();
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  terminar();
  return response;
}, (error) => {
  terminar();
  return Promise.reject(error);
});

/* Estado de la conexión (lib/conexion.js): cualquier respuesta del servidor,
   aunque sea un error, demuestra que hay conexión; una petición sin respuesta
   demuestra que no. */
api.interceptors.response.use((response) => {
  marcarEnLinea();
  return response;
}, (error) => {
  if (esFalloDeRed(error)) marcarSinConexion();
  else if (error?.response) marcarEnLinea();
  return Promise.reject(error);
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Renovación automática del access token
 *
 * Antes, el interceptor cerraba la sesión ante un 401 O un 403. Eso ahora sería
 * un error grave: la API devuelve 403 cuando el usuario está correctamente
 * autenticado pero no tiene permisos (por ejemplo, un usuario normal abriendo
 * una pantalla de admin). Expulsarlo por eso es incorrecto.
 *
 *   401 → el access token caducó: se renueva y se reintenta.
 *   403 → sin permisos: se propaga el error, la sesión sigue viva.
 * ───────────────────────────────────────────────────────────────────────────── */
let renovando = null;
let alCerrarSesion = null;

/** Permite al AuthContext reaccionar cuando la sesión muere de verdad. */
export const registrarCierreDeSesion = (fn) => { alCerrarSesion = fn; };

const cerrarSesionForzado = () => {
  limpiarSesion().finally(() => {
    if (alCerrarSesion) alCerrarSesion();
    else if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
  });
};

const renovarToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('sin refresh token');

  // Cliente aparte: sin interceptores, para que un 401 aquí no reentre.
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: TIEMPO_MAXIMO_MS,
  });

  guardarSesion({
    access_token: data.data.access_token,
    refresh_token: data.data.refresh_token,
    usuario: data.data.usuario,
  });
  return data.data.access_token;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._reintentado) {
      return Promise.reject(error);
    }
    original._reintentado = true;

    try {
      // Si llegan varias peticiones con el token caducado a la vez, todas
      // esperan a la MISMA renovación. Sin esto cada una gastaría un refresh
      // distinto y la rotación cerraría la sesión por "token reutilizado".
      renovando = renovando || renovarToken().finally(() => { renovando = null; });
      const nuevo = await renovando;

      original.headers.Authorization = `Bearer ${nuevo}`;
      return api(original);
    } catch (errorAlRenovar) {
      // Sin red para renovar no es una sesión muerta: se deja como está y la
      // siguiente petición con conexión lo vuelve a intentar. Cerrarla aquí
      // dejaría fuera a quien no puede volver a entrar hasta tener internet.
      if (esFalloDeRed(errorAlRenovar)) return Promise.reject(errorAlRenovar);
      cerrarSesionForzado();
      return Promise.reject(error);
    }
  }
);

/* ─────────────────────────────────────────────────────────────────────────────
 * Utilidades de respuesta
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Extrae el mensaje de un error de la API.
 *
 * `error` dejó de ser una cadena y ahora es un objeto { mensaje, detalles }.
 * Leerlo como antes pintaba "[object Object]" en pantalla. Cuando el fallo es
 * de validación, `detalles` trae el campo concreto y se muestra también.
 */
export const mensajeDeError = (error, porDefecto = 'Ha ocurrido un error') => {
  // "Network Error" o "timeout of 20000ms exceeded" no le dicen nada a nadie.
  if (esFalloDeRed(error)) {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'El servidor no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.'
      : 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  const cuerpo = error?.response?.data?.error;
  if (!cuerpo) return error?.message || porDefecto;
  if (typeof cuerpo === 'string') return cuerpo; // por si queda algo del formato viejo

  const base = cuerpo.mensaje || porDefecto;
  if (Array.isArray(cuerpo.detalles) && cuerpo.detalles.length > 0) {
    const campos = cuerpo.detalles
      .map((d) => `${String(d.campo || '').replace(/^body\./, '')}: ${d.mensaje}`)
      .join(' · ');
    return `${base} (${campos})`;
  }
  return base;
};

/**
 * ¿La respuesta confirma que la operación salió bien?
 *
 * Axios ya rechaza cualquier código fuera de 2xx, así que llegar hasta aquí
 * significa que el servidor aceptó la petición. Exigir ADEMÁS un `success:
 * true` explícito hacía que cualquier respuesta sin ese campo (un 201 que
 * devuelve el registro creado y poco más) se tratara en silencio como un
 * fallo: el formulario se quedaba abierto, sin aviso y sin recargar la lista.
 * Solo un `success: false` expreso cuenta como error.
 */
export const fueBien = (respuesta) => respuesta?.data?.success !== false;

/**
 * Mensaje de una respuesta que llegó con 2xx pero declara `success: false`.
 */
export const mensajeDeRespuesta = (respuesta, porDefecto = 'La operación no se completó') => {
  const error = respuesta?.data?.error;
  if (typeof error === 'string') return error;
  return error?.mensaje || respuesta?.data?.mensaje || porDefecto;
};

/**
 * Recorre todas las páginas de un listado.
 *
 * Sin esto, el dashboard calcularía sus totales sobre los primeros registros y
 * mostraría cifras incorrectas SIN dar ningún error, que es la peor forma de
 * romperse.
 *
 * No se fía de que el servidor interprete la paginación como esperamos: si
 * ignora `pagina` o si `meta.paginas` significa otra cosa, la versión anterior
 * acumulaba la misma página una y otra vez y los listados salían con los
 * registros repetidos. Ahora la parada depende de lo que realmente llega.
 */
export const obtenerTodo = async (peticion, { limite = 50, maxPaginas = 50 } = {}) => {
  const acumulado = [];
  const vistos = new Set();
  let tamPagina = 0;

  for (let pagina = 1; pagina <= maxPaginas; pagina += 1) {
    const { data } = await peticion({ limite, pagina });
    const lote = Array.isArray(data?.data) ? data.data : [];
    if (lote.length === 0) break;

    // Solo cuentan los registros que no habíamos visto ya.
    let nuevos = 0;
    for (const item of lote) {
      const clave = item?.id ?? JSON.stringify(item);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      acumulado.push(item);
      nuevos += 1;
    }

    // Una página que no aporta nada nuevo significa que el servidor nos está
    // devolviendo lo mismo: seguir pidiendo solo duplicaría.
    if (nuevos === 0) break;

    // Una página más corta que las anteriores es la última.
    if (lote.length < tamPagina) break;
    tamPagina = Math.max(tamPagina, lote.length);

    const totalPaginas = Number(data?.meta?.paginas);
    if (Number.isFinite(totalPaginas) && totalPaginas > 0 && pagina >= totalPaginas) break;
  }

  return acumulado;
};

const listaParams = ({ limite = 50, pagina = 1, ...resto } = {}) => ({ params: { limite, pagina, ...resto } });

/* ─────────────────────────────────────────────────────────────────────────────
 * Copias para trabajar sin conexión
 *
 * Cada consulta que sale bien se guarda en el teléfono. Si más tarde la misma
 * consulta no obtiene respuesta (sin red, sin tiempo), se devuelve esa copia y
 * la app avisa de que es lo guardado y de cuándo. Solo ante fallos de red: si
 * el servidor contesta con un error, ese error es la verdad y se propaga.
 *
 * Sin copia, el error sale marcado con `sinCopia` para que la pantalla diga
 * que no hay datos guardados, en vez de pintar ceros que parecen reales.
 *
 * Van por cuenta (`${userId}|…`): quien entra con otra cuenta en el mismo
 * teléfono nunca ve las de la anterior. Se borran al cerrar sesión.
 * ───────────────────────────────────────────────────────────────────────────── */
const claveDeCopia = (consulta) => {
  const userId = getCurrentUserInfo().id;
  return userId ? `${userId}|${consulta}` : null;
};

const guardarCopia = (consulta, datos, guardadoEn = Date.now()) => {
  const clave = claveDeCopia(consulta);
  // Guardar la copia es un extra: si falla, la consulta sigue siendo buena.
  if (clave) guardar(COPIAS, { datos, guardadoEn }, clave).catch(() => {});
};

const leerCopia = async (consulta) => {
  const clave = claveDeCopia(consulta);
  return clave ? leer(COPIAS, clave).catch(() => null) : null;
};

const sinCopia = (error) => Object.assign(error, { sinCopia: true });

const conCopia = async (consulta, peticion) => {
  try {
    const datos = await peticion();
    guardarCopia(consulta, datos);
    return datos;
  } catch (error) {
    if (!esFalloDeRed(error)) throw error;
    const copia = await leerCopia(consulta);
    if (!copia) throw sinCopia(error);
    anotarCopia(copia.guardadoEn);
    return copia.datos;
  }
};

/** Para las consultas que devuelven la respuesta de axios: se guarda solo el cuerpo. */
const cuerpoConCopia = (consulta, peticion) => conCopia(consulta, async () => {
  const { data } = await peticion();
  return { data };
});

/**
 * Los meses `YYYY-MM` que cubre enteros un rango desde–hasta, o null si el
 * rango no empieza un día 1 o no acaba el último día de un mes.
 */
const mesesDelRango = ({ desde, hasta } = {}) => {
  if (!/^\d{4}-\d{2}-01$/.test(desde || '') || !/^\d{4}-\d{2}-\d{2}$/.test(hasta || '')) return null;
  const [ah, mh, dh] = hasta.split('-').map(Number);
  if (dh !== new Date(ah, mh, 0).getDate()) return null;

  const meses = [];
  let [a, m] = desde.split('-').map(Number);
  while (a < ah || (a === ah && m <= mh)) {
    meses.push(`${a}-${dosDigitos(m)}`);
    if (meses.length > 120) return null;
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return meses.length ? meses : null;
};

/* ─────────────────────────────────────────────────────────────────────────────
 * AUTENTICACIÓN
 * ───────────────────────────────────────────────────────────────────────────── */
export const login = (credentials) => api.post('/auth/login', credentials);
// No hay registro público: las cuentas las crea un administrador en /users.
export const refreshSession = () => api.post('/auth/refresh', { refresh_token: getRefreshToken() });
// Con poca señal no se hace esperar 20 s a quien quiere salir: si no llega,
// la sesión se cierra en local igualmente.
export const logoutApi = () => api.post('/auth/logout', { refresh_token: getRefreshToken() }, { timeout: 5000 });
export const logoutAll = () => api.post('/auth/logout-all');
export const verifyToken = () => api.get('/auth/verify');
export const getCurrentUser = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/me', data);
export const changePassword = (data) => api.post('/auth/password', data);

/* ─────────────────────────────────────────────────────────────────────────────
 * USUARIOS (solo admin, salvo GET /users/:id sobre uno mismo)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getUsers = (opciones) => api.get('/users', listaParams(opciones));
export const getAllUsers = () => conCopia('usuarios', () => obtenerTodo(getUsers));
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

/**
 * Un administrador restablece la contraseña de otra cuenta.
 *
 * Endpoint propio: PUT /users/:id NO acepta el campo `password` y devolvía 400,
 * así que "Restablecer contraseña" nunca llegó a funcionar. Al hacerlo se
 * cierran todas las sesiones de esa cuenta.
 */
export const resetUserPassword = (id, password) => api.post(`/users/${id}/password`, { password });

/* ─────────────────────────────────────────────────────────────────────────────
 * NIÑOS
 * ───────────────────────────────────────────────────────────────────────────── */
export const getNinos = (opciones) => api.get('/ninos', listaParams(opciones));
export const getAllNinos = () => conCopia('ninos', () => obtenerTodo(getNinos));
export const getNinoById = (id) => api.get(`/ninos/${id}`);
export const createNino = (data) => api.post('/ninos', data);
export const updateNino = (id, data) => api.put(`/ninos/${id}`, data);
export const deleteNino = (id) => api.delete(`/ninos/${id}`);

/* ─────────────────────────────────────────────────────────────────────────────
 * VEHÍCULOS
 * ───────────────────────────────────────────────────────────────────────────── */
export const getVehiculos = (opciones) => api.get('/vehiculos', listaParams(opciones));
export const getAllVehiculos = () => conCopia('vehiculos', () => obtenerTodo(getVehiculos));
export const getVehiculoById = (id) => api.get(`/vehiculos/${id}`);
export const createVehiculo = (data) => api.post('/vehiculos', data);
export const updateVehiculo = (id, data) => api.put(`/vehiculos/${id}`, data);
export const deleteVehiculo = (id) => api.delete(`/vehiculos/${id}`);

/* ─────────────────────────────────────────────────────────────────────────────
 * RECORRIDOS
 * ───────────────────────────────────────────────────────────────────────────── */
export const getRecorridos = (opciones) => api.get('/recorridos', listaParams(opciones));
export const getAllRecorridos = (filtros) => conCopia(
  `recorridos|${JSON.stringify(filtros ?? {})}`,
  () => obtenerTodo((p) => getRecorridos({ ...filtros, ...p })),
);
export const getRecorridoById = (id) => api.get(`/recorridos/${id}`);
export const getRecorridosByFecha = (fecha) => api.get(`/recorridos/fecha/${fecha}`);
export const createRecorrido = (data, opciones) => api.post('/recorridos', data, opciones);
export const updateRecorrido = (id, data, opciones) => api.put(`/recorridos/${id}`, data, opciones);
export const deleteRecorrido = (id) => api.delete(`/recorridos/${id}`);
export const addNinoToRecorrido = (data) => api.post('/recorridos/ninos', data);
export const removeNinoFromRecorrido = (id) => api.delete(`/recorridos/ninos/${id}`);
export const updateNotaNinoRecorrido = (id, notas) => api.patch(`/recorridos/ninos/${id}`, { notas });

/* ─────────────────────────────────────────────────────────────────────────────
 * RIEGOS
 *
 * `costo` se omite en el alta habitual: la tabla lo pone a 1.00. Mandarlo solo
 * cuando el usuario lo cambia evita fijar aquí un valor por defecto que algún
 * día discreparía del de la base de datos.
 * ───────────────────────────────────────────────────────────────────────────── */
export const getRiegos = (opciones) => api.get('/riegos', listaParams(opciones));
const pedirRiegos = (filtros) => obtenerTodo((p) => getRiegos({ ...filtros, ...p }));

/**
 * Los riegos se piden por rangos de meses distintos: el Resumen pide seis de
 * golpe y la pantalla de Riegos, uno. Si la copia se guardara por consulta,
 * abrir Riegos sin conexión no encontraría nada aunque el Resumen ya hubiera
 * traído ese mismo mes. Por eso se guardan mes a mes y, sin conexión, el rango
 * se arma con los meses que haya.
 */
export const getAllRiegos = async (filtros = {}) => {
  const soloRango = Object.keys(filtros).every((k) => k === 'desde' || k === 'hasta');
  const meses = soloRango ? mesesDelRango(filtros) : null;
  if (!meses) return conCopia(`riegos|${JSON.stringify(filtros)}`, () => pedirRiegos(filtros));

  try {
    const lista = await pedirRiegos(filtros);
    const guardadoEn = Date.now();
    meses.forEach((mes) => guardarCopia(
      `riegos-mes|${mes}`,
      lista.filter((r) => String(r.fecha).startsWith(mes)),
      guardadoEn,
    ));
    return lista;
  } catch (error) {
    if (!esFalloDeRed(error)) throw error;
    const copias = await Promise.all(meses.map((mes) => leerCopia(`riegos-mes|${mes}`)));
    if (copias.some((c) => !c)) throw sinCopia(error);
    anotarCopia(Math.min(...copias.map((c) => c.guardadoEn)));
    return copias.flatMap((c) => c.datos);
  }
};
export const getRiegoById = (id) => api.get(`/riegos/${id}`);
export const createRiego = (data, opciones) => api.post('/riegos', data, opciones);
export const updateRiego = (id, data, opciones) => api.put(`/riegos/${id}`, data, opciones);
export const deleteRiego = (id) => api.delete(`/riegos/${id}`);

/* ─────────────────────────────────────────────────────────────────────────────
 * Cierre de mes (cada usuario, los suyos) y cobros (solo administrador)
 * ───────────────────────────────────────────────────────────────────────────── */
export const getCierres = (anio) => cuerpoConCopia(
  `cierres|${anio ?? 'todos'}`,
  () => api.get('/cierres', { params: anio ? { anio } : {} }),
);
export const terminarMes = (anio, mes) => api.post('/cierres', { anio, mes });
export const reabrirMes = (anio, mes) => api.delete(`/cierres/${anio}/${mes}`);

export const getCobros = (anio, mes) => cuerpoConCopia(
  `cobros|${anio}-${mes}`,
  () => api.get('/cobros', { params: { anio, mes } }),
);
export const getDatosDeCobro = (userId, anio, mes) => cuerpoConCopia(
  `cobro|${userId}|${anio}-${mes}`,
  () => api.get(`/cobros/${userId}/${anio}/${mes}`),
);
export const marcarCobrado = (userId, anio, mes) => api.post(`/cobros/${userId}/${anio}/${mes}/cobro`);
export const deshacerCobro = (userId, anio, mes) => api.delete(`/cobros/${userId}/${anio}/${mes}/cobro`);

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers de rol
 * ───────────────────────────────────────────────────────────────────────────── */
export const getCurrentUserInfo = () => {
  try { return JSON.parse(localStorage.getItem(CLAVES.user) || '{}'); }
  catch { return {}; }
};
export const isAdmin = () => getCurrentUserInfo().rol === 'admin';
export const getUserRole = () => getCurrentUserInfo().rol;

export default api;
