import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus, RefreshCw, ChevronLeft, ChevronRight, Route as RouteIcon,
  Clock, Bus, Pencil, Trash2, X,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import {
  deleteRecorrido, createRecorrido, updateRecorrido,
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
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { crossFade, springSheet, springSnappy, haptics } from '../lib/motion';

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const tipoTone = { traer: 'brand', llevar: 'positive' };
const tipoLabel = { traer: 'Traer', llevar: 'Llevar' };

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
    return hora.slice(0, 5);
  } catch {
    return hora;
  }
};

const formatearFecha = (fecha) => {
  const [year, month, day] = fecha.split('T')[0].split('-');
  return `${day} ${nombresMeses[parseInt(month, 10) - 1]?.slice(0, 3).toLowerCase()} ${year}`;
};

const Recorridos = () => {
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();

  const [recorridos, setRecorridos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [recorridoId, setRecorridoId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recorridoAEliminar, setRecorridoAEliminar] = useState(null);

  const [ninos, setNinos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [ninosSeleccionados, setNinosSeleccionados] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fecha: '', hora_inicio: '', vehiculo_id: '', tipo_recorrido: 'traer', notas: '',
  });

  useEffect(() => {
    loadRecorridos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecorridos = async () => {
    setLoading(true);
    try {
      // Todas las páginas: el listado está limitado a 50 por petición.
      setRecorridos(await getAllRecorridos());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los recorridos: ' + mensajeDeError(error));
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogos = async () => {
    try {
      const [ninosData, vehiculosData] = await Promise.all([getAllNinos(), getAllVehiculos()]);
      setNinos(ninosData);
      setVehiculos(vehiculosData);
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los catálogos: ' + mensajeDeError(error));
    }
  };

  const recorridosFiltrados = useMemo(() => recorridos.filter((recorrido) => {
    if (!recorrido.fecha) return false;
    const [year, month] = recorrido.fecha.split('T')[0].split('-');
    return parseInt(month, 10) === mesSeleccionado && parseInt(year, 10) === anioSeleccionado;
  }), [recorridos, mesSeleccionado, anioSeleccionado]);

  const estadisticas = useMemo(() => ({
    totalMes: recorridosFiltrados.reduce((total, r) => total + (parseFloat(r.costo) || 0), 0),
    vehiculosUsados: new Set(recorridosFiltrados.map((r) => r.vehiculo_id)).size,
    totalRecorridos: recorridosFiltrados.length,
  }), [recorridosFiltrados]);

  const cambiarMes = (delta) => {
    haptics.tick();
    let nuevoMes = mesSeleccionado + delta;
    let nuevoAnio = anioSeleccionado;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio += 1; }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio -= 1; }
    setMesSeleccionado(nuevoMes);
    setAnioSeleccionado(nuevoAnio);
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
    setMostrarModal(true);
    await loadCatalogos();
    setLoadingForm(false);
  };

  const handleCloseModal = () => {
    setMostrarModal(false);
    resetForm();
  };

  const handleEdit = async (recorrido) => {
    setLoadingForm(true);
    setMostrarModal(true);
    await loadCatalogos();

    setEditando(true);
    setRecorridoId(recorrido.id);
    setFormData({
      fecha: recorrido.fecha.split('T')[0],
      hora_inicio: recorrido.hora_inicio?.slice(0, 5) || obtenerHoraActual(),
      vehiculo_id: recorrido.vehiculo_id || '',
      tipo_recorrido: recorrido.tipo_recorrido || 'traer',
      notas: recorrido.notas || '',
    });
    setNinosSeleccionados(
      (recorrido.ninos || []).map((n) => ({
        nino_id: n.nino_id || n.id, nombre: n.nombre, apellidos: n.apellidos, notas: n.notas || '',
      }))
    );
    setLoadingForm(false);
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
      // El <select> de vehículo envía cadena vacía cuando no hay selección; la
      // API espera un UUID o null. Sin esta normalización, guardar un recorrido
      // sin vehículo fallaba con "Debe ser un UUID válido".
      const data = {
        ...formData,
        vehiculo_id: formData.vehiculo_id || null,
        notas: formData.notas || null,
        ninos: ninosSeleccionados,
      };
      const response = editando
        ? await updateRecorrido(recorridoId, data)
        : await createRecorrido(data);

      if (fueBien(response)) {
        showAlert('success', editando ? 'Recorrido actualizado' : 'Recorrido registrado');
        handleCloseModal();
        loadRecorridos();
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
    setSaving(true);
    try {
      const response = await deleteRecorrido(recorridoAEliminar);
      if (fueBien(response)) {
        showAlert('success', 'Recorrido eliminado');
        loadRecorridos();
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setRecorridoAEliminar(null);
    }
  };

  const ninosDisponibles = (ninos || []).filter(
    (n) => !ninosSeleccionados.some((sel) => sel.nino_id?.toString() === n.id?.toString())
  );

  return (
    <div className="pb-4">
      <PageHeader
        title="Recorridos"
        subtitle="Rutas programadas y su costo"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={loadRecorridos}
              disabled={loading}
              icon={<RefreshCw size={16} strokeWidth={2.1} className={loading ? 'animate-spin' : ''} />}
            >
              Actualizar
            </Button>
            <Button onClick={handleOpenModal} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo recorrido
            </Button>
          </>
        }
      />

      {/* Navegación de mes + resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card padding="p-1.5" className="flex items-center justify-between lg:col-span-3">
          <motion.button
            type="button"
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
            whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }}
            transition={springSnappy}
            className="tappable rounded-field p-2 text-label-secondary transition-colors hover:bg-fill/12 hover:text-label"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </motion.button>

          <div className="text-center">
            <p className="text-subhead font-semibold text-label">{nombresMeses[mesSeleccionado - 1]}</p>
            <p className="tabular text-footnote text-label-tertiary">{anioSeleccionado}</p>
          </div>

          <motion.button
            type="button"
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
            whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }}
            transition={springSnappy}
            className="tappable rounded-field p-2 text-label-secondary transition-colors hover:bg-fill/12 hover:text-label"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </motion.button>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-9">
          <StatCard
            label="Gasto del mes"
            value={`$${estadisticas.totalMes.toFixed(2)}`}
            tone="positive"
            footnote={`Acumulado en ${nombresMeses[mesSeleccionado - 1].toLowerCase()}`}
          />
          <StatCard label="Trayectos" value={estadisticas.totalRecorridos} tone="brand" />
          <StatCard label="Vehículos usados" value={estadisticas.vehiculosUsados} tone="caution" />
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => <CardSkeleton key={index} lineas={4} />)}
        </div>
      ) : recorridosFiltrados.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="Sin recorridos este mes"
          message={`No hay rutas registradas en ${nombresMeses[mesSeleccionado - 1].toLowerCase()} de ${anioSeleccionado}.`}
          action={
            <Button onClick={handleOpenModal} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo recorrido
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {recorridosFiltrados.map((recorrido) => (
              <motion.div
                key={recorrido.id}
                layout
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={reduceMotion ? crossFade : springSheet}
              >
                <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-caption text-label-tertiary">Fecha</p>
                        <p className="tabular mt-0.5 text-headline font-semibold text-label">
                          {formatearFecha(recorrido.fecha)}
                        </p>
                      </div>
                      <Badge tone={tipoTone[recorrido.tipo_recorrido] || 'neutral'}>
                        {tipoLabel[recorrido.tipo_recorrido] || recorrido.tipo_recorrido}
                      </Badge>
                    </div>

                    <dl className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-1.5 text-footnote text-label-secondary">
                          <Clock size={14} strokeWidth={2} className="text-label-tertiary" />
                          Hora de salida
                        </dt>
                        <dd className="tabular text-footnote font-medium text-label">
                          {formatearHora(recorrido.hora_inicio)}
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <dt className="flex shrink-0 items-center gap-1.5 text-footnote text-label-secondary">
                          <Bus size={14} strokeWidth={2} className="text-label-tertiary" />
                          Vehículo
                        </dt>
                        <dd
                          className="truncate text-right text-footnote font-medium text-label"
                          title={recorrido.vehiculo_descripcion}
                        >
                          {recorrido.vehiculo_descripcion || 'Sin asignar'}
                        </dd>
                      </div>
                    </dl>

                    {recorrido.ninos?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-caption text-label-tertiary">
                          Estudiantes ({recorrido.ninos.length})
                        </p>
                        <div className="mt-2 flex -space-x-2">
                          {recorrido.ninos.slice(0, 5).map((nino, index) => (
                            <span
                              key={index}
                              title={nino.nombre}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-fill/12
                                         text-caption font-semibold text-label-secondary ring-2 ring-surface"
                            >
                              {nino.nombre?.charAt(0) || '?'}
                            </span>
                          ))}
                          {recorrido.ninos.length > 5 && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fill/12
                                             text-caption font-medium text-label-tertiary ring-2 ring-surface">
                              +{recorrido.ninos.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-separator/50 pt-4">
                      <span className="text-footnote text-label-secondary">Costo</span>
                      <span className="tabular text-title3 font-semibold text-positive">
                        ${parseFloat(recorrido.costo || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-separator/60 bg-surface-secondary px-4 py-3">
                    <Button
                      variant="secondary" size="sm" className="flex-1"
                      onClick={() => handleEdit(recorrido)}
                      icon={<Pencil size={14} strokeWidth={2.1} />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      aria-label="Eliminar recorrido"
                      className="px-2.5 text-label-secondary hover:bg-critical/14 hover:text-critical"
                      onClick={() => { setRecorridoAEliminar(recorrido.id); setShowDeleteModal(true); }}
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Formulario */}
      <Modal
        isOpen={mostrarModal}
        onClose={handleCloseModal}
        title={editando ? 'Editar recorrido' : 'Nuevo recorrido'}
        size="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" form="form-recorrido" loading={saving} disabled={loadingForm}>
              {editando ? 'Guardar cambios' : 'Registrar ruta'}
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
          <form id="form-recorrido" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha" type="date" name="fecha" value={formData.fecha}
                onChange={handleChange} required disabled={saving}
              />
              <Input
                label="Hora de salida" type="time" name="hora_inicio" value={formData.hora_inicio}
                onChange={handleChange} required disabled={saving}
              />
              <Select
                label="Vehículo" name="vehiculo_id" value={formData.vehiculo_id}
                onChange={handleChange} required disabled={saving}
              >
                <option value="">Seleccionar…</option>
                {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.descripcion}</option>)}
              </Select>
              <Select
                label="Tipo de servicio" name="tipo_recorrido" value={formData.tipo_recorrido}
                onChange={handleChange} required disabled={saving}
              >
                <option value="traer">Traer estudiantes</option>
                <option value="llevar">Llevar estudiantes</option>
              </Select>
            </div>

            <Input
              label="Notas" name="notas" value={formData.notas} onChange={handleChange}
              placeholder="Detalles adicionales, cambios en la ruta…" disabled={saving}
            />

            <div className="border-t border-separator/50 pt-4">
              <Select
                label={`Estudiantes asignados (${ninosSeleccionados.length})`}
                onChange={agregarNino}
                value=""
                disabled={saving || ninosDisponibles.length === 0}
                hint={ninosDisponibles.length === 0 ? 'No quedan estudiantes por asignar' : undefined}
              >
                <option value="">Añadir estudiante…</option>
                {ninosDisponibles.map((n) => (
                  <option key={n.id} value={n.id}>{n.nombre} {n.apellidos}</option>
                ))}
              </Select>

              <div className="scroll-area mt-3 grid max-h-52 grid-cols-1 gap-2 sm:grid-cols-2">
                <AnimatePresence initial={false}>
                  {ninosSeleccionados.map((nino, index) => (
                    <motion.div
                      key={nino.nino_id}
                      layout
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      transition={reduceMotion ? crossFade : springSnappy}
                      className="flex items-center justify-between gap-2 rounded-control border
                                 border-separator/60 bg-surface-secondary p-2 pl-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                                         bg-fill/12 text-caption font-semibold text-label-secondary">
                          {nino.nombre?.charAt(0) || '?'}
                        </span>
                        <span className="truncate text-footnote font-medium text-label">
                          {nino.nombre} {nino.apellidos}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarNino(index)}
                        aria-label={`Quitar a ${nino.nombre}`}
                        className="tappable shrink-0 rounded-full p-1.5 text-label-tertiary
                                   transition-colors hover:bg-critical/12 hover:text-critical"
                      >
                        <X size={14} strokeWidth={2.4} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {ninosSeleccionados.length === 0 && (
                  <p className="rounded-control border border-dashed border-separator/70 px-4 py-6
                                text-center text-footnote text-label-tertiary sm:col-span-2">
                    Todavía no hay estudiantes en esta ruta
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
        loading={saving}
        title="Eliminar recorrido"
        message="Esta ruta se borrará de forma permanente. No se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default Recorridos;
