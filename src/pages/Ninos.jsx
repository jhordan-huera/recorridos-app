import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus, GraduationCap, MapPin, Phone, Activity, Pencil, Trash2, Route as RouteIcon, CalendarDays, Bus,
} from 'lucide-react';
import DetalleMovil, { TarjetaDetalle, DatosDetalle, TextoDetalle } from '../components/movil/DetalleMovil';
import { useRecorridosParaFicha } from '../hooks/useRecorridosParaFicha';
import { fechaCorta } from '../lib/fechas';
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
import { useEsMovil } from '../hooks/useMediaPreference';
import {
  CabeceraMovil, BuscadorMovil, CifrasMovil, TarjetaMovil, AvatarMovil,
} from '../components/movil/Movil';

const emptyForm = { nombre: '', apellidos: '', direccion: '', telefono_contacto: '' };

const Ninos = () => {
  const { ninos, setNinos } = useApp();
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();
  const esMovil = useEsMovil();
  const [detalle, setDetalle] = useState(null);
  const [verDetalle, setVerDetalle] = useState(false);
  const { pedir: pedirRecorridos, resumir } = useRecorridosParaFicha();
  const abrirDetalle = (nino) => { setDetalle(nino); setVerDetalle(true); pedirRecorridos(); };

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
      {esMovil ? (
        <>
          <CabeceraMovil
            titulo="Estudiantes"
            accion={{ etiqueta: 'Nuevo estudiante', icono: Plus, onClick: () => { resetForm(); setMostrarModal(true); } }}
          />
          <BuscadorMovil valor={searchTerm} onCambiar={setSearchTerm} placeholder="Buscar estudiante" />
          <CifrasMovil
            cifras={[
              { clave: 'total', icono: GraduationCap, valor: loading ? '—' : ninos.length, etiqueta: 'Estudiantes' },
              { clave: 'telefono', icono: Phone, valor: loading ? '—' : ninos.filter((n) => n.telefono_contacto).length, etiqueta: 'Con teléfono' },
              { clave: 'direccion', icono: MapPin, valor: loading ? '—' : ninos.filter((n) => n.direccion).length, etiqueta: 'Con dirección' },
            ]}
          />
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, index) => <CardSkeleton key={index} lineas={2} />)}
            </div>
          ) : filteredNinos.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={searchTerm ? 'Sin coincidencias' : 'Todavía no hay estudiantes'}
              message={searchTerm
                ? 'Ningún estudiante coincide con esa búsqueda.'
                : 'Registra al primer estudiante para empezar a asignarlo a recorridos.'}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filteredNinos.map((nino) => (
                <li key={nino.id}>
                  <TarjetaMovil
                    avatar={(
                      <AvatarMovil>
                        {nino.nombre?.charAt(0)}{nino.apellidos?.charAt(0)}
                      </AvatarMovil>
                    )}
                    titulo={`${nino.nombre} ${nino.apellidos}`}
                    subtitulo={nino.direccion || 'Sin dirección'}
                    valor={nino.telefono_contacto || 'Sin teléfono'}
                    iconoValor={Phone}
                    claseIconoValor="text-[rgb(var(--c-marino))]"
                    detalle="Teléfono de contacto"
                    onAbrir={() => abrirDetalle(nino)}
                    etiquetaAbrir={`Ver la ficha de ${nino.nombre} ${nino.apellidos}`}
                    onBorrar={() => { setNinoAEliminar(nino.id); setShowDeleteModal(true); }}
                    etiquetaBorrar={`Eliminar a ${nino.nombre} ${nino.apellidos}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
      <>
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

      </>
      )}

      {esMovil && detalle && (() => {
        const { lista, delMes, listo } = resumir((r) => (r.ninos || []).some((n) => String(n.nino_id) === String(detalle.id)));
        const nombre = `${detalle.nombre} ${detalle.apellidos}`;
        const ultimo = lista[0];
        const tipos = { traer: 'Traer', llevar: 'Llevar' };
        return (
          <DetalleMovil
            abierto={verDetalle}
            onCerrar={() => setVerDetalle(false)}
            cabecera="Ficha del estudiante"
            avatar={<span className="text-title2 font-bold">{detalle.nombre?.charAt(0)}{detalle.apellidos?.charAt(0)}</span>}
            nombre={nombre}
            subtitulo="Estudiante"
            cifras={[
              { clave: 'mes', icono: CalendarDays, valor: listo ? delMes.length : '…', etiqueta: 'Viajes del mes' },
              { clave: 'total', icono: RouteIcon, valor: listo ? lista.length : '…', etiqueta: 'Viajes en total' },
              { clave: 'ultimo', icono: Bus, valor: listo ? (ultimo ? fechaCorta(ultimo.fecha).split(' ').slice(1).join(' ') : '—') : '…', etiqueta: 'Último viaje' },
            ]}
            pestanas={[
              {
                clave: 'contacto',
                etiqueta: 'Contacto',
                contenido: (
                  <TarjetaDetalle titulo="Datos de contacto">
                    <DatosDetalle
                      datos={[
                        {
                          icono: Phone, etiqueta: 'Teléfono', ancho: true,
                          valor: detalle.telefono_contacto || 'Sin teléfono',
                          href: detalle.telefono_contacto ? `tel:${detalle.telefono_contacto}` : undefined,
                        },
                        {
                          icono: MapPin, etiqueta: 'Dirección', ancho: true,
                          valor: detalle.direccion || 'Sin dirección registrada',
                          href: detalle.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detalle.direccion)}` : undefined,
                        },
                      ]}
                    />
                  </TarjetaDetalle>
                ),
              },
              {
                clave: 'viajes',
                etiqueta: 'Recorridos',
                contenido: (
                  <TarjetaDetalle titulo="Últimos recorridos">
                    {!listo ? (
                      <TextoDetalle>Cargando…</TextoDetalle>
                    ) : lista.length === 0 ? (
                      <TextoDetalle>Todavía no ha viajado en ningún recorrido.</TextoDetalle>
                    ) : (
                      <ul className="space-y-2">
                        {lista.slice(0, 8).map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-3 rounded-[1rem] bg-[rgb(var(--c-pastel)/0.7)] px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-footnote font-semibold text-label">{fechaCorta(r.fecha)} · {String(r.hora_inicio).slice(0, 5)}</p>
                              <p className="truncate text-caption text-label-secondary">{tipos[r.tipo_recorrido] || r.tipo_recorrido} · {r.vehiculo_descripcion || 'Sin vehículo'}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TarjetaDetalle>
                ),
              },
            ]}
            onEditar={() => handleEdit(detalle)}
            etiquetaEditar="Editar estudiante"
            onEliminar={() => { setNinoAEliminar(detalle.id); setShowDeleteModal(true); }}
            etiquetaEliminar={`Eliminar a ${nombre}`}
            compartir={{
              title: nombre,
              text: [
                detalle.telefono_contacto ? `Teléfono: ${detalle.telefono_contacto}` : null,
                detalle.direccion ? `Dirección: ${detalle.direccion}` : null,
              ].filter(Boolean).join('\n') || nombre,
            }}
          />
        );
      })()}

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
