import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus, Droplets, Pencil, Trash2, FileDown, ChevronLeft, ChevronRight,
  DollarSign, CalendarDays,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { getAllRiegos, deleteRiego, mensajeDeError, fueBien, mensajeDeRespuesta } from '../services/api';
import { generarReporteRiegosPdf } from '../lib/reporteRiegosPdf.js';
import ConfirmModal from '../components/ui/ConfirmModal';
import RiegoModal from '../components/RiegoModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import CalendarioMes from '../components/ui/CalendarioMes';
import { MESES, dosDigitos, rangoDelMes, diaDeFecha } from '../lib/fechas';
import { crossFade, springSheet } from '../lib/motion';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const etiquetaFecha = (fecha) => {
  const [a, m, d] = String(fecha).split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${dosDigitos(d)}`;
};

const Riegos = () => {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());

  const [riegos, setRiegos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [enEdicion, setEnEdicion] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [borrando, setBorrando] = useState(false);

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

  /** Riegos agrupados por día del mes: un día puede tener más de uno. */
  const porDia = useMemo(() => {
    const mapa = {};
    ordenados.forEach((riego) => {
      const dia = diaDeFecha(riego.fecha);
      if (dia) (mapa[dia] ??= []).push(riego);
    });
    return mapa;
  }, [ordenados]);

  const diasRegados = Object.keys(porDia).length;

  const cambiarMes = (delta) => {
    const d = new Date(anio, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAnio(d.getFullYear());
  };

  const abrirNuevo = () => { setEnEdicion(null); setMostrarModal(true); };
  const abrirEdicion = (riego) => { setEnEdicion(riego); setMostrarModal(true); };

  const confirmarBorrado = async () => {
    if (!aEliminar) return;
    setBorrando(true);
    try {
      const respuesta = await deleteRiego(aEliminar);
      if (fueBien(respuesta)) { showAlert('success', 'Riego eliminado'); cargar(); }
      else showAlert('error', mensajeDeRespuesta(respuesta));
    } catch (error) {
      showAlert('error', 'No se pudo eliminar: ' + mensajeDeError(error));
    } finally {
      setBorrando(false);
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
        usuario: { nombre: user?.nombre, usuario: user?.usuario },
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
            <Button onClick={abrirNuevo} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo riego
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Riegos del mes" value={loading ? '—' : ordenados.length}
          icon={Droplets} tone="info"
          footnote={loading
            ? `${MESES[mes - 1]} ${anio}`
            : `${diasRegados} ${diasRegados === 1 ? 'día' : 'días'} con riego`}
        />
        <StatCard
          label="Total del mes" value={loading ? '—' : dinero.format(total)}
          icon={DollarSign} tone="positive" footnote="Suma de los riegos registrados"
        />
      </div>

      <Card padding="p-0" className="mb-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-separator/50 p-5">
          <CalendarDays size={18} strokeWidth={2.1} className="text-info" />
          <h2 className="text-headline font-semibold text-label">Días con riego</h2>
        </div>

        <div className="p-3 sm:p-5">
          <CalendarioMes
            mes={mes}
            anio={anio}
            altura="h-12 sm:h-16"
            renderDia={(numero) => {
              const delDia = porDia[numero];
              if (!delDia) return null;

              return (
                <div className="mt-auto flex flex-col items-center gap-0.5">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-info/16 text-info sm:h-6 sm:w-6"
                  >
                    <Droplets size={12} strokeWidth={2.2} />
                  </span>
                  {/* La hora solo cabe en pantalla grande; en el móvil basta la gota. */}
                  <span className="tabular hidden text-caption2 text-label-tertiary sm:block">
                    {delDia.length > 1
                      ? `${delDia.length} riegos`
                      : String(delDia[0].hora).slice(0, 5)}
                  </span>
                  <span className="sr-only">
                    {delDia.length} {delDia.length === 1 ? 'riego' : 'riegos'}
                  </span>
                </div>
              );
            }}
          />
        </div>
      </Card>

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
            <Button onClick={abrirNuevo} icon={<Plus size={17} strokeWidth={2.3} />}>
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
                      type="button" onClick={() => abrirEdicion(riego)}
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

      <RiegoModal
        abierto={mostrarModal}
        onCerrar={() => setMostrarModal(false)}
        riego={enEdicion}
        onGuardado={cargar}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setAEliminar(null); }}
        onConfirm={confirmarBorrado}
        title="Eliminar riego"
        message="El registro dejará de aparecer en los listados y en el PDF. ¿Continuar?"
        confirmText="Eliminar"
        loading={borrando}
      />
    </div>
  );
};

export default Riegos;
