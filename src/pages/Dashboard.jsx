import React, { useEffect, useState, useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  Users, Route as RouteIcon, Calendar as CalendarIcon,
  ChevronRight, Clock, Trash2, Plus, Droplets, FileDown,
  TrendingUp, HandCoins, Wallet, CalendarCheck, PieChart, BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { generarReportePdf } from '../lib/reportePdf';
import { generarReporteRiegosPdf } from '../lib/reporteRiegosPdf.js';
import { generarReporteGeneralPdf } from '../lib/reporteGeneralPdf.js';
import { generarLiquidacionPdf } from '../lib/liquidacionPdf.js';
import { useApp } from '../context/AppContext';
import {
  createRecorrido, updateRecorrido, deleteRecorrido,
  getAllRecorridos, getAllNinos, getAllVehiculos, getAllRiegos,
  getCierres, terminarMes, reabrirMes,
  mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import CalendarioMes from '../components/ui/CalendarioMes';
import RiegoModal from '../components/RiegoModal';
import Kpi from '../components/resumen/Kpi';
import Aviso from '../components/resumen/Aviso';
import TarjetaVehiculo from '../components/resumen/TarjetaVehiculo';
import GraficoMeses from '../components/resumen/GraficoMeses';
import BurbujasTipos from '../components/resumen/BurbujasTipos';
import { PALETA_GRAFICO } from '../components/resumen/paleta';
import EstadoDelMes from '../components/resumen/EstadoDelMes';
import SelectorDeMes from '../components/ui/SelectorDeMes';
import { MESES as nombresMeses, rangoDelMes, diaDeFecha, dosDigitos, hoyISO, horaActual } from '../lib/fechas';
import { haptics } from '../lib/motion';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Cuántos meses enseña la comparativa, contando el que está a la vista. */
const MESES_DE_HISTORIAL = 6;

const importe = (registro) => parseFloat(registro?.costo ?? '0') || 0;

/** El YYYY-MM de una fecha en texto. Sin pasar por Date: construir un Date
 *  para leer el mes arrastra la zona horaria del navegador y un registro de
 *  fin de mes a última hora se contaría en el mes siguiente. */
const claveDeMes = (fecha) => String(fecha ?? '').slice(0, 7);

const sumarDelMes = (registros, clave) => registros.reduce(
  (total, registro) => (claveDeMes(registro?.fecha) === clave ? total + importe(registro) : total),
  0
);

/** Registros de un mes repartidos por día, cada día ordenado por hora. */
const agruparPorDia = (registros, clave, campoHora) => {
  const porDia = {};

  registros.forEach((registro) => {
    if (claveDeMes(registro?.fecha) !== clave) return;
    const dia = diaDeFecha(registro.fecha);
    if (dia) (porDia[dia] ??= []).push(registro);
  });

  Object.values(porDia).forEach((lista) => {
    lista.sort((a, b) => String(a[campoHora] ?? '').localeCompare(String(b[campoHora] ?? '')));
  });

  return porDia;
};

/**
 * Tendencia de una cuenta (recorridos, riegos, días) frente al mes anterior.
 * Se da en unidades y no en porcentaje: "+3" se entiende; "+42 %" sobre siete
 * recorridos exagera lo que en realidad son tres.
 */
const tendenciaDeCuenta = (actual, anterior, mesAnterior) => {
  const delta = actual - anterior;
  return {
    texto: delta === 0 ? 'Igual' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`,
    direccion: delta > 0 ? 'sube' : delta < 0 ? 'baja' : 'igual',
    bueno: delta > 0,
    contra: `vs ${mesAnterior}`,
  };
};

/**
 * Tendencia del gasto, en porcentaje. Aquí subir no es bueno: más gasto se
 * pinta en naranja, menos en verde.
 */
const tendenciaDeGasto = (variacion, mesAnterior) => {
  if (variacion === null) {
    return { texto: 'Sin gasto', direccion: 'igual', bueno: false, contra: `en ${mesAnterior}` };
  }
  const redondeada = Math.round(variacion);
  if (redondeada === 0) {
    return { texto: 'Igual', direccion: 'igual', bueno: false, contra: `vs ${mesAnterior}` };
  }
  return {
    texto: `${redondeada > 0 ? '+' : '−'}${Math.abs(redondeada)}%`,
    direccion: redondeada > 0 ? 'sube' : 'baja',
    bueno: redondeada < 0,
    contra: `vs ${mesAnterior}`,
  };
};

const fechaDeHoy = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });

/** Rango que cubre el histórico completo, para pedirlo en una sola llamada. */
const rangoDelHistorial = (mes, anio) => {
  const primero = new Date(anio, mes - 1 - (MESES_DE_HISTORIAL - 1), 1);
  return {
    desde: `${primero.getFullYear()}-${dosDigitos(primero.getMonth() + 1)}-01`,
    hasta: rangoDelMes(mes, anio).hasta,
  };
};

const tipoTone = { traer: 'positive', llevar: 'caution' };
const tipoLabel = { traer: 'Traer', llevar: 'Llevar' };

/** Leyenda del cronograma: un color por cada cosa que se pinta en una casilla. */
const LEYENDA = [
  { color: 'bg-positive', texto: 'Traer', modulo: 'recorridos' },
  { color: 'bg-caution', texto: 'Llevar', modulo: 'recorridos' },
  { color: 'bg-info', texto: 'Riego', modulo: 'riegos' },
];

/**
 * Paleta del gráfico.
 *
 * Dos series categóricas: azul para el mes en curso, naranja para el anterior.
 * Cada modo tiene su propio paso de la misma familia de tonos — el oscuro es
 * una elección, no un volteo automático del claro — y ambos pares están
 * validados contra su superficie (banda de luminosidad, croma, separación bajo
 * daltonismo y contraste).
 */
const formatearHora = (hora) => {
  if (!hora) return '—';
  try {
    if (hora.includes('T')) {
      return new Date(hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const partes = hora.split(':');
    if (partes.length >= 2) return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
    return hora;
  } catch {
    return hora;
  }
};

/**
 * Marcadores de carga.
 *
 * Tienen la forma de lo que va a llegar —una cifra, unos ejes, una rejilla de
 * días— en lugar de ser un rectángulo gris. Así la espera se lee como
 * "el contenido está llegando" y no como "algo se rompió", y cuando los datos
 * entran no hay salto de layout porque el hueco ya medía lo mismo.
 */
const EsqueletoKpi = () => (
  <Card className="flex items-center gap-4">
    <Skeleton variant="bare" className="h-12 w-12 shrink-0 rounded-full" />
    <div className="flex-1">
      <Skeleton variant="bare" className="h-3 w-24" />
      <Skeleton variant="bare" className="mt-2 h-8 w-32" />
    </div>
  </Card>
);

/** Silueta del gráfico: la forma de lo que va a llegar, no un bloque gris. */
const EsqueletoBarras = ({ alto = 'h-[230px]' }) => (
  <div className={`flex ${alto} items-end gap-4 px-2`}>
    {[46, 70, 38, 84, 60, 74].map((altura, i) => (
      <Skeleton key={i} variant="bare" className="flex-1 rounded-full" style={{ height: `${altura}%` }} />
    ))}
  </div>
);

const EsqueletoCalendario = () => (
  <Card padding="p-0" className="overflow-hidden xl:col-span-8">
    <div className="flex items-center justify-between border-b border-separator/50 p-5">
      <Skeleton variant="bare" className="h-4 w-36" />
      <Skeleton variant="bare" className="h-9 w-48 rounded-control" />
    </div>
    <div className="p-3 sm:p-5">
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} variant="bare" className="mx-auto h-2.5 w-7" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} variant="bare" className="h-14 rounded-field sm:h-24 sm:rounded-control" />
        ))}
      </div>
    </div>
  </Card>
);

const EsqueletoActividad = () => (
  <Card padding="p-0" className="flex h-[24rem] flex-col overflow-hidden xl:col-span-4 xl:h-auto">
    <div className="border-b border-separator/50 p-5">
      <Skeleton variant="bare" className="h-4 w-28" />
    </div>
    <div className="space-y-4 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-control border border-separator/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton variant="bare" className="h-4 w-16 rounded-full" />
            <Skeleton variant="bare" className="h-3 w-12" />
          </div>
          <Skeleton variant="bare" className="h-3.5 w-3/4" />
          <Skeleton variant="bare" className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  </Card>
);

const Dashboard = () => {
  const { showAlert } = useAlert();
  const { user, isAdmin, puedeRecorridos, puedeRiegos } = useAuth();
  const { resolvedTheme } = useApp();
  const reduceMotion = useReducedMotion();
  const colors = PALETA_GRAFICO[resolvedTheme] || PALETA_GRAFICO.light;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [recorridoId, setRecorridoId] = useState(null);
  const [ninos, setNinos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [ninosSeleccionados, setNinosSeleccionados] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  // Se guarda lo que llega de la API sin tocar, y todo lo demás se deriva.
  // Antes se guardaba ya agrupado por día, así que el histórico de meses
  // habría necesitado una segunda copia de los mismos recorridos.
  const [recorridosTodos, setRecorridosTodos] = useState([]);
  const [riegosRango, setRiegosRango] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recorridoAEliminar, setRecorridoAEliminar] = useState(null);
  const [loadingRiegos, setLoadingRiegos] = useState(true);
  const [modalRiego, setModalRiego] = useState(false);
  // Los meses que este usuario ha terminado. Es una lista corta: se pide
  // entera una vez y se vuelve a pedir tras terminar o reabrir.
  const [cierres, setCierres] = useState([]);
  const [accionMes, setAccionMes] = useState(null);    // 'terminar' | 'reabrir'
  const [ocupadoMes, setOcupadoMes] = useState(false);
  // Se incrementa tras registrar un riego para que el efecto vuelva a pedirlos.
  const [refrescoRiegos, setRefrescoRiegos] = useState(0);

  const [formData, setFormData] = useState({
    fecha: hoyISO(),
    hora_inicio: horaActual(),
    vehiculo_id: '',
    tipo_recorrido: 'traer',
    notas: '',
  });

  const loadRecorridosData = async () => {
    setLoading(true);
    try {
      // El dashboard agrega totales mensuales: necesita TODOS los recorridos.
      // El listado devuelve 50 por página, así que sin recorrerlas todas los
      // importes saldrían mal sin mostrar ningún error.
      setRecorridosTodos(await getAllRecorridos());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los recorridos: ' + mensajeDeError(error));
      setRecorridosTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      // Sin el permiso no se piden: el servidor responderia 403 y la pantalla
      // se llenaría de errores por algo que ya sabíamos de antemano.
      if (!puedeRecorridos) {
        setRecorridosTodos([]);
        setLoading(false);
        return;
      }

      try {
        const [recorridos, ninosData, vehiculosData] = await Promise.all([
          getAllRecorridos(), getAllNinos(), getAllVehiculos(),
        ]);
        setRecorridosTodos(recorridos);
        setNinos(ninosData);
        setVehiculos(vehiculosData);
      } catch (error) {
        showAlert('error', 'No se pudieron cargar los datos: ' + mensajeDeError(error));
        setRecorridosTodos([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    // Los recorridos llegan todos de una vez, así que cambiar de mes no obliga
    // a volver a pedirlos: el mes se aplica al derivar, más abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeRecorridos]);

  /* Los riegos se piden en su propia llamada a propósito: si esa falla, el
     resumen de recorridos se sigue viendo en lugar de quedarse en blanco.

     Se pide el rango entero del histórico, no solo el mes a la vista: con una
     llamada salen tanto el calendario del mes como las barras de los últimos
     meses. Pedirlos mes a mes serían seis llamadas para lo mismo. */
  useEffect(() => {
    let cancelado = false;

    const cargarRiegos = async () => {
      if (!puedeRiegos) {
        setRiegosRango([]);
        setLoadingRiegos(false);
        return;
      }

      setLoadingRiegos(true);
      try {
        const datos = await getAllRiegos(rangoDelHistorial(mesActual, anioActual));
        if (!cancelado) setRiegosRango(Array.isArray(datos) ? datos : []);
      } catch (error) {
        if (cancelado) return;
        setRiegosRango([]);
        showAlert('error', 'No se pudieron cargar los riegos: ' + mensajeDeError(error));
      } finally {
        if (!cancelado) setLoadingRiegos(false);
      }
    };

    cargarRiegos();
    // Al cambiar de mes, la respuesta que iba en camino ya no vale.
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual, anioActual, refrescoRiegos, puedeRiegos]);

  const claveDelMes = `${anioActual}-${dosDigitos(mesActual)}`;

  const recorridosMensuales = useMemo(
    () => agruparPorDia(recorridosTodos, claveDelMes, 'hora_inicio'),
    [recorridosTodos, claveDelMes]
  );

  const riegosMensuales = useMemo(
    () => agruparPorDia(riegosRango, claveDelMes, 'hora'),
    [riegosRango, claveDelMes]
  );

  const { diasConRecorridos, totalRecorridosMes, costoRecorridos } = useMemo(() => {
    const allRecorridos = Object.values(recorridosMensuales).flat();
    return {
      totalRecorridosMes: allRecorridos.length,
      diasConRecorridos: Object.keys(recorridosMensuales).length,
      costoRecorridos: allRecorridos.reduce((acc, r) => acc + importe(r), 0),
    };
  }, [recorridosMensuales]);

  const { totalRiegosMes, costoRiegos, diasConRiegos } = useMemo(() => {
    const todos = Object.values(riegosMensuales).flat();
    return {
      totalRiegosMes: todos.length,
      diasConRiegos: Object.keys(riegosMensuales).length,
      costoRiegos: todos.reduce((acc, r) => acc + importe(r), 0),
    };
  }, [riegosMensuales]);

  /**
   * Gasto de los últimos meses, del más antiguo al mes a la vista.
   *
   * Solo se suma lo que la cuenta puede ver: si no tiene riegos, sus barras no
   * deben incluir un dinero que en ninguna otra parte de la pantalla aparece.
   */
  const resumenMeses = useMemo(() => {
    const filas = [];

    for (let atras = MESES_DE_HISTORIAL - 1; atras >= 0; atras -= 1) {
      const fecha = new Date(anioActual, mesActual - 1 - atras, 1);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();
      const clave = `${anio}-${dosDigitos(mes)}`;

      const recorridos = puedeRecorridos ? sumarDelMes(recorridosTodos, clave) : 0;
      const riegos = puedeRiegos ? sumarDelMes(riegosRango, clave) : 0;

      filas.push({
        clave,
        etiqueta: nombresMeses[mes - 1].slice(0, 3),
        nombre: nombresMeses[mes - 1],
        anio,
        recorridos,
        riegos,
        total: recorridos + riegos,
        esActual: atras === 0,
      });
    }

    return filas;
  }, [recorridosTodos, riegosRango, mesActual, anioActual, puedeRecorridos, puedeRiegos]);

  const gastoTotalMes = costoRecorridos + costoRiegos;
  const gastoMesAnterior = resumenMeses.at(-2)?.total ?? 0;

  /* Sin gasto el mes pasado no hay porcentaje que calcular: un "+∞ %" no dice
     nada. En ese caso la tarjeta simplemente no muestra comparación. */
  const variacion = gastoMesAnterior > 0
    ? ((gastoTotalMes - gastoMesAnterior) / gastoMesAnterior) * 100
    : null;

  const cargando = loading || loadingRiegos;

  /**
   * Liquidación del transporte del mes: por cada vehículo, cuánto se cobró y
   * cuánto de eso es del auto y cuánto del chofer.
   *
   * El reparto de cada recorrido lo calcula el servidor a partir del trato
   * del vehículo. Si la API todavía no lo envía (la vista previa habla con la
   * API de producción, que aún no lo tiene), la tarjeta no se muestra: unos
   * ceros que parecen reales serían peor que no enseñar nada.
   */
  const liquidacion = useMemo(() => {
    const lista = Object.values(recorridosMensuales).flat();
    const disponible = lista.length > 0 && lista.every((r) => r.parte_auto !== undefined);
    if (!disponible) return { disponible: false, filas: [], auto: 0, chofer: 0 };

    const porVehiculo = new Map();
    lista.forEach((r) => {
      const clave = r.vehiculo_id ?? 'sin-vehiculo';
      const fila = porVehiculo.get(clave) ?? {
        clave,
        vehiculoId: r.vehiculo_id,
        descripcion: r.vehiculo_descripcion || 'Sin vehículo',
        placa: r.vehiculo_placa || '',
        recorridos: [],
        viajes: 0, cobrado: 0, auto: 0, chofer: 0,
      };
      fila.recorridos.push(r);
      fila.viajes += 1;
      fila.cobrado += importe(r);
      fila.auto += parseFloat(r.parte_auto) || 0;
      fila.chofer += parseFloat(r.parte_chofer) || 0;
      porVehiculo.set(clave, fila);
    });

    const filas = [...porVehiculo.values()].sort((a, b) => b.cobrado - a.cobrado);
    return {
      disponible: true,
      filas,
      auto: filas.reduce((s, f) => s + f.auto, 0),
      chofer: filas.reduce((s, f) => s + f.chofer, 0),
    };
  }, [recorridosMensuales]);

  /** El documento para entregar al dueño de un auto: solo lo suyo. */
  const exportarLiquidacion = async (fila) => {
    try {
      await generarLiquidacionPdf({
        vehiculo: { descripcion: fila.descripcion, placa: fila.placa },
        recorridos: fila.recorridos,
        mes: mesActual,
        anio: anioActual,
        usuario: { nombre: user?.nombre, usuario: user?.usuario },
      });
      showAlert('success', `Liquidación de ${fila.descripcion} generada`);
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo generar la liquidación');
    }
  };

  /**
   * Lo registrado en un día, recorridos y riegos juntos, del más reciente al
   * más antiguo. Antes iban primero todos los recorridos por la mañana y
   * luego los riegos, así que un riego de las 17:30 salía debajo de un
   * recorrido de las 06:45.
   */
  const registrosDelDia = (dia) => [
    ...(recorridosMensuales[dia] || []).map((registro) => ({
      tipo: 'recorrido', registro, hora: String(registro.hora_inicio ?? ''), clave: `recorrido-${registro.id}`,
    })),
    ...(riegosMensuales[dia] || []).map((registro) => ({
      tipo: 'riego', registro, hora: String(registro.hora ?? ''), clave: `riego-${registro.id}`,
    })),
  ].sort((a, b) => b.hora.localeCompare(a.hora));

  /** Días del mes con algo registrado, venga de donde venga. */
  const diasConActividad = useMemo(() => (
    [...new Set([...Object.keys(recorridosMensuales), ...Object.keys(riegosMensuales)])]
      .map((dia) => parseInt(dia, 10))
      .filter((dia) => !Number.isNaN(dia))
      .sort((a, b) => b - a)
  ), [recorridosMensuales, riegosMensuales]);

  const cambiarMes = (delta) => {
    haptics.tick();
    let nuevoMes = mesActual + delta;
    let nuevoAnio = anioActual;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio += 1; }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio -= 1; }
    setMesActual(nuevoMes);
    setAnioActual(nuevoAnio);
  };

  const refreshCatalogs = async () => {
    const [ninosData, vehiculosData] = await Promise.all([getAllNinos(), getAllVehiculos()]);
    setNinos(ninosData);
    setVehiculos(vehiculosData);
  };

  const resetForm = () => {
    setFormData({
      fecha: hoyISO(),
      hora_inicio: horaActual(),
      vehiculo_id: '',
      tipo_recorrido: 'traer',
      notas: '',
    });
    setNinosSeleccionados([]);
    setEditando(false);
    setRecorridoId(null);
  };

  const handleOpenModal = async () => {
    resetForm();
    setLoadingForm(true);
    setIsModalOpen(true);
    try {
      await refreshCatalogs();
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los catálogos: ' + mensajeDeError(error));
    } finally {
      setLoadingForm(false);
    }
  };

  const handleCloseModal = (shouldReload = false) => {
    setIsModalOpen(false);
    resetForm();
    if (shouldReload) loadRecorridosData();
  };

  const handleChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const agregarNino = (event) => {
    const ninoId = event.target.value;
    if (!ninoId) return;
    const nino = ninos.find((n) => n.id.toString() === ninoId.toString());
    if (!nino || ninosSeleccionados.some((n) => n.nino_id.toString() === ninoId.toString())) return;

    haptics.tick();
    setNinosSeleccionados([...ninosSeleccionados, {
      nino_id: ninoId, nombre: nino.nombre, apellidos: nino.apellidos, notas: '',
    }]);
    event.target.value = '';
  };

  const eliminarNino = (index) => {
    setNinosSeleccionados(ninosSeleccionados.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.fecha || !formData.hora_inicio || !formData.vehiculo_id) {
      showAlert('warning', 'Fecha, hora y vehículo son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const data = { ...formData, notas: formData.notas || null, ninos: ninosSeleccionados };
      const response = editando
        ? await updateRecorrido(recorridoId, data)
        : await createRecorrido(data);

      if (fueBien(response)) {
        showAlert('success', editando ? 'Recorrido actualizado' : 'Recorrido registrado');
        handleCloseModal(true);
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo guardar: ' + mensajeDeError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!recorridoAEliminar) return;
    try {
      const response = await deleteRecorrido(recorridoAEliminar);
      if (fueBien(response)) {
        showAlert('success', 'Recorrido eliminado');
        loadRecorridosData();
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setShowDeleteModal(false);
      setRecorridoAEliminar(null);
    }
  };

  /**
   * Estado de cuenta del mes en PDF.
   *
   * El armado vive en lib/reportePdf.js: son 200 líneas de maquetación que no
   * tienen nada que ver con esta pantalla y la hacían aún más larga.
   */
  const exportarPDF = async () => {
    try {
      // El módulo trabaja con una lista plana; aquí los recorridos están
      // agrupados por día para pintar el calendario.
      const planos = Object.entries(recorridosMensuales)
        .filter(([dia]) => !Number.isNaN(parseInt(dia, 10)))
        .flatMap(([dia, lista]) => lista.map((r) => ({ ...r, _dia: parseInt(dia, 10) })));

      if (planos.length === 0) {
        showAlert('warning', 'No hay recorridos en este mes para exportar');
        return;
      }

      await generarReportePdf({
        recorridos: planos,
        mes: mesActual,
        anio: anioActual,
        usuario: { nombre: user?.nombre, usuario: user?.usuario },
      });
      showAlert('success', 'Estado de cuenta generado');
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo generar el PDF');
    }
  };

  /**
   * Un único documento cuando la cuenta usa los dos servicios.
   *
   * Dos PDF sueltos obligaban a sumarlos a mano para saber cuánto se paga en
   * total, que es justo lo que el papel tiene que contestar.
   */
  const exportarGeneralPDF = async () => {
    try {
      const losRecorridos = Object.values(recorridosMensuales).flat();
      const losRiegos = Object.values(riegosMensuales).flat();

      if (losRecorridos.length === 0 && losRiegos.length === 0) {
        showAlert('warning', 'No hay nada registrado en este mes para exportar');
        return;
      }

      await generarReporteGeneralPdf({
        recorridos: losRecorridos,
        riegos: losRiegos,
        mes: mesActual,
        anio: anioActual,
        usuario: { nombre: user?.nombre, usuario: user?.usuario },
      });
      showAlert('success', 'Estado de cuenta general generado');
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo generar el PDF');
    }
  };

  /** Los riegos del mes en su propio PDF, con el mismo formato que su pantalla. */
  const exportarRiegosPDF = async () => {
    try {
      const planos = Object.values(riegosMensuales).flat().sort((a, b) => (
        a.fecha === b.fecha
          ? String(a.hora).localeCompare(String(b.hora))
          : String(a.fecha).localeCompare(String(b.fecha))
      ));

      if (planos.length === 0) {
        showAlert('warning', 'No hay riegos en este mes para exportar');
        return;
      }

      await generarReporteRiegosPdf({
        riegos: planos,
        mes: mesActual,
        anio: anioActual,
        usuario: { nombre: user?.nombre, usuario: user?.usuario },
      });
      showAlert('success', 'Reporte de riegos generado');
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo generar el PDF de riegos');
    }
  };

  const ninosDisponibles = (ninos || []).filter(
    (n) => !ninosSeleccionados.some((sel) => sel.nino_id?.toString() === n.id?.toString())
  );

  /* ── Cierre del mes a la vista ─────────────────────────────────────────── */
  const cargarCierres = async () => {
    try {
      const { data } = await getCierres();
      setCierres(data.data || []);
    } catch {
      // Sin la lista, el mes se presenta como abierto; el servidor sigue
      // bloqueando lo que esté cerrado de verdad.
      setCierres([]);
    }
  };

  useEffect(() => { cargarCierres(); }, []);

  const cierreDelMes = cierres.find((c) => c.anio === anioActual && c.mes === mesActual) ?? null;
  const mesCerrado = ['terminado', 'cobrado'].includes(cierreDelMes?.estado);

  const hoy = new Date();
  const esMesActual = anioActual === hoy.getFullYear() && mesActual === hoy.getMonth() + 1;
  const esMesFuturo = anioActual > hoy.getFullYear()
    || (anioActual === hoy.getFullYear() && mesActual > hoy.getMonth() + 1);

  const confirmarAccionMes = async () => {
    setOcupadoMes(true);
    try {
      const respuesta = accionMes === 'terminar'
        ? await terminarMes(anioActual, mesActual)
        : await reabrirMes(anioActual, mesActual);
      if (fueBien(respuesta)) {
        showAlert('success', respuesta.data?.mensaje
          || (accionMes === 'terminar' ? 'Mes terminado' : 'Mes reabierto'));
        await cargarCierres();
      } else {
        showAlert('error', mensajeDeRespuesta(respuesta));
      }
    } catch (error) {
      showAlert('error', mensajeDeError(error));
    } finally {
      setOcupadoMes(false);
      setAccionMes(null);
    }
  };

  /* ── Cifras del tablero ─────────────────────────────────────────────────── */
  const mesAnterior = resumenMeses.at(-2);
  const nombreMesAnterior = mesAnterior?.nombre.toLowerCase() ?? 'el mes anterior';

  /** Lo mismo del mes anterior, para que cada cifra diga si sube o baja. */
  const { recorridosAnterior, riegosAnterior, diasAnterior } = useMemo(() => {
    const clave = mesAnterior?.clave;
    if (!clave) return { recorridosAnterior: 0, riegosAnterior: 0, diasAnterior: 0 };
    const recorridos = puedeRecorridos ? recorridosTodos.filter((r) => claveDeMes(r?.fecha) === clave) : [];
    const riegos = puedeRiegos ? riegosRango.filter((r) => claveDeMes(r?.fecha) === clave) : [];
    return {
      recorridosAnterior: recorridos.length,
      riegosAnterior: riegos.length,
      diasAnterior: new Set([...recorridos, ...riegos].map((r) => diaDeFecha(r.fecha))).size,
    };
  }, [recorridosTodos, riegosRango, mesAnterior?.clave, puedeRecorridos, puedeRiegos]);

  /*
   * Tres cifras siempre, como en un tablero. Si la cuenta no tiene uno de los
   * dos servicios, su hueco lo ocupa "días con actividad" en vez de dejar una
   * fila coja.
   */
  const kpis = [
    {
      clave: 'gasto', icono: Wallet, etiqueta: 'Gasto del mes',
      valor: dinero.format(gastoTotalMes),
      tendencia: tendenciaDeGasto(variacion, nombreMesAnterior),
    },
    puedeRecorridos && {
      clave: 'recorridos', icono: RouteIcon, etiqueta: 'Recorridos',
      valor: totalRecorridosMes,
      tendencia: tendenciaDeCuenta(totalRecorridosMes, recorridosAnterior, nombreMesAnterior),
    },
    puedeRiegos && {
      clave: 'riegos', icono: Droplets, etiqueta: 'Riegos',
      valor: totalRiegosMes,
      tendencia: tendenciaDeCuenta(totalRiegosMes, riegosAnterior, nombreMesAnterior),
    },
  ].filter(Boolean);
  if (kpis.length < 3) {
    kpis.push({
      clave: 'dias', icono: CalendarCheck, etiqueta: 'Días con actividad',
      valor: diasConActividad.length,
      tendencia: tendenciaDeCuenta(diasConActividad.length, diasAnterior, nombreMesAnterior),
    });
  }

  const tiposDelMes = useMemo(() => {
    const cuenta = { traer: 0, llevar: 0 };
    Object.values(recorridosMensuales).flat().forEach((r) => {
      if (r.tipo_recorrido in cuenta) cuenta[r.tipo_recorrido] += 1;
    });
    // Mismos nombres que la leyenda del cronograma, que está en esta misma pantalla.
    return [
      { clave: 'traer', etiqueta: tipoLabel.traer, cuenta: cuenta.traer },
      { clave: 'llevar', etiqueta: tipoLabel.llevar, cuenta: cuenta.llevar },
    ];
  }, [recorridosMensuales]);

  /**
   * El día con más registros; si empatan, el primero, y cuántos empatan.
   * Presentar como "el más activo" un día que empata con otros cinco sería
   * cierto y no diría nada, así que el aviso cambia la frase en ese caso.
   */
  const diaMasActivo = useMemo(() => {
    let mejor = null;
    let empates = 0;
    diasConActividad.forEach((dia) => {
      const n = (recorridosMensuales[dia]?.length ?? 0) + (riegosMensuales[dia]?.length ?? 0);
      if (!mejor || n > mejor.n) { mejor = { dia, n }; empates = 1; }
      else if (n === mejor.n) { empates += 1; if (dia < mejor.dia) mejor = { dia, n }; }
    });
    return mejor && { ...mejor, empates };
  }, [diasConActividad, recorridosMensuales, riegosMensuales]);

  const registrosDelMes = totalRecorridosMes + totalRiegosMes;
  const nombreMes = nombresMeses[mesActual - 1].toLowerCase();

  const irA = (id) => document.getElementById(id)?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth', block: 'start',
  });

  return (
    <div className="pb-4">
      {/* ── Cabecera ────────────────────────────────────────────────────────
          El título con la fecha de hoy al lado, y a la derecha lo que
          gobierna la pantalla: el mes y las acciones. */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-large-title font-bold tracking-tight text-label sm:text-[2.5rem] sm:leading-[1.1]">
            Resumen
          </h1>
          <span className="flex items-center gap-2 rounded-full border border-separator/70 bg-surface px-3.5 py-1.5 text-footnote text-label-secondary">
            <CalendarIcon size={14} strokeWidth={2} aria-hidden="true" />
            Hoy, {fechaDeHoy.format(new Date())}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* El mes gobierna toda la pantalla —cifras, barras y calendario—,
              así que vive en la cabecera y no dentro de una tarjeta. */}
          <SelectorDeMes mes={mesActual} anio={anioActual} onCambiar={cambiarMes} />

          {/* Con los dos servicios se emite UN documento con su total; con
              uno solo, el informe propio de ese servicio. */}
          {puedeRecorridos && puedeRiegos ? (
            <Button
              variant="secondary" className="!rounded-full" onClick={exportarGeneralPDF}
              disabled={cargando || (totalRecorridosMes === 0 && totalRiegosMes === 0)}
              icon={<FileDown size={16} strokeWidth={2.1} />}
            >
              PDF del mes
            </Button>
          ) : puedeRecorridos ? (
            <Button
              variant="secondary" className="!rounded-full" onClick={exportarPDF}
              disabled={loading || totalRecorridosMes === 0}
              icon={<FileDown size={16} strokeWidth={2.1} />}
            >
              PDF recorridos
            </Button>
          ) : (
            <Button
              variant="secondary" className="!rounded-full" onClick={exportarRiegosPDF}
              disabled={loadingRiegos || totalRiegosMes === 0}
              icon={<FileDown size={16} strokeWidth={2.1} />}
            >
              PDF riegos
            </Button>
          )}
          {puedeRiegos && (
            <Button
              variant="secondary" className="!rounded-full" onClick={() => setModalRiego(true)}
              icon={<Plus size={17} strokeWidth={2.3} />}
            >
              Nuevo riego
            </Button>
          )}
          {puedeRecorridos && (
            <Button className="!rounded-full" onClick={handleOpenModal} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo recorrido
            </Button>
          )}
        </div>
      </div>

      {/* ── En qué punto está el mes ─────────────────────────────────────────── */}
      <EstadoDelMes
        nombreMes={`${nombresMeses[mesActual - 1].toLowerCase()} de ${anioActual}`}
        cierre={cierreDelMes}
        esActual={esMesActual}
        esFuturo={esMesFuturo}
        esAdmin={isAdmin}
        ocupado={ocupadoMes}
        onTerminar={() => setAccionMes('terminar')}
        onReabrir={() => setAccionMes('reabrir')}
      />

      {/* ── Cifras ──────────────────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cargando
          ? [0, 1, 2].map((i) => <EsqueletoKpi key={i} />)
          : kpis.map(({ clave, ...kpi }, i) => (
            // En tableta van dos columnas: el gasto ocupa la fila entera y las
            // otras dos quedan juntas debajo, en vez de una sola a medias.
            <Kpi key={clave} {...kpi} className={i === 0 ? 'sm:col-span-2 xl:col-span-1' : ''} />
          ))}
      </div>

      {/* ── Gasto por mes y tipos de recorrido ──────────────────────────────── */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className={puedeRecorridos ? 'xl:col-span-7' : 'xl:col-span-12'}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title3 font-semibold text-label">Gasto por mes</h2>
            <span className="rounded-full border border-separator/70 px-3 py-1 text-footnote text-label-secondary">
              Últimos {MESES_DE_HISTORIAL} meses
            </span>
          </div>
          {cargando ? <EsqueletoBarras /> : (
            <GraficoMeses
              meses={resumenMeses}
              colores={colors}
              puedeRecorridos={puedeRecorridos}
              puedeRiegos={puedeRiegos}
              reduceMotion={reduceMotion}
              leyenda={
                puedeRecorridos && puedeRiegos
                  ? [
                    { etiqueta: 'Recorridos', valor: dinero.format(costoRecorridos), color: colors.recorridos },
                    { etiqueta: 'Riegos', valor: dinero.format(costoRiegos), color: colors.riegos },
                    // Etiquetas cortas: en el móvil van tres en fila. El mes ya está en la cabecera.
                    { etiqueta: 'Total', valor: dinero.format(gastoTotalMes) },
                  ]
                  : [
                    {
                      etiqueta: 'Este mes',
                      valor: dinero.format(gastoTotalMes),
                      color: puedeRecorridos ? colors.recorridos : colors.riegos,
                    },
                    {
                      etiqueta: 'Promedio',
                      valor: dinero.format(resumenMeses.reduce((t, m) => t + m.total, 0) / resumenMeses.length),
                    },
                  ]
              }
            />
          )}
        </Card>

        {puedeRecorridos && (
          <Card className="xl:col-span-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-title3 font-semibold text-label">Tipos de recorrido</h2>
              <span className="flex items-center gap-1.5 rounded-full border border-separator/70 px-3 py-1 text-footnote text-label-secondary">
                <CalendarIcon size={13} strokeWidth={2} aria-hidden="true" />
                {nombresMeses[mesActual - 1]} {anioActual}
              </span>
            </div>
            {cargando ? <EsqueletoBarras alto="h-56" /> : totalRecorridosMes > 0 ? (
              <BurbujasTipos tipos={tiposDelMes} />
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-fill/10 text-label-tertiary">
                  <RouteIcon size={22} strokeWidth={1.9} />
                </span>
                <p className="text-subhead text-label-secondary">Sin recorridos en {nombreMes}</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Avisos: dos frases que resumen el mes ───────────────────────────── */}
      {!cargando && (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Aviso
            icono={PieChart}
            accion={<TrendingUp size={20} strokeWidth={2} className="shrink-0 text-label-secondary" aria-hidden="true" />}
          >
            {diaMasActivo && diaMasActivo.empates === 1 ? (
              <>
                El <span className="font-semibold text-label">{diaMasActivo.dia} de {nombreMes}</span> fue
                el día con más actividad: {diaMasActivo.n} {diaMasActivo.n === 1 ? 'registro' : 'registros'}.
              </>
            ) : diaMasActivo ? (
              <>
                Tu día más movido tuvo{' '}
                <span className="font-semibold text-label">
                  {diaMasActivo.n} {diaMasActivo.n === 1 ? 'registro' : 'registros'}
                </span>
                , y hubo {diaMasActivo.empates} días así en {nombreMes}.
              </>
            ) : (
              <>Todavía no hay actividad en {nombreMes}.</>
            )}
          </Aviso>

          {/* Si hay algo que entregar a los autos, eso es lo que hay que
              saber; si no, cuánto se ha registrado. La flecha lleva a donde
              está el detalle de cada cosa. */}
          {liquidacion.disponible && liquidacion.auto > 0 ? (
            <Aviso
              icono={HandCoins}
              accion={
                <button
                  type="button" onClick={() => irA('liquidacion')}
                  aria-label="Ver la liquidación por vehículo"
                  className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-label text-canvas transition-opacity hover:opacity-85"
                >
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              }
            >
              Este mes entregas <span className="tabular font-semibold text-label">{dinero.format(liquidacion.auto)}</span> a
              los autos y te quedan <span className="tabular font-semibold text-label">{dinero.format(liquidacion.chofer)}</span>.
            </Aviso>
          ) : (
            <Aviso
              icono={BarChart3}
              accion={
                <button
                  type="button" onClick={() => irA('cronograma')}
                  aria-label="Ver el cronograma del mes"
                  className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-label text-canvas transition-opacity hover:opacity-85"
                >
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              }
            >
              <span className="tabular font-semibold text-label">
                {registrosDelMes} {registrosDelMes === 1 ? 'registro' : 'registros'}
              </span> en {nombreMes}, repartidos en {diasConActividad.length}{' '}
              {diasConActividad.length === 1 ? 'día' : 'días'}.
            </Aviso>
          )}
        </div>
      )}

      {/* ── Vehículos del mes ───────────────────────────────────────────────
          Qué dio cada carro y cuánto hay que entregarle a su dueño. Solo con
          recorridos, que es donde intervienen los autos. */}
      {puedeRecorridos && !cargando && liquidacion.disponible && liquidacion.filas.length > 0 && (
        <section id="liquidacion" aria-label="Vehículos del mes" className="mb-6 scroll-mt-24">
          {/* Con dos vehículos, dos columnas: una tercera vacía dejaría un
              hueco que parece que falta algo. */}
          <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
            liquidacion.filas.length === 2 ? '' : 'xl:grid-cols-3'
          }`}>
            {liquidacion.filas.map((fila) => (
              <TarjetaVehiculo
                key={fila.clave}
                nombre={fila.descripcion}
                estado={fila.auto > 0 ? 'Cobra' : 'No cobra'}
                estadoActivo={fila.auto > 0}
                subtitulo={`${fila.viajes} ${fila.viajes === 1 ? 'viaje' : 'viajes'} · ${
                  fila.auto > 0 ? `entregas ${dinero.format(fila.auto)}` : 'todo para el chofer'
                }`}
                accion={fila.auto > 0 ? (
                  <button
                    type="button" onClick={() => exportarLiquidacion(fila)}
                    aria-label={`Descargar la liquidación de ${fila.descripcion}`}
                    className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-separator/70 text-label-secondary transition-colors hover:bg-fill/10 hover:text-label"
                  >
                    <FileDown size={16} strokeWidth={2.1} />
                  </button>
                ) : (
                  <Link
                    to="/vehiculos"
                    aria-label={`Configurar el reparto de ${fila.descripcion}`}
                    className="tappable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-separator/70 text-label-secondary transition-colors hover:bg-fill/10 hover:text-label"
                  >
                    <ChevronRight size={16} strokeWidth={2.2} />
                  </Link>
                )}
              />
            ))}
          </div>
        </section>
      )}

      {/* Calendario + actividad: recorridos y riegos sobre el mismo mes */}
      <div id="cronograma" className="scroll-mt-24" />
      {cargando ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <EsqueletoCalendario />
          <EsqueletoActividad />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

          {/* Calendario */}
          <Card padding="p-0" className="overflow-hidden xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator/50 p-5">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} strokeWidth={2.1} className="text-accent" />
                <h2 className="text-headline font-semibold text-label">Cronograma</h2>
              </div>
              <p className="text-footnote text-label-secondary">
                {nombresMeses[mesActual - 1]} {anioActual}
              </p>
            </div>

            {/* En el móvil la casilla solo tiene puntos de color, así que la
                leyenda es la única forma de leerlos. Va cada tipo por separado
                porque los recorridos ya se pintan según sean de traer o de
                llevar: una sola entrada "Recorridos" mentiría sobre el color. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-separator/40 px-5 py-3">
              {LEYENDA
                .filter(({ modulo }) => (modulo === 'riegos' ? puedeRiegos : puedeRecorridos))
                .map(({ color, texto }) => (
                  <span key={texto} className="flex items-center gap-1.5 text-footnote text-label-secondary">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${color}`} />
                    {texto}
                  </span>
                ))}
            </div>

            <div className="p-3 sm:p-5">
              <CalendarioMes
                mes={mesActual}
                anio={anioActual}
                renderDia={(numero) => {
                  const recorridosDelDia = recorridosMensuales[numero] || [];
                  const riegosDelDia = riegosMensuales[numero] || [];
                  if (recorridosDelDia.length === 0 && riegosDelDia.length === 0) return null;

                  return (
                    <>
                      {/* Móvil: puntos. Escritorio: las etiquetas completas. */}
                      <div className="mt-auto flex flex-wrap justify-center gap-0.5 sm:hidden">
                        {recorridosDelDia.slice(0, 3).map((recorrido, i) => (
                          <span
                            key={`recorrido-${i}`}
                            className={`h-1.5 w-1.5 rounded-full ${
                              recorrido.tipo_recorrido === 'traer' ? 'bg-positive'
                                : recorrido.tipo_recorrido === 'llevar' ? 'bg-caution' : 'bg-accent'
                            }`}
                          />
                        ))}
                        {riegosDelDia.slice(0, 2).map((riego, i) => (
                          <span key={`riego-${i}`} className="h-1.5 w-1.5 rounded-full bg-info" />
                        ))}
                      </div>

                      <div className="scroll-area mt-1 hidden flex-1 space-y-1 sm:block">
                        {recorridosDelDia.map((recorrido, i) => (
                          <p
                            key={`recorrido-${i}`}
                            title={recorrido.vehiculo_descripcion}
                            className={`truncate rounded px-1.5 py-0.5 text-caption2 font-medium ${
                              recorrido.tipo_recorrido === 'traer' ? 'bg-positive/14 text-positive'
                                : recorrido.tipo_recorrido === 'llevar' ? 'bg-caution/16 text-caution'
                                  : 'bg-accent/12 text-accent'
                            }`}
                          >
                            {recorrido.vehiculo_descripcion || 'Sin unidad'}
                          </p>
                        ))}
                        {riegosDelDia.map((riego, i) => (
                          <p
                            key={`riego-${i}`}
                            className="tabular truncate rounded bg-info/12 px-1.5 py-0.5 text-caption2 font-medium text-info"
                          >
                            Riego {formatearHora(riego.hora)}
                          </p>
                        ))}
                      </div>

                      <span className="sr-only">
                        {recorridosDelDia.length} recorridos, {riegosDelDia.length} riegos
                      </span>
                    </>
                  );
                }}
              />
            </div>
          </Card>

          {/* Actividad reciente */}
          {/* Al lado del calendario (xl) mide exactamente lo mismo que él: la
              fila de la rejilla estira la tarjeta, y la lista va en una capa
              absoluta que no empuja la altura, así que manda el calendario y
              lo que sobra se desplaza dentro. Antes tenía un alto fijo y se
              quedaba corta, con un hueco debajo.
              Apilado, en teléfono y tableta, crece con su contenido: una lista
              que se desplaza dentro de una página que también se desplaza
              atrapa el dedo en la que no toca. */}
          <Card padding="p-0" className="flex flex-col overflow-hidden xl:col-span-4">
            <div className="flex items-center gap-2 border-b border-separator/50 p-5">
              <Clock size={17} strokeWidth={2.1} className="text-positive" />
              <h2 className="text-headline font-semibold text-label">Actividad</h2>
            </div>

            <div className="relative flex-1 xl:min-h-0">
            <div className="scroll-area space-y-5 p-4 xl:absolute xl:inset-0">
              {diasConActividad.length > 0 ? (
                diasConActividad.map((dia) => (
                  <section key={dia}>
                    <h3 className="mb-2 px-1 text-footnote font-medium text-label-secondary">
                      {dia} de {nombresMeses[mesActual - 1].toLowerCase()}
                    </h3>

                    <div className="space-y-2">
                      {registrosDelDia(dia).map(({ tipo, registro: recorrido, clave }) => {
                        // Los riegos se ven aquí, pero se editan en su pantalla:
                        // un mismo registro con dos sitios donde tocarlo acaba
                        // en dos comportamientos distintos.
                        if (tipo === 'riego') {
                          const riego = recorrido;
                          return (
                            <div
                              key={clave}
                              className="flex items-center justify-between gap-2 rounded-control border border-separator/50 bg-surface-secondary p-3"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-info/14 text-info">
                                  <Droplets size={15} strokeWidth={2} />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-subhead font-medium text-label">Riego</p>
                                  <p className="tabular text-footnote text-label-tertiary">
                                    {formatearHora(riego.hora)}
                                  </p>
                                </div>
                              </div>
                              <span className="tabular shrink-0 text-subhead font-medium text-label">
                                {dinero.format(parseFloat(riego.costo) || 0)}
                              </span>
                            </div>
                          );
                        }

                        const totalPasajeros = recorrido.total_ninos !== undefined
                          ? recorrido.total_ninos
                          : (recorrido.ninos?.length || 0);

                        return (
                          <div
                            key={clave}
                            className="rounded-control border border-separator/50 bg-surface-secondary p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <Badge tone={tipoTone[recorrido.tipo_recorrido] || 'neutral'}>
                                {tipoLabel[recorrido.tipo_recorrido] || recorrido.tipo_recorrido}
                              </Badge>
                              <span className="tabular flex items-center gap-1 text-footnote text-label-tertiary">
                                <Clock size={12} strokeWidth={2.2} />
                                {formatearHora(recorrido.hora_inicio)}
                              </span>
                            </div>

                            <p className="truncate text-subhead font-medium text-label">
                              {recorrido.vehiculo_descripcion || 'Sin unidad'}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between border-t border-separator/40 pt-2.5">
                              <span className="flex items-center gap-1.5 text-footnote text-label-secondary">
                                <Users size={13} strokeWidth={2.1} className="text-label-tertiary" />
                                {totalPasajeros} {totalPasajeros === 1 ? 'pasajero' : 'pasajeros'}
                              </span>
                              {/* En un mes terminado no se ofrece borrar: el
                                  servidor lo rechazaría. */}
                              {!mesCerrado && (
                                <button
                                  type="button"
                                  onClick={() => { setRecorridoAEliminar(recorrido.id); setShowDeleteModal(true); }}
                                  aria-label="Eliminar recorrido"
                                  className="tappable rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-critical/12 hover:text-critical"
                                >
                                  <Trash2 size={14} strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </section>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-fill/10 text-label-tertiary">
                    <CalendarIcon size={22} strokeWidth={1.9} />
                  </span>
                  <p className="text-subhead text-label-secondary">Sin actividad este mes</p>
                </div>
              )}
            </div>
            </div>
          </Card>
        </div>
      )}

      {/* Formulario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => handleCloseModal(false)}
        title={editando ? 'Editar recorrido' : 'Nuevo recorrido'}
        size="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => handleCloseModal(false)}>Cancelar</Button>
            <Button type="submit" form="form-dashboard-recorrido" loading={saving} disabled={loadingForm}>
              {editando ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        }
      >
        {loadingForm ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton variant="text" className="h-16 w-full" />
              <Skeleton variant="text" className="h-16 w-full" />
              <Skeleton variant="text" className="h-16 w-full" />
              <Skeleton variant="text" className="h-16 w-full" />
            </div>
            <Skeleton variant="text" className="h-16 w-full" />
          </div>
        ) : (
          <form id="form-dashboard-recorrido" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Fecha" type="date" name="fecha" value={formData.fecha} onChange={handleChange} required disabled={saving} />
              <Input label="Hora de salida" type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required disabled={saving} />
              <Select label="Vehículo" name="vehiculo_id" value={formData.vehiculo_id} onChange={handleChange} required disabled={saving}>
                <option value="">Seleccionar…</option>
                {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.descripcion}</option>)}
              </Select>
              <Select label="Tipo de servicio" name="tipo_recorrido" value={formData.tipo_recorrido} onChange={handleChange} required disabled={saving}>
                <option value="traer">Traer estudiantes</option>
                <option value="llevar">Llevar estudiantes</option>
              </Select>
            </div>

            <Input
              label="Notas" name="notas" value={formData.notas} onChange={handleChange}
              placeholder="Tráfico, desvíos o novedades…" disabled={saving}
            />

            <div className="border-t border-separator/50 pt-4">
              <Select
                label={`Pasajeros (${ninosSeleccionados.length})`}
                onChange={agregarNino} value=""
                disabled={saving || ninosDisponibles.length === 0}
                hint={ninosDisponibles.length === 0 ? 'No quedan estudiantes por asignar' : undefined}
              >
                <option value="">Añadir estudiante…</option>
                {ninosDisponibles.map((n) => (
                  <option key={n.id} value={n.id}>{n.nombre} {n.apellidos}</option>
                ))}
              </Select>

              <div className="scroll-area mt-3 grid max-h-48 grid-cols-1 gap-2 sm:grid-cols-2">
                {ninosSeleccionados.map((nino, index) => (
                  <div
                    key={nino.nino_id}
                    className="flex items-center justify-between gap-2 rounded-control border border-separator/60 bg-surface-secondary p-2 pl-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill/12 text-caption font-semibold text-label-secondary">
                        {nino.nombre?.charAt(0) || '?'}
                      </span>
                      <span className="truncate text-footnote font-medium text-label">
                        {nino.nombre} {nino.apellidos}
                      </span>
                    </div>
                    <button
                      type="button" onClick={() => eliminarNino(index)}
                      aria-label={`Quitar a ${nino.nombre}`}
                      className="tappable shrink-0 rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-critical/12 hover:text-critical"
                    >
                      <Trash2 size={13} strokeWidth={2.1} />
                    </button>
                  </div>
                ))}

                {ninosSeleccionados.length === 0 && (
                  <p className="rounded-control border border-dashed border-separator/70 px-4 py-6 text-center text-footnote text-label-tertiary sm:col-span-2">
                    Todavía no hay pasajeros
                  </p>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Eliminar recorrido"
        message="Este registro se borrará de forma permanente. No se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Terminar y reabrir piden confirmación: los dos cambian qué se puede
          hacer con un mes entero. Reabrir uno cobrado avisa de lo que implica. */}
      <ConfirmModal
        isOpen={Boolean(accionMes)}
        onClose={() => setAccionMes(null)}
        onConfirm={confirmarAccionMes}
        loading={ocupadoMes}
        type={accionMes === 'reabrir' && cierreDelMes?.estado === 'cobrado' ? 'warning' : 'info'}
        title={accionMes === 'terminar'
          ? `Terminar ${nombresMeses[mesActual - 1].toLowerCase()}`
          : `Reabrir ${nombresMeses[mesActual - 1].toLowerCase()}`}
        confirmText={accionMes === 'terminar' ? 'Terminar mes' : 'Reabrir mes'}
        message={accionMes === 'terminar'
          ? `Ya no se podrá añadir, cambiar ni borrar nada de ${nombresMeses[mesActual - 1].toLowerCase()}. Si te equivocas, podrás reabrirlo.`
          : cierreDelMes?.estado === 'cobrado'
            ? `Este mes ya está cobrado (${dinero.format(Number(cierreDelMes.total_cobrado))}). Si lo reabres y cambias algo, lo registrado dejará de coincidir con lo cobrado, y el administrador lo verá.`
            : 'Volverás a poder modificarlo. Mientras esté abierto no se puede cobrar.'}
      />

      <RiegoModal
        abierto={modalRiego}
        onCerrar={() => setModalRiego(false)}
        onGuardado={() => setRefrescoRiegos((n) => n + 1)}
      />
    </div>
  );
};

export default Dashboard;
