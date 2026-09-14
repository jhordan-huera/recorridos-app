import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus, Bus, Zap, Pencil, Trash2, Car, Building2, FileText, CarTaxiFront } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAlert } from '../context/AlertContext';
import {
  createVehiculo, deleteVehiculo, updateVehiculo, getAllVehiculos, mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import SearchField from '../components/ui/SearchField';
import { crossFade, springSheet } from '../lib/motion';

const emptyForm = {
  tipo: 'propio', descripcion: '', placa: '', capacidad: '', costo_por_recorrido: '',
};

// Iconografía clara en lugar de emoji: un glifo del sistema se lee igual en
// cualquier plataforma y hereda el color del tema.
const tipoConfig = {
  propio: { label: 'Propio', Icon: Car, tone: 'accent' },
  empresa: { label: 'Empresa', Icon: Building2, tone: 'positive' },
  alquilado: { label: 'Alquilado', Icon: FileText, tone: 'highlight' },
  taxi: { label: 'Taxi', Icon: CarTaxiFront, tone: 'caution' },
};

const getTipo = (tipo) => tipoConfig[tipo] || { label: tipo || 'Otro', Icon: Car, tone: 'neutral' };

const Vehiculos = () => {
  const { vehiculos, setVehiculos } = useApp();
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();

  const [formData, setFormData] = useState(emptyForm);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehiculoAEliminar, setVehiculoAEliminar] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVehiculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehiculos = async () => {
    setLoading(true);
    try {
      setVehiculos(await getAllVehiculos());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los vehículos: ' + mensajeDeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const resetForm = () => {
    setEditMode(false);
    setEditId(null);
    setFormData(emptyForm);
  };

  const handleCloseModal = () => {
    resetForm();
    setMostrarModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.descripcion || !formData.costo_por_recorrido) {
      showAlert('warning', 'La descripción y el costo son obligatorios');
      return;
    }

    setSaving(true);
    const data = {
      tipo: formData.tipo,
      descripcion: formData.descripcion,
      placa: formData.placa || null,
      capacidad: formData.capacidad ? parseInt(formData.capacidad, 10) : null,
      costo_por_recorrido: formData.costo_por_recorrido ? parseFloat(formData.costo_por_recorrido) : 0,
    };

    try {
      const response = editMode
        ? await updateVehiculo(editId, data)
        : await createVehiculo(data);

      if (fueBien(response)) {
        showAlert('success', editMode ? 'Vehículo actualizado' : 'Vehículo registrado');
        resetForm();
        setMostrarModal(false);
        loadVehiculos();
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', `No se pudo ${editMode ? 'actualizar' : 'registrar'}: ` + mensajeDeError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!vehiculoAEliminar) return;
    setSaving(true);
    try {
      const response = await deleteVehiculo(vehiculoAEliminar);
      if (fueBien(response)) {
        showAlert('success', 'Vehículo desactivado');
        loadVehiculos();
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setVehiculoAEliminar(null);
    }
  };

  const handleEdit = (vehiculo) => {
    setEditMode(true);
    setEditId(vehiculo.id);
    setFormData({
      tipo: vehiculo.tipo,
      descripcion: vehiculo.descripcion,
      placa: vehiculo.placa || '',
      capacidad: vehiculo.capacidad || '',
      costo_por_recorrido: vehiculo.costo_por_recorrido || '',
    });
    setMostrarModal(true);
  };

  const filteredVehiculos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = vehiculos || [];
    if (!term) return list;
    return list.filter((vehiculo) =>
      vehiculo.descripcion.toLowerCase().includes(term)
      || (vehiculo.placa && vehiculo.placa.toLowerCase().includes(term))
    );
  }, [vehiculos, searchTerm]);

  return (
    <div className="pb-4">
      <PageHeader
        title="Vehículos"
        subtitle="Flota disponible y costo por recorrido"
        actions={
          <>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar vehículo…"
              className="w-full sm:w-60"
            />
            <Button
              onClick={() => { resetForm(); setMostrarModal(true); }}
              icon={<Plus size={17} strokeWidth={2.3} />}
            >
              Nuevo vehículo
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Unidades en flota"
          value={loading ? '—' : vehiculos.length}
          icon={Bus}
          tone="caution"
          footnote="Disponibles para asignar"
        />
        <StatCard
          label="Operatividad"
          value="100%"
          icon={Zap}
          tone="positive"
          footnote="Todas las unidades en servicio"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => <CardSkeleton key={index} lineas={3} />)}
        </div>
      ) : filteredVehiculos.length === 0 ? (
        <EmptyState
          icon={Bus}
          title={searchTerm ? 'Sin coincidencias' : 'Todavía no hay vehículos'}
          message={
            searchTerm
              ? 'Ningún vehículo coincide con esa búsqueda.'
              : 'Registra el primer transporte para poder asignarlo a un recorrido.'
          }
          action={
            !searchTerm && (
              <Button onClick={() => { resetForm(); setMostrarModal(true); }} icon={<Plus size={17} strokeWidth={2.3} />}>
                Nuevo vehículo
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filteredVehiculos.map((vehiculo) => {
              const { label, Icon, tone } = getTipo(vehiculo.tipo);
              return (
                <motion.div
                  key={vehiculo.id}
                  layout
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={reduceMotion ? crossFade : springSheet}
                >
                  <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
                    <div className="flex-1 p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-field bg-fill/10 text-label-secondary">
                          <Icon size={20} strokeWidth={1.9} />
                        </span>
                        <Badge tone={tone}>{label}</Badge>
                      </div>

                      <h3 className="truncate text-headline font-semibold text-label" title={vehiculo.descripcion}>
                        {vehiculo.descripcion}
                      </h3>
                      <p className="tabular mt-0.5 text-footnote text-label-tertiary">
                        {vehiculo.placa || 'Sin placa'}
                      </p>

                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-separator/50 pt-4">
                        <div>
                          <dt className="text-caption text-label-tertiary">Capacidad</dt>
                          <dd className="tabular mt-0.5 text-subhead font-medium text-label">
                            {vehiculo.capacidad || 0} pasajeros
                          </dd>
                        </div>
                        <div>
                          <dt className="text-caption text-label-tertiary">Costo por recorrido</dt>
                          <dd className="tabular mt-0.5 text-subhead font-semibold text-positive">
                            ${parseFloat(vehiculo.costo_por_recorrido || 0).toFixed(2)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex items-center gap-2 border-t border-separator/60 bg-surface-secondary px-4 py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(vehiculo)}
                        icon={<Pencil size={14} strokeWidth={2.1} />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar ${vehiculo.descripcion}`}
                        className="px-2.5 text-label-secondary hover:bg-critical/14 hover:text-critical"
                        onClick={() => { setVehiculoAEliminar(vehiculo.id); setShowDeleteModal(true); }}
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        loading={saving}
        title="Desactivar vehículo"
        message="El vehículo dejará de estar disponible para nuevos recorridos. Los recorridos históricos podrían verse afectados."
        confirmText="Desactivar"
        type="danger"
      />

      <Modal
        isOpen={mostrarModal}
        onClose={handleCloseModal}
        title={editMode ? 'Editar vehículo' : 'Nuevo vehículo'}
        size="max-w-xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" form="form-vehiculo" loading={saving}>
              {editMode ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <form id="form-vehiculo" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Tipo" name="tipo" value={formData.tipo} onChange={handleChange} required disabled={saving}>
              <option value="propio">Propio</option>
              <option value="empresa">Empresa</option>
              <option value="alquilado">Alquilado</option>
              <option value="taxi">Taxi</option>
            </Select>
            <Input
              label="Placa" name="placa" value={formData.placa} onChange={handleChange}
              placeholder="ABC-1234" className="uppercase" disabled={saving}
            />
          </div>

          <Input
            label="Descripción o modelo" name="descripcion" value={formData.descripcion}
            onChange={handleChange} placeholder="Toyota Hilux blanca 2023" required disabled={saving}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Capacidad" type="number" name="capacidad" value={formData.capacidad}
              onChange={handleChange} placeholder="4" min="1" disabled={saving}
              hint="Número de pasajeros"
            />
            <Input
              label="Costo por recorrido" type="number" step="0.01" name="costo_por_recorrido"
              value={formData.costo_por_recorrido} onChange={handleChange}
              placeholder="0.00" required min="0" disabled={saving} hint="En dólares"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vehiculos;
