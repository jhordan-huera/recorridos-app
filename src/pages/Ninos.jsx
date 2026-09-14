import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus, GraduationCap, MapPin, Phone, Activity, Pencil, Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAlert } from '../context/AlertContext';
import {
  createNino, deleteNino, updateNino, getAllNinos, mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import SearchField from '../components/ui/SearchField';
import { crossFade, springSheet } from '../lib/motion';

const emptyForm = { nombre: '', apellidos: '', direccion: '', telefono_contacto: '' };

const Ninos = () => {
  const { ninos, setNinos } = useApp();
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();

  const [formData, setFormData] = useState(emptyForm);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ninoAEliminar, setNinoAEliminar] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadNinos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNinos = async () => {
    setLoading(true);
    try {
      // getAllNinos recorre todas las páginas: el listado devuelve 50 por
      // página y antes se perdían los siguientes sin ningún aviso.
      setNinos(await getAllNinos());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los estudiantes: ' + mensajeDeError(error));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.nombre || !formData.apellidos) {
      showAlert('warning', 'El nombre y los apellidos son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const response = editMode
        ? await updateNino(editId, formData)
        : await createNino(formData);

      if (fueBien(response)) {
        showAlert('success', editMode ? 'Estudiante actualizado' : 'Estudiante registrado');
        resetForm();
        setMostrarModal(false);
        loadNinos();
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
    if (!ninoAEliminar) return;
    setSaving(true);
    try {
      const response = await deleteNino(ninoAEliminar);
      if (fueBien(response)) {
        showAlert('success', 'Estudiante dado de baja');
        loadNinos();
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setNinoAEliminar(null);
    }
  };

  const handleEdit = (nino) => {
    setEditMode(true);
    setEditId(nino.id);
    setFormData({
      nombre: nino.nombre,
      apellidos: nino.apellidos,
      direccion: nino.direccion || '',
      telefono_contacto: nino.telefono_contacto || '',
    });
    setMostrarModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setMostrarModal(false);
  };

  const filteredNinos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ninos;
    return ninos.filter((nino) =>
      `${nino.nombre} ${nino.apellidos}`.toLowerCase().includes(term)
    );
  }, [ninos, searchTerm]);

  return (
    <div className="pb-4">
      <PageHeader
        title="Estudiantes"
        subtitle="Alumnos matriculados y sus datos de contacto"
        actions={
          <>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar estudiante…"
              className="w-full sm:w-60"
            />
            <Button
              onClick={() => { resetForm(); setMostrarModal(true); }}
              icon={<Plus size={17} strokeWidth={2.3} />}
            >
              Nuevo estudiante
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total matriculados"
          value={loading ? '—' : ninos.length}
          icon={GraduationCap}
          tone="brand"
          footnote="Activos en el ciclo actual"
        />
        <StatCard
          label="Estado del sistema"
          value="Óptimo"
          icon={Activity}
          tone="positive"
          footnote="Sincronización completada"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : filteredNinos.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={searchTerm ? 'Sin coincidencias' : 'Todavía no hay estudiantes'}
          message={
            searchTerm
              ? 'Ningún estudiante coincide con esa búsqueda.'
              : 'Registra al primer estudiante para empezar a asignarlo a recorridos.'
          }
          action={
            !searchTerm && (
              <Button onClick={() => { resetForm(); setMostrarModal(true); }} icon={<Plus size={17} strokeWidth={2.3} />}>
                Nuevo estudiante
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filteredNinos.map((nino) => (
              <motion.div
                key={nino.id}
                layout
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={reduceMotion ? crossFade : springSheet}
              >
                <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-field bg-brand/14 text-subhead font-semibold text-brand">
                        {nino.nombre?.charAt(0)}{nino.apellidos?.charAt(0)}
                      </span>
                      <Badge tone="positive">Activo</Badge>
                    </div>

                    <h3
                      className="truncate text-headline font-semibold text-label"
                      title={`${nino.nombre} ${nino.apellidos}`}
                    >
                      {nino.nombre} {nino.apellidos}
                    </h3>

                    <dl className="mt-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <dt className="mt-0.5 shrink-0 text-label-tertiary"><Phone size={14} strokeWidth={2} /></dt>
                        <dd className="text-footnote text-label-secondary">
                          {nino.telefono_contacto || 'Sin teléfono'}
                        </dd>
                      </div>
                      <div className="flex items-start gap-2">
                        <dt className="mt-0.5 shrink-0 text-label-tertiary"><MapPin size={14} strokeWidth={2} /></dt>
                        <dd className="line-clamp-2 text-footnote leading-relaxed text-label-secondary">
                          {nino.direccion || 'Sin dirección registrada'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Las acciones están siempre visibles. Esconderlas tras un
                      hover las deja inalcanzables con el dedo. */}
                  <div className="flex items-center gap-2 border-t border-separator/60 bg-surface-secondary px-4 py-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(nino)}
                      icon={<Pencil size={14} strokeWidth={2.1} />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Eliminar a ${nino.nombre} ${nino.apellidos}`}
                      className="px-2.5 text-label-secondary hover:bg-critical/14 hover:text-critical"
                      onClick={() => { setNinoAEliminar(nino.id); setShowDeleteModal(true); }}
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        loading={saving}
        title="Dar de baja al estudiante"
        message="Se eliminará su registro. Los recorridos históricos en los que aparezca podrían verse afectados."
        confirmText="Eliminar"
        type="danger"
      />

      <Modal
        isOpen={mostrarModal}
        onClose={handleCloseModal}
        title={editMode ? 'Editar estudiante' : 'Nuevo estudiante'}
        description={editMode ? undefined : 'Los campos marcados son obligatorios.'}
        size="max-w-xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" form="form-nino" loading={saving}>
              {editMode ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <form id="form-nino" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombres" name="nombre" value={formData.nombre} onChange={handleChange}
              placeholder="Juan Andrés" required disabled={saving} autoFocus
            />
            <Input
              label="Apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange}
              placeholder="Pérez García" required disabled={saving}
            />
          </div>

          <Input
            label="Dirección" name="direccion" value={formData.direccion} onChange={handleChange}
            placeholder="Av. Principal 123 y Calle Secundaria" icon={MapPin} disabled={saving}
          />

          <Input
            label="Teléfono de contacto" name="telefono_contacto" type="tel"
            value={formData.telefono_contacto} onChange={handleChange}
            placeholder="0999999999" icon={Phone} disabled={saving}
          />
        </form>
      </Modal>
    </div>
  );
};

export default Ninos;
