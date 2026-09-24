import { PENDIENTES, todos, guardar, borrar, pedirQueNoSeBorre } from './almacen';
import { estaEnLinea } from './conexion';
import {
  createRiego, createRecorrido, updateRiego, updateRecorrido, mensajeDeError, esFalloDeRed,
} from '../services/api';

/**
 * Registros hechos sin conexión, a la espera de llegar al servidor.
 *
 * Cada alta lleva un id generado aquí. Si no hay conexión se guarda en el
 * teléfono con ese id y se envía más tarde. Como el id viaja con el alta, el
 * servidor reconoce un reenvío de algo que ya le llegó y no lo duplica: se
 * puede reintentar siempre que haya dudas, que es justo lo que pasa cuando
 * la señal se corta a mitad de un envío.
 *
 * Cada registro es de la cuenta que lo hizo (`userId`) y solo se envía con esa
 * cuenta abierta. Cerrar sesión no lo borra: sale al volver a entrar.
 *
 * Estados:
 *   pendiente   por enviar; se reintenta solo.
 *   rechazado   el servidor lo recibió y dijo que no (mes terminado, vehículo
 *               borrado…). No se reintenta solo: decide la persona.
 *   enviado     ya llegó. Solo vive en memoria un rato, para que la pantalla
 *               no lo pierda de vista mientras recarga los datos.
 */

/** Lo que tarda como mucho un envío. Con la conexión ya caída, menos: no tiene sentido hacer esperar. */
const TIEMPO_DE_ENVIO_MS = 15_000;
const TIEMPO_DE_ENVIO_SIN_CONEXION_MS = 6_000;
const MOSTRAR_ENVIADOS_MS = 2 * 60_000;

/**
 * El costo que pone la base de datos a un riego sin costo. Aquí solo sirve
 * para enseñar un riego que aún no se ha enviado; el alta sigue sin mandarlo.
 */
const COSTO_RIEGO_POR_DEFECTO = 1;

const CREAR = { riego: createRiego, recorrido: createRecorrido };
const ACTUALIZAR = { riego: updateRiego, recorrido: updateRecorrido };

/** UUID v4. `randomUUID` falta en navegadores algo antiguos (iOS < 15.4). */
export const nuevoId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/* ── Estado en memoria, con la misma forma que useSyncExternalStore ────────── */
let foto = { items: [], enviando: false };
let cargado = null;
let envioEnCurso = null;
const oyentes = new Set();

const publicar = (cambios) => {
  foto = { ...foto, ...cambios };
  oyentes.forEach((fn) => fn());
};

const ordenar = (lista) => [...lista].sort((a, b) => a.creadoEn - b.creadoEn);

export const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
export const leerFoto = () => foto;

/** Trae lo guardado en el teléfono. Se puede llamar muchas veces: carga una. */
export const cargarPendientes = () => {
  cargado = cargado || todos(PENDIENTES).catch(() => []).then((guardados) => {
    const enMemoria = new Set(foto.items.map((i) => i.id));
    publicar({ items: ordenar([...foto.items, ...guardados.filter((g) => !enMemoria.has(g.id))]) });
  });
  return cargado;
};

const poner = async (item) => {
  // La memoria y la pantalla solo cambian si se pudo guardar: un registro que
  // parece guardado y no lo está es justo lo que no puede pasar.
  if (item.estado !== 'enviado') await guardar(PENDIENTES, item);
  publicar({ items: ordenar([...foto.items.filter((i) => i.id !== item.id), item]) });
};

const quitar = async (id) => {
  await borrar(PENDIENTES, id).catch(() => {});
  publicar({ items: foto.items.filter((i) => i.id !== id) });
};

const marcarEnviado = async (item, registro) => {
  await borrar(PENDIENTES, item.id).catch(() => {});
  await poner({ ...item, estado: 'enviado', registro, error: null });
  setTimeout(() => {
    if (foto.items.some((i) => i.id === item.id && i.estado === 'enviado')) {
      publicar({ items: foto.items.filter((i) => i.id !== item.id) });
    }
  }, MOSTRAR_ENVIADOS_MS);
};

/* ── Operaciones ───────────────────────────────────────────────────────────── */

const encolar = async ({ id, userId, tipo, datos, vista }) => {
  await cargarPendientes();
  await poner({
    id, userId, tipo, datos, vista: vista ?? null,
    creadoEn: Date.now(), estado: 'pendiente', error: null, editado: false,
  });
  pedirQueNoSeBorre();
};

