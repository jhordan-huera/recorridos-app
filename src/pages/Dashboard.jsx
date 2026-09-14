import React, { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Users, Route as RouteIcon, Calendar as CalendarIcon, FileText,
  ChevronLeft, ChevronRight, Clock, Trash2, Plus, DollarSign,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { generarReportePdf } from '../lib/reportePdf';
import { useApp } from '../context/AppContext';
import {
  createRecorrido, updateRecorrido, deleteRecorrido,
  getAllRecorridos, getAllNinos, getAllVehiculos, mensajeDeError, fueBien, mensajeDeRespuesta,
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
import StatCard from '../components/ui/StatCard';
import { springSnappy, haptics } from '../lib/motion';

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const tipoTone = { traer: 'positive', llevar: 'caution', ambos: 'accent' };
const tipoLabel = { traer: 'Traer', llevar: 'Llevar', ambos: 'Ambos' };

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
  light: { actual: '#007AFF', anterior: '#C2410C' },
  dark: { actual: '#0A84FF', anterior: '#E06C15' },
};

const obtenerFechaActual = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
};

const obtenerHoraActual = () => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
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
const ChartTooltip = ({ active, payload, label, colors }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-separator/60 bg-surface px-3 py-2 shadow-level-3">
      <p className="text-caption text-label-tertiary">Día {label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.dataKey === 'actual' ? colors.actual : colors.anterior }}
            />
            <span className="text-footnote text-label-secondary">
              {entry.dataKey === 'actual' ? 'Este mes' : 'Mes anterior'}
            </span>
            <span className="tabular ml-auto text-footnote font-semibold text-label">{entry.value}</span>
          </li>
        ))}
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
  <Card>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Skeleton variant="bare" className="h-3.5 w-28" />
        <Skeleton variant="bare" className="mt-2.5 h-7 w-32" />
      </div>
      <Skeleton variant="bare" className="h-9 w-9 rounded-field" />
    </div>
    <Skeleton variant="bare" className="mt-3 h-3 w-40" />
  </Card>
);

