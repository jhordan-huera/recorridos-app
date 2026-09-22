import React, { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Users, Route as RouteIcon, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, Trash2, Plus, Droplets, FileDown,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { generarReportePdf } from '../lib/reportePdf';
import { generarReporteRiegosPdf } from '../lib/reporteRiegosPdf.js';
import { generarReporteGeneralPdf } from '../lib/reporteGeneralPdf.js';
import { useApp } from '../context/AppContext';
import {
  createRecorrido, updateRecorrido, deleteRecorrido,
  getAllRecorridos, getAllNinos, getAllVehiculos, getAllRiegos,
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
import PageHeader from '../components/ui/PageHeader';
import CalendarioMes from '../components/ui/CalendarioMes';
import RiegoModal from '../components/RiegoModal';
import { MESES as nombresMeses, rangoDelMes, diaDeFecha, dosDigitos, hoyISO, horaActual } from '../lib/fechas';
import { springSnappy, haptics } from '../lib/motion';

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

/** Rango que cubre el histórico completo, para pedirlo en una sola llamada. */
const rangoDelHistorial = (mes, anio) => {
  const primero = new Date(anio, mes - 1 - (MESES_DE_HISTORIAL - 1), 1);
  return {
    desde: `${primero.getFullYear()}-${dosDigitos(primero.getMonth() + 1)}-01`,
    hasta: rangoDelMes(mes, anio).hasta,
  };
};

const tipoTone = { traer: 'positive', llevar: 'caution', ambos: 'accent' };
const tipoLabel = { traer: 'Traer', llevar: 'Llevar', ambos: 'Ambos' };

/** Leyenda del cronograma: un color por cada cosa que se pinta en una casilla. */
const LEYENDA = [
  { color: 'bg-positive', texto: 'Traer', modulo: 'recorridos' },
  { color: 'bg-caution', texto: 'Llevar', modulo: 'recorridos' },
  { color: 'bg-accent', texto: 'Ambos', modulo: 'recorridos' },
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
const chartPalette = {
  light: { recorridos: '#007AFF', riegos: '#0082A0', rejilla: '#00000014' },
  dark: { recorridos: '#0A84FF', riegos: '#40C8E0', rejilla: '#FFFFFF14' },
};

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

/** Tooltip con los tokens de superficie, para que se lea igual en ambos temas. */
const TooltipMeses = ({ active, payload, colors }) => {
  if (!active || !payload?.length) return null;
  const mes = payload[0]?.payload;
  if (!mes) return null;

  const filas = [
    { clave: 'recorridos', texto: 'Recorridos', color: colors.recorridos },
    { clave: 'riegos', texto: 'Riegos', color: colors.riegos },
  ].filter(({ clave }) => payload.some((entrada) => entrada.dataKey === clave));

  return (
    <div className="rounded-control border border-separator/60 bg-surface px-3 py-2 shadow-level-3">
      <p className="text-caption text-label-tertiary">{mes.nombre} {mes.anio}</p>
      <ul className="mt-1.5 space-y-1">
        {filas.map(({ clave, texto, color }) => (
          <li key={clave} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-footnote text-label-secondary">{texto}</span>
            <span className="tabular ml-auto text-footnote font-semibold text-label">
              {dinero.format(mes[clave])}
            </span>
          </li>
        ))}
        {filas.length > 1 && (
          <li className="flex items-center gap-2 border-t border-separator/40 pt-1">
            <span className="text-footnote text-label-secondary">Total</span>
            <span className="tabular ml-auto text-footnote font-semibold text-label">
              {dinero.format(mes.total)}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
};

/**
 * Marcadores de carga.
 *
 * Tienen la forma de lo que va a llegar —una cifra, unos ejes, una rejilla de
 * días— en lugar de ser un rectángulo gris. Así la espera se lee como
 * "el contenido está llegando" y no como "algo se rompió", y cuando los datos
 * entran no hay salto de layout porque el hueco ya medía lo mismo.
 */
const EsqueletoCifra = () => (
  <Card className="lg:col-span-5">
    <Skeleton variant="bare" className="h-3.5 w-28" />
    <Skeleton variant="bare" className="mt-2 h-9 w-40" />
    <Skeleton variant="bare" className="mt-2 h-3 w-44" />
    <div className="mt-5 space-y-3 border-t border-separator/50 pt-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="bare" className="h-8 w-8 rounded-field" />
          <div className="flex-1">
            <Skeleton variant="bare" className="h-3.5 w-24" />
            <Skeleton variant="bare" className="mt-1.5 h-3 w-20" />
          </div>
          <Skeleton variant="bare" className="h-4 w-16" />
        </div>
      ))}
    </div>
  </Card>
);

const EsqueletoGrafico = () => (
  <Card className="lg:col-span-7">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Skeleton variant="bare" className="h-4 w-44" />
        <Skeleton variant="bare" className="mt-2 h-3 w-56" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton variant="bare" className="h-3 w-20" />
        <Skeleton variant="bare" className="h-3 w-24" />
      </div>
    </div>
    {/* Se insinúan los ejes y una silueta de datos, no un bloque macizo. */}
    {/* Se insinúan los ejes y seis barras, que es lo que va a llegar, en vez
        de un bloque gris que no dice nada de la forma del contenido. */}
    <div className="flex h-[220px] gap-3">
      <div className="flex w-10 flex-col justify-between py-1">
        {[...Array(5)].map((_, i) => <Skeleton key={i} variant="bare" className="h-2.5 w-full" />)}
      </div>
      <div className="flex flex-1 items-end gap-5 border-b border-l border-separator/50 px-3 pb-2">
        {[42, 68, 35, 80, 58, 72].map((alto, i) => (
          <Skeleton key={i} variant="bare" className="flex-1 rounded-t-md" style={{ height: `${alto}%` }} />
        ))}
      </div>
    </div>
  </Card>
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
  <Card padding="p-0" className="flex h-[32rem] flex-col overflow-hidden xl:col-span-4">
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
  const { user, puedeRecorridos, puedeRiegos } = useAuth();
  const { resolvedTheme } = useApp();
  const reduceMotion = useReducedMotion();
  const colors = chartPalette[resolvedTheme] || chartPalette.light;

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

  const MonthStepper = () => (
    <div className="flex items-center gap-0.5 rounded-control bg-fill/10 p-0.5">
      <motion.button
        type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"
        whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }} transition={springSnappy}
        className="tappable rounded-[0.625rem] p-1.5 text-label-secondary transition-colors hover:bg-surface hover:text-label"
      >
        <ChevronLeft size={17} strokeWidth={2.2} />
      </motion.button>
      <span className="min-w-[8.5rem] text-center text-footnote font-semibold text-label">
        {nombresMeses[mesActual - 1]} <span className="tabular font-normal text-label-tertiary">{anioActual}</span>
      </span>
      <motion.button
        type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"
        whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }} transition={springSnappy}
        className="tappable rounded-[0.625rem] p-1.5 text-label-secondary transition-colors hover:bg-surface hover:text-label"
      >
        <ChevronRight size={17} strokeWidth={2.2} />
      </motion.button>
    </div>
  );

  return (
    <div className="pb-4">
      <PageHeader
        title="Resumen"
        subtitle="Actividad y gasto del mes"
        actions={
          <>
            {/* El mes gobierna toda la pantalla —cifras, barras y calendario—,
                así que vive en la cabecera. Dentro de una tarjeta parecía
                mandar solo sobre ella. */}
            <MonthStepper />

            {/* Con los dos servicios se emite UN documento con su total; con
                uno solo, el informe propio de ese servicio. Dos botones para
                quien solo usa uno serían un botón que nunca sirve. */}
            {puedeRecorridos && puedeRiegos ? (
              <Button
                variant="secondary"
                onClick={exportarGeneralPDF}
                disabled={cargando || (totalRecorridosMes === 0 && totalRiegosMes === 0)}
                icon={<FileDown size={16} strokeWidth={2.1} />}
              >
                PDF del mes
              </Button>
            ) : puedeRecorridos ? (
              <Button
                variant="secondary"
                onClick={exportarPDF}
                disabled={loading || totalRecorridosMes === 0}
                icon={<FileDown size={16} strokeWidth={2.1} />}
              >
                PDF recorridos
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={exportarRiegosPDF}
                disabled={loadingRiegos || totalRiegosMes === 0}
                icon={<FileDown size={16} strokeWidth={2.1} />}
              >
                PDF riegos
              </Button>
            )}
            {puedeRiegos && (
              <Button
                variant="secondary"
                onClick={() => setModalRiego(true)}
                icon={<Plus size={17} strokeWidth={2.3} />}
              >
                Nuevo riego
              </Button>
            )}
            {puedeRecorridos && (
              <Button onClick={handleOpenModal} icon={<Plus size={17} strokeWidth={2.3} />}>
                Nuevo recorrido
              </Button>
            )}
          </>
        }
      />

      {/* El gasto primero: es la pregunta que trae a esta pantalla.
          A su lado, los últimos meses para saber si este se sale de lo normal. */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {cargando ? <EsqueletoCifra /> : (
          <Card className="lg:col-span-5">
            <p className="text-footnote font-medium text-label-secondary">Gasto del mes</p>
            <p className="tabular mt-1 text-large-title font-semibold text-label">
              {dinero.format(gastoTotalMes)}
            </p>

            {/* La variación se dice con palabras además de con color y flecha:
                "sube" y "baja" no pueden depender de distinguir verde de rojo. */}
            {variacion === null ? (
              <p className="mt-1.5 text-footnote text-label-tertiary">
                Sin gasto en {resumenMeses.at(-2)?.nombre.toLowerCase() ?? 'el mes anterior'}
              </p>
            ) : (
              <p className={`mt-1.5 flex items-center gap-1 text-footnote font-medium ${
                variacion > 0 ? 'text-caution' : variacion < 0 ? 'text-positive' : 'text-label-tertiary'
              }`}>
                {variacion !== 0 && (
                  variacion > 0
                    ? <TrendingUp size={14} strokeWidth={2.2} />
                    : <TrendingDown size={14} strokeWidth={2.2} />
                )}
                {variacion === 0
                  ? `Igual que en ${resumenMeses.at(-2)?.nombre.toLowerCase()}`
                  : `${Math.abs(variacion).toFixed(0)}% ${variacion > 0 ? 'más' : 'menos'} que en ${resumenMeses.at(-2)?.nombre.toLowerCase()}`}
              </p>
            )}

            <div className="mt-5 space-y-3 border-t border-separator/50 pt-4">
              {puedeRecorridos && (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-accent/12 text-accent">
                    <RouteIcon size={15} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-subhead font-medium text-label">Recorridos</p>
                    <p className="text-footnote text-label-tertiary">
                      {totalRecorridosMes} en {diasConRecorridos} {diasConRecorridos === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                  <span className="tabular text-subhead font-semibold text-label">
                    {dinero.format(costoRecorridos)}
                  </span>
                </div>
              )}

              {puedeRiegos && (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-info/14 text-info">
                    <Droplets size={15} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-subhead font-medium text-label">Riegos</p>
                    <p className="text-footnote text-label-tertiary">
                      {totalRiegosMes} en {diasConRiegos} {diasConRiegos === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                  <span className="tabular text-subhead font-semibold text-label">
                    {dinero.format(costoRiegos)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {cargando ? <EsqueletoGrafico /> : (
          <Card className="lg:col-span-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-headline font-semibold text-label">Últimos {MESES_DE_HISTORIAL} meses</h2>
                <p className="mt-0.5 text-footnote text-label-secondary">
                  Gasto por mes, hasta {nombresMeses[mesActual - 1].toLowerCase()}
                </p>
              </div>

              {puedeRecorridos && puedeRiegos && (
                <ul className="flex items-center gap-4">
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.recorridos }} />
                    <span className="text-footnote text-label-secondary">Recorridos</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.riegos }} />
                    <span className="text-footnote text-label-secondary">Riegos</span>
                  </li>
                </ul>
              )}
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumenMeses} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                  {/* Rejilla continua y discreta: el punteado añade ruido y se
                      lee como "proyección" cuando solo es una guía. */}
                  <CartesianGrid vertical={false} stroke="rgb(var(--c-separator) / 0.5)" />
                  <XAxis
                    dataKey="etiqueta" axisLine={false} tickLine={false} dy={8}
                    tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false} width={52}
                    tickFormatter={(valor) => dinero.format(valor).replace('.00', '')}
                    tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
                  />
                  <Tooltip content={<TooltipMeses colors={colors} />} cursor={{ fill: 'rgb(var(--c-fill) / 0.08)' }} />

                  {/* Los meses pasados van atenuados para que el mes a la vista
                      se distinga sin necesidad de leer el eje. */}
                  {puedeRecorridos && (
                    <Bar dataKey="recorridos" stackId="gasto"
                      isAnimationActive={!reduceMotion}
                      radius={puedeRiegos ? 0 : [6, 6, 0, 0]}>
                      {/* El color va en cada Cell y no solo en el Bar: Cell
                          reemplaza las props del rectángulo, así que heredar
                          el fill deja las barras transparentes. */}
                      {resumenMeses.map((mes) => (
                        <Cell key={mes.clave} fill={colors.recorridos} fillOpacity={mes.esActual ? 1 : 0.4} />
                      ))}
                    </Bar>
                  )}
                  {puedeRiegos && (
                    <Bar dataKey="riegos" stackId="gasto" radius={[6, 6, 0, 0]}
                      isAnimationActive={!reduceMotion}>
                      {resumenMeses.map((mes) => (
                        <Cell key={mes.clave} fill={colors.riegos} fillOpacity={mes.esActual ? 1 : 0.4} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Calendario + actividad: recorridos y riegos sobre el mismo mes */}
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
                porque los recorridos ya se pintan según sean de traer, llevar
                o ambos: una sola entrada "Recorridos" mentiría sobre el color. */}
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
          <Card padding="p-0" className="flex h-[32rem] flex-col overflow-hidden xl:col-span-4">
            <div className="flex items-center gap-2 border-b border-separator/50 p-5">
              <Clock size={17} strokeWidth={2.1} className="text-positive" />
              <h2 className="text-headline font-semibold text-label">Actividad</h2>
            </div>

            <div className="scroll-area flex-1 space-y-5 p-4">
              {diasConActividad.length > 0 ? (
                diasConActividad.map((dia) => (
                  <section key={dia}>
                    <h3 className="mb-2 px-1 text-footnote font-medium text-label-secondary">
                      {dia} de {nombresMeses[mesActual - 1].toLowerCase()}
                    </h3>

                    <div className="space-y-2">
                      {(recorridosMensuales[dia] || []).map((recorrido, index) => {
                        const totalPasajeros = recorrido.total_ninos !== undefined
                          ? recorrido.total_ninos
                          : (recorrido.ninos?.length || 0);

                        return (
                          <div
                            key={`recorrido-${index}`}
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
                              <button
                                type="button"
                                onClick={() => { setRecorridoAEliminar(recorrido.id); setShowDeleteModal(true); }}
                                aria-label="Eliminar recorrido"
                                className="tappable rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-critical/12 hover:text-critical"
                              >
                                <Trash2 size={14} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Los riegos se ven aquí, pero se editan en su pantalla:
                          un mismo registro con dos sitios donde tocarlo acaba
                          en dos comportamientos distintos. */}
                      {(riegosMensuales[dia] || []).map((riego, index) => (
                        <div
                          key={`riego-${index}`}
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
                      ))}
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
                <option value="ambos">Ambos</option>
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

      <RiegoModal
        abierto={modalRiego}
        onCerrar={() => setModalRiego(false)}
        onGuardado={() => setRefrescoRiegos((n) => n + 1)}
      />
    </div>
  );
};

export default Dashboard;