const opcionesDeEnvio = () => ({
  timeout: estaEnLinea() ? TIEMPO_DE_ENVIO_MS : TIEMPO_DE_ENVIO_SIN_CONEXION_MS,
});

/**
 * Registra un alta. La manda al servidor y, si no hay conexión, la guarda en
 * el teléfono para enviarla después.
 *
 * Devuelve `{ respuesta }` si llegó o `{ guardadoSinConexion: true }` si quedó
 * guardada. Un error del servidor (400, 409…) se lanza igual que siempre: eso
 * no es falta de conexión y hay que enseñarlo en el formulario.
 */
export const registrar = async ({ userId, tipo, datos, vista }) => {
  const id = nuevoId();
  const guardarAqui = async () => {
    await encolar({ id, userId, tipo, datos, vista });
    return { guardadoSinConexion: true, id };
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return guardarAqui();
  try {
    const respuesta = await CREAR[tipo]({ id, ...datos }, opcionesDeEnvio());
    return { respuesta, id };
  } catch (error) {
    if (esFalloDeRed(error)) return guardarAqui();
    throw error;
  }
};

/** Cambia un registro que aún no se ha enviado. Vuelve a la cola si estaba rechazado. */
export const editarPendiente = async (id, { datos, vista }) => {
  const item = foto.items.find((i) => i.id === id);
  if (!item || item.estado === 'enviado') return;
  await poner({ ...item, datos, vista: vista ?? item.vista, estado: 'pendiente', error: null, editado: true });
};

export const descartarPendiente = (id) => quitar(id);

export const reintentarPendiente = async (id) => {
  const item = foto.items.find((i) => i.id === id);
  if (item?.estado === 'rechazado') await poner({ ...item, estado: 'pendiente', error: null });
};

/**
 * Envía un registro. Devuelve qué pasó para decidir si seguir con el resto:
 * sin conexión no tiene sentido probar los siguientes.
 */
const enviarUno = async (item) => {
  try {
    const respuesta = await CREAR[item.tipo]({ id: item.id, ...item.datos }, opcionesDeEnvio());
    let registro = respuesta.data?.data ?? null;

    // Los cambios hechos aquí que el alta no llevó se mandan aparte:
    //  - 200 en lugar de 201: ya había llegado antes (se perdió la respuesta)
    //    y el servidor devolvió lo que tenía, sin tocarlo, pero luego se editó.
    //  - Se editó mientras este envío iba de camino.
    const ultimo = foto.items.find((i) => i.id === item.id);
    const editadoEnCamino = Boolean(ultimo) && ultimo.datos !== item.datos;
    if ((respuesta.status === 200 && item.editado) || editadoEnCamino) {
      const datos = editadoEnCamino ? ultimo.datos : item.datos;
      const actualizado = await ACTUALIZAR[item.tipo](item.id, datos, opcionesDeEnvio());
      registro = actualizado.data?.data ?? registro;
    }

    await marcarEnviado(item, registro);
    return 'enviado';
  } catch (error) {
    if (esFalloDeRed(error)) return 'sin-conexion';
    const estado = error.response?.status;
    // 401: la sesión caducó. El interceptor ya intentó renovarla; si no pudo,
    // mandó al login. Lo pendiente se queda para cuando se vuelva a entrar.
    if (estado === 401) return 'sin-conexion';
    // El servidor está saturado o caído: más tarde.
    if (estado === 429 || estado >= 500) return 'sin-conexion';
    await poner({ ...item, estado: 'rechazado', error: mensajeDeError(error) });
    return 'rechazado';
  }
};

/**
 * Envía todo lo pendiente de una cuenta, en el orden en que se registró.
 * Si ya hay un envío en marcha devuelve ese mismo: nunca van dos a la vez.
 *
 * Resuelve con { enviados, rechazados, porTipo: { riego, recorrido } }.
 */
export const enviarPendientes = (userId) => {
  if (!userId) return Promise.resolve({ enviados: 0, rechazados: 0, porTipo: {} });
  if (envioEnCurso) return envioEnCurso;

  envioEnCurso = (async () => {
    await cargarPendientes();
    const cola = foto.items.filter((i) => i.userId === userId && i.estado === 'pendiente');
    const resultado = { enviados: 0, rechazados: 0, porTipo: {} };
    if (cola.length === 0) return resultado;

    publicar({ enviando: true });
    for (const item of cola) {
      // Pudo descartarse o editarse mientras se enviaba el anterior.
      const actual = foto.items.find((i) => i.id === item.id);
      if (actual?.estado !== 'pendiente') continue;

      const que = await enviarUno(actual);
      if (que === 'sin-conexion') break;
      if (que === 'rechazado') resultado.rechazados += 1;
      if (que === 'enviado') {
        resultado.enviados += 1;
        resultado.porTipo[actual.tipo] = (resultado.porTipo[actual.tipo] || 0) + 1;
      }
    }
    return resultado;
  })().finally(() => {
    envioEnCurso = null;
    if (foto.enviando) publicar({ enviando: false });
  });

  return envioEnCurso;
};

/* ── Cómo se enseña en pantalla ────────────────────────────────────────────── */

const conSegundos = (hora) => (/^\d{2}:\d{2}$/.test(String(hora ?? '')) ? `${hora}:00` : hora);

/**
 * Los datos con los que la pantalla pinta un recorrido que aún no llegó: lo
 * que el servidor calcularía a partir del vehículo (descripción, costo,
 * reparto) y los nombres de los niños, que el alta solo manda por id.
 */
export const vistaDeRecorrido = (datos, vehiculos = [], ninosConNombre = []) => {
  const vehiculo = vehiculos.find((v) => String(v.id) === String(datos.vehiculo_id));
  const costo = Number(datos.costo ?? vehiculo?.costo_por_recorrido ?? 0) || 0;
  const parteAuto = vehiculo?.auto_cobra ? Math.min(Number(vehiculo.parte_auto) || 0, costo) : 0;
  return {
    vehiculo_descripcion: vehiculo?.descripcion ?? null,
    vehiculo_placa: vehiculo?.placa ?? null,
    vehiculo_capacidad: vehiculo?.capacidad ?? null,
    costo: costo.toFixed(2),
    // Si el vehículo no trae el reparto (API antigua), tampoco se inventa.
    ...(vehiculo && 'auto_cobra' in vehiculo
      ? { parte_auto: parteAuto.toFixed(2), parte_chofer: (costo - parteAuto).toFixed(2) }
      : {}),
    ninos: ninosConNombre.map((n) => ({
      nino_id: n.nino_id, nombre: n.nombre, apellidos: n.apellidos, notas: n.notas || null,
    })),
  };
};

/**
 * Un registro de la cola con la forma que tendría si viniera del servidor,
 * más `_pendiente` ('pendiente' | 'rechazado') y `_error` para marcarlo.
 */
export const comoRegistro = (item) => {
  if (item.estado === 'enviado') return item.registro;
  const marca = { id: item.id, activo: true, _pendiente: item.estado, _error: item.error };

  if (item.tipo === 'riego') {
    return {
      ...marca,
      fecha: item.datos.fecha,
      hora: conSegundos(item.datos.hora),
      costo: Number(item.datos.costo ?? COSTO_RIEGO_POR_DEFECTO).toFixed(2),
    };
  }
  return {
    ...marca,
    ...item.datos,
    hora_inicio: conSegundos(item.datos.hora_inicio),
    ...(item.vista || {}),
  };
};

/**
 * Suma a una lista del servidor los registros de ese tipo que siguen en el
 * teléfono (o que acaban de llegar y la lista aún no trae). Si el servidor ya
 * trae uno, gana el del servidor. Con `mes` ('YYYY-MM'), solo los de ese mes.
 */
export const unirConPendientes = (lista, pendientes, tipo, { mes } = {}) => {
  const propios = pendientes
    .filter((p) => p.tipo === tipo)
    .map(comoRegistro)
    .filter((r) => r && (!mes || String(r.fecha ?? '').startsWith(mes)));
  if (propios.length === 0) return lista;
  const ids = new Set(lista.map((r) => r.id));
  return [...lista, ...propios.filter((r) => !ids.has(r.id))];
};

/** Pendientes (sin enviar todavía) de un tipo en un mes `YYYY-MM`. */
export const pendientesDelMes = (pendientes, clave, tipo = null) => pendientes.filter((p) => (
  p.estado !== 'enviado'
  && (!tipo || p.tipo === tipo)
  && String(p.datos?.fecha ?? '').startsWith(clave)
));
