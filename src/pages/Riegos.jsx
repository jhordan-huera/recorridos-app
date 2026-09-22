import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus, Droplets, Pencil, Trash2, FileDown, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import {
  getAllRiegos, createRiego, updateRiego, deleteRiego,
  mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import { generarReporteRiegosPdf } from '../lib/reporteRiegosPdf.js';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { crossFade, springSheet } from '../lib/motion';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const dosDigitos = (n) => String(n).padStart(2, '0');
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Primer y último día del mes en YYYY-MM-DD, sin pasar por Date para no
 *  arrastrar desfases de zona horaria. */
const rangoDelMes = (mes, anio) => ({
  desde: `${anio}-${dosDigitos(mes)}-01`,
  hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(new Date(anio, mes, 0).getDate())}`,
});

const etiquetaFecha = (fecha) => {
  const [a, m, d] = String(fecha).split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${dosDigitos(d)}`;
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
};

/* El costo vacío NO se envía: la base de datos pone 1.00. Prefijarlo aquí
   duplicaría el valor por defecto en dos sitios que algún día discreparían. */
const formVacio = () => ({ fecha: hoyISO(), hora: '07:00', costo: '' });

const Riegos = () => {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());

  const [riegos, setRiegos] = useState([]);
  const [formData, setFormData] = useState(formVacio);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setRiegos(await getAllRiegos(rangoDelMes(mes, anio)));
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los riegos: ' + mensajeDeError(error));
    } finally {
      setLoading(false);
    }
  }, [mes, anio, showAlert]);

  useEffect(() => { cargar(); }, [cargar]);

  const ordenados = useMemo(
    () => [...riegos].sort((a, b) => (a.fecha === b.fecha
      ? String(a.hora).localeCompare(String(b.hora))
      : String(a.fecha).localeCompare(String(b.fecha)))),
    [riegos]
  );

  const total = useMemo(
    () => ordenados.reduce((s, r) => s + (parseFloat(r.costo) || 0), 0),
    [ordenados]
  );

  const cambiarMes = (delta) => {
    const d = new Date(anio, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAnio(d.getFullYear());
  };

  const resetForm = () => { setEditId(null); setFormData(formVacio()); };
  const cerrarModal = () => { resetForm(); setMostrarModal(false); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.fecha || !formData.hora) {
      showAlert('warning', 'La fecha y la hora son obligatorias');
      return;
    }

    setSaving(true);
    const datos = { fecha: formData.fecha, hora: formData.hora };
    // Solo se manda si el usuario escribió algo; si no, manda el DEFAULT.
    if (String(formData.costo).trim() !== '') datos.costo = parseFloat(formData.costo);

    try {
      const respuesta = editId ? await updateRiego(editId, datos) : await createRiego(datos);
      if (fueBien(respuesta)) {
        showAlert('success', editId ? 'Riego actualizado' : 'Riego registrado');
        cerrarModal();
        cargar();
      } else {
        showAlert('error', mensajeDeRespuesta(respuesta));
      }
    } catch (error) {
      showAlert('error', `No se pudo ${editId ? 'actualizar' : 'registrar'}: ` + mensajeDeError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (riego) => {
    setEditId(riego.id);
    setFormData({
      fecha: String(riego.fecha).slice(0, 10),
      hora: String(riego.hora).slice(0, 5),
      costo: riego.costo ?? '',
    });
    setMostrarModal(true);
  };

  const confirmarBorrado = async () => {
    if (!aEliminar) return;
    setSaving(true);
    try {
      const respuesta = await deleteRiego(aEliminar);
      if (fueBien(respuesta)) { showAlert('success', 'Riego eliminado'); cargar(); }
      else showAlert('error', mensajeDeRespuesta(respuesta));
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setAEliminar(null);
    }
  };

  const descargarPdf = async () => {
    if (ordenados.length === 0) {
      showAlert('warning', 'No hay riegos en este mes para exportar');
      return;
    }
    try {
      await generarReporteRiegosPdf({
        riegos: ordenados, mes, anio,
        usuario: { nombre: user?.nombre, email: user?.email },
      });
      showAlert('success', 'Reporte de riegos generado');
    } catch (error) {
      showAlert('error', 'No se pudo generar el PDF: ' + mensajeDeError(error));
    }
  };

  return (
    <div className="pb-4">
      <PageHeader
        title="Riegos"
        subtitle="Registro de riegos de césped"
        actions={
          <>
            <div className="flex items-center gap-1 rounded-field border border-separator/70 bg-surface px-1">
              <button
                type="button" onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
                className="rounded-field p-2 text-label-secondary hover:bg-fill/10"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="tabular min-w-[9.5rem] text-center text-subhead font-medium text-label">
                {MESES[mes - 1]} {anio}
              </span>
              <button
                type="button" onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
                className="rounded-field p-2 text-label-secondary hover:bg-fill/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <Button variant="secondary" onClick={descargarPdf} icon={<FileDown size={17} strokeWidth={2.1} />}>
              PDF
            </Button>
            <Button
              onClick={() => { resetForm(); setMostrarModal(true); }}
              icon={<Plus size={17} strokeWidth={2.3} />}
            >
              Nuevo riego
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Riegos del mes" value={loading ? '—' : ordenados.length}
          icon={Droplets} tone="info" footnote={`${MESES[mes - 1]} ${anio}`}
        />
        <StatCard
          label="Total del mes" value={loading ? '—' : dinero.format(total)}
          icon={DollarSign} tone="positive" footnote="Suma de los riegos registrados"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} lineas={2} />)}
        </div>
      ) : ordenados.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="Sin riegos este mes"
          message={`No hay ningún riego registrado en ${MESES[mes - 1].toLowerCase()} de ${anio}.`}
          action={
            <Button onClick={() => { resetForm(); setMostrarModal(true); }} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo riego
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {ordenados.map((riego) => (
              <motion.div
                key={riego.id}
                layout
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={reduceMotion ? crossFade : springSheet}
              >
                <Card className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-info/14 text-info">
                      <Droplets size={18} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <p className="tabular text-headline font-semibold text-label">
                        {etiquetaFecha(riego.fecha)}
                      </p>
                      <p className="tabular text-footnote text-label-secondary">
                        {String(riego.hora).slice(0, 5)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <span className="tabular mr-1 text-headline font-semibold text-label">
                      {dinero.format(parseFloat(riego.costo) || 0)}
                    </span>
                    <button
                      type="button" onClick={() => handleEdit(riego)}
                      aria-label={`Editar riego del ${etiquetaFecha(riego.fecha)}`}
                      className="rounded-field p-2 text-label-secondary hover:bg-fill/10"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAEliminar(riego.id); setShowDeleteModal(true); }}
                      aria-label={`Eliminar riego del ${etiquetaFecha(riego.fecha)}`}
                      className="rounded-field p-2 text-label-secondary hover:bg-critical/12 hover:text-critical"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        isOpen={mostrarModal}
        onClose={cerrarModal}
        title={editId ? 'Editar riego' : 'Nuevo riego'}
        description={editId ? null : 'Si dejas el costo vacío se registra como $1.00.'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Fecha" type="date" name="fecha" value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required disabled={saving}
          />
          <Input
            label="Hora" type="time" name="hora" value={formData.hora}
            onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
            required disabled={saving}
          />
          <Input
            label="Costo" type="number" name="costo" step="0.01" min="0"
            placeholder="1.00"
            value={formData.costo}
            onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
            disabled={saving}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setAEliminar(null); }}
        onConfirm={confirmarBorrado}
        title="Eliminar riego"
        message="El registro dejará de aparecer en los listados y en el PDF. ¿Continuar?"
        confirmText="Eliminar"
      />
    </div>
  );
};

export default Riegos;