const EsqueletoGrafico = () => (
  <Card className="mb-6">
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
    <div className="flex h-[240px] gap-3">
      <div className="flex w-8 flex-col justify-between py-1">
        {[...Array(5)].map((_, i) => <Skeleton key={i} variant="bare" className="h-2.5 w-full" />)}
      </div>
      <div className="flex flex-1 items-end gap-1.5 border-b border-l border-separator/50 px-2 pb-2">
        {[38, 55, 30, 68, 47, 72, 41, 60, 35, 64, 50, 78, 44, 58].map((alto, i) => (
          <Skeleton key={i} variant="bare" className="flex-1 rounded-t-sm" style={{ height: `${alto}%` }} />
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
  const { user } = useAuth();
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
  const [recorridosMensuales, setRecorridosMensuales] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recorridoAEliminar, setRecorridoAEliminar] = useState(null);

  const [formData, setFormData] = useState({
    fecha: obtenerFechaActual(),
    hora_inicio: obtenerHoraActual(),
    vehiculo_id: '',
    tipo_recorrido: 'traer',
    notas: '',
  });

  const procesarRecorridos = (data) => {
    const recorridosAgrupados = {};

    if (Array.isArray(data)) {
      data.forEach((recorrido) => {
        if (!recorrido?.fecha) return;
        const [anioStr, mesStr, diaStr] = recorrido.fecha.split('-');
        if (parseInt(mesStr, 10) === mesActual && parseInt(anioStr, 10) === anioActual) {
          const dia = parseInt(diaStr, 10);
          if (!recorridosAgrupados[dia]) recorridosAgrupados[dia] = [];
          recorridosAgrupados[dia].push(recorrido);
        }
      });
    }

    const recorridosLimpios = {};
    Object.keys(recorridosAgrupados)
      .map((key) => parseInt(key, 10))
      .filter((key) => !Number.isNaN(key) && key > 0 && key <= 31)
      .sort((a, b) => a - b)
      .forEach((key) => {
        recorridosLimpios[key] = recorridosAgrupados[key].sort((a, b) =>
          (a.hora_inicio || '00:00').localeCompare(b.hora_inicio || '00:00')
        );
      });

    setRecorridosMensuales(recorridosLimpios);

    // --- Comparativa con el mes anterior ---
    const chartDataMap = {};
    const diasDelMes = new Date(anioActual, mesActual, 0).getDate();
    for (let i = 1; i <= diasDelMes; i += 1) {
      chartDataMap[i] = { name: i.toString(), actual: 0, anterior: 0 };
    }

    const fechaMesAnterior = new Date(anioActual, mesActual - 1, 0);
    const mesAnterior = fechaMesAnterior.getMonth() + 1;
    const anioAnterior = fechaMesAnterior.getFullYear();

    if (Array.isArray(data)) {
      data.forEach((recorrido) => {
        if (!recorrido?.fecha || typeof recorrido.fecha !== 'string') return;

        // Fecha tomada como YYYY-MM-DD, ignorando hora y zona horaria.
        const partes = (recorrido.fecha.includes('T') ? recorrido.fecha.split('T')[0] : recorrido.fecha).split('-');
        if (partes.length !== 3) return;

        const anio = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10);
        const dia = parseInt(partes[2], 10);

        if (mes === mesActual && anio === anioActual && chartDataMap[dia]) {
          chartDataMap[dia].actual += 1;
        }
        if (mes === mesAnterior && anio === anioAnterior && chartDataMap[dia]) {
          chartDataMap[dia].anterior += 1;
        }
      });
    }

    setChartData(Object.values(chartDataMap));
    setLoading(false);
  };

  const loadRecorridosData = async () => {
    setLoading(true);
    try {
      // El dashboard agrega totales mensuales: necesita TODOS los recorridos.
      // El listado devuelve 50 por página, así que sin recorrerlas todas los
      // importes saldrían mal sin mostrar ningún error.
      procesarRecorridos(await getAllRecorridos());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los recorridos: ' + mensajeDeError(error));
      setRecorridosMensuales({});
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [recorridos, ninosData, vehiculosData] = await Promise.all([
          getAllRecorridos(), getAllNinos(), getAllVehiculos(),
        ]);
        procesarRecorridos(recorridos);
        setNinos(ninosData);
        setVehiculos(vehiculosData);
      } catch (error) {
        showAlert('error', 'No se pudieron cargar los datos: ' + mensajeDeError(error));
        setRecorridosMensuales({});
        setLoading(false);
      }
    };

    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual, anioActual]);

  const { diasConRecorridos, totalRecorridosMes, costoTotalMes } = useMemo(() => {
    const allRecorridos = Object.values(recorridosMensuales).flat();
    return {
      totalRecorridosMes: allRecorridos.length,
      diasConRecorridos: Object.keys(recorridosMensuales).length,
      costoTotalMes: allRecorridos.reduce((acc, r) => acc + (parseFloat(r.costo || '0') || 0), 0),
    };
  }, [recorridosMensuales]);

  const matrizCalendario = useMemo(() => {
    const primerDia = new Date(anioActual, mesActual - 1, 1).getDay();
    const diasEnElMes = new Date(anioActual, mesActual, 0).getDate();
    const matriz = [];
    let dia = 1;

    const offset = primerDia === 0 ? 6 : primerDia - 1;
    let fila = Array(offset).fill(null);
    const hoy = new Date();

    while (dia <= diasEnElMes) {
      if (fila.length === 7) {
        matriz.push(fila);
        fila = [];
      }
      fila.push({
        numero: dia,
        esHoy: dia === hoy.getDate()
          && mesActual === hoy.getMonth() + 1
          && anioActual === hoy.getFullYear(),
      });
      dia += 1;
    }

    while (fila.length < 7) fila.push(null);
    if (fila.length > 0) matriz.push(fila);
    return matriz;
  }, [mesActual, anioActual]);

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
      fecha: obtenerFechaActual(),
      hora_inicio: obtenerHoraActual(),
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
        usuario: { nombre: user?.nombre, email: user?.email },
      });
      showAlert('success', 'Estado de cuenta generado');
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo generar el PDF');
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
            <Button
              variant="secondary"
              onClick={exportarPDF}
              disabled={loading || totalRecorridosMes === 0}
              icon={<FileText size={16} strokeWidth={2.1} />}
            >
              Exportar
            </Button>
            <Button onClick={handleOpenModal} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo recorrido
            </Button>
          </>
        }
      />

      {/* Cifras */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <EsqueletoCifra />
            <EsqueletoCifra />
          </>
        ) : (
          <>
            <StatCard
              label="Gasto del mes"
              value={`$${costoTotalMes.toFixed(2)}`}
              icon={DollarSign}
              tone="positive"
              footnote={`Acumulado en ${nombresMeses[mesActual - 1].toLowerCase()}`}
            />
            <StatCard
              label="Recorridos"
              value={totalRecorridosMes}
              icon={RouteIcon}
              tone="accent"
              footnote={`${diasConRecorridos} ${diasConRecorridos === 1 ? 'día' : 'días'} con actividad`}
            />
          </>
        )}
      </div>

      {/* Gráfico comparativo */}
      {loading ? <EsqueletoGrafico /> : (
        <Card className="mb-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-headline font-semibold text-label">Recorridos por día</h2>
                <p className="mt-0.5 text-footnote text-label-secondary">
                  {nombresMeses[mesActual - 1]} frente al mes anterior
                </p>
              </div>

              {/* Con dos series la leyenda siempre está: la identidad nunca
                  depende solo del color. */}
              <ul className="flex items-center gap-4">
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.actual }} />
                  <span className="text-footnote text-label-secondary">Este mes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.anterior }} />
                  <span className="text-footnote text-label-secondary">Mes anterior</span>
                </li>
              </ul>
            </div>

            <div className="h-[240px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.actual} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={colors.actual} stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    {/* Rejilla continua y discreta: el punteado añade ruido y
                        se lee como "proyección" cuando solo es una guía. */}
                    <CartesianGrid vertical={false} stroke="rgb(var(--c-separator) / 0.5)" />
                    <XAxis
                      dataKey="name" axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd"
                      tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false} tickLine={false} allowDecimals={false} width={44}
                      tick={{ fill: 'rgb(var(--c-label-3))', fontSize: 11 }}
                    />
                    <Tooltip
                      content={<ChartTooltip colors={colors} />}
                      cursor={{ stroke: 'rgb(var(--c-label-3))', strokeWidth: 1 }}
                    />

                    <Area
                      type="monotone" dataKey="anterior" stroke={colors.anterior} strokeWidth={2}
                      fill="transparent"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--c-surface))' }}
                    />
                    <Area
                      type="monotone" dataKey="actual" stroke={colors.actual} strokeWidth={2}
                      fill="url(#fillActual)"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--c-surface))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-subhead text-label-tertiary">
                  Sin datos para este periodo
                </div>
              )}
          </div>
        </Card>
      )}

      {/* Calendario + actividad */}
      {loading ? (
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
              <MonthStepper />
            </div>

            <div className="p-3 sm:p-5">
              <div className="mb-2 grid grid-cols-7">
                {diasSemana.map((dia) => (
                  <div key={dia} className="text-center text-caption font-medium text-label-tertiary">
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {matrizCalendario.flat().map((dia, index) => {
                  if (!dia) return <div key={`vacio-${index}`} className="h-14 sm:h-24" />;

                  const recorridosDelDia = recorridosMensuales[dia.numero] || [];

                  return (
                    <div
                      key={dia.numero}
                      className={`flex h-14 flex-col rounded-field border p-1 sm:h-24 sm:rounded-control sm:p-2 ${
                        dia.esHoy
                          ? 'border-accent bg-accent/8'
                          : 'border-separator/50 bg-surface-secondary'
                      }`}
                    >
                      <span
                        className={`tabular self-end text-caption ${
                          dia.esHoy
                            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white'
                            : 'px-1 text-label-tertiary'
                        }`}
                      >
                        {dia.numero}
                      </span>

                      {/* Móvil: puntos. Escritorio: las etiquetas completas. */}
                      <div className="mt-auto flex flex-wrap justify-center gap-0.5 sm:hidden">
                        {recorridosDelDia.slice(0, 4).map((recorrido, i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              recorrido.tipo_recorrido === 'traer' ? 'bg-positive'
                                : recorrido.tipo_recorrido === 'llevar' ? 'bg-caution' : 'bg-accent'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="scroll-area mt-1 hidden flex-1 space-y-1 sm:block">
                        {recorridosDelDia.map((recorrido, i) => (
                          <p
                            key={i}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Actividad reciente */}
          <Card padding="p-0" className="flex h-[32rem] flex-col overflow-hidden xl:col-span-4">
            <div className="flex items-center gap-2 border-b border-separator/50 p-5">
              <Clock size={17} strokeWidth={2.1} className="text-positive" />
              <h2 className="text-headline font-semibold text-label">Actividad</h2>
            </div>

            <div className="scroll-area flex-1 space-y-5 p-4">
              {Object.keys(recorridosMensuales).length > 0 ? (
                Object.keys(recorridosMensuales)
                  .filter((dia) => !Number.isNaN(parseInt(dia, 10)))
                  .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
                  .map((dia) => (
                    <section key={dia}>
                      <h3 className="mb-2 px-1 text-footnote font-medium text-label-secondary">
                        {dia} de {nombresMeses[mesActual - 1].toLowerCase()}
                      </h3>

                      <div className="space-y-2">
                        {recorridosMensuales[dia].map((recorrido, index) => {
                          const totalPasajeros = recorrido.total_ninos !== undefined
                            ? recorrido.total_ninos
                            : (recorrido.ninos?.length || 0);

                          return (
                            <div
                              key={index}
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
    </div>
  );
};

export default Dashboard;
