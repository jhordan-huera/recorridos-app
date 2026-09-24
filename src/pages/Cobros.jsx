import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown, Banknote, Clock, CircleCheck, CircleDashed, AlertTriangle } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import {
  getCobros, getDatosDeCobro, marcarCobrado, deshacerCobro,
  mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import { construirReportePdf } from '../lib/reportePdf';
import { construirReporteRiegosPdf } from '../lib/reporteRiegosPdf.js';
import { construirReporteGeneralPdf } from '../lib/reporteGeneralPdf.js';
import { MESES } from '../lib/fechas';
import PestanasAdmin from '../components/PestanasAdmin';
import SelectorDeMes from '../components/ui/SelectorDeMes';
import Kpi from '../components/resumen/Kpi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton from '../components/ui/Skeleton';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fechaCorta = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' });
const fecha = (valor) => (valor ? fechaCorta.format(new Date(valor)) : '');

const totalActual = (f) => (Number(f.total_recorridos) || 0) + (Number(f.total_riegos) || 0);

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2)
  .map((p) => p[0].toUpperCase()).join('') || '?';

/**
 * Estado de cada fila tal como se presenta. "Reabierto" no es un estado de la
 * base: es un mes abierto que ya se había cobrado, y merece su propio aviso.
 */
const presentacion = (f) => {
  if (f.estado === 'terminado') return { texto: 'Por cobrar', clases: 'bg-caution/14 text-caution', Icono: Clock };
  if (f.estado === 'cobrado') return { texto: 'Cobrado', clases: 'bg-positive/14 text-positive', Icono: CircleCheck };
  if (f.cobrado_en) return { texto: 'Reabierto', clases: 'bg-critical/12 text-critical', Icono: AlertTriangle };
  return { texto: 'Sin terminar', clases: 'bg-fill/12 text-label-secondary', Icono: CircleDashed };
};

/** El mes que normalmente toca cobrar: el que acaba de terminar. */
const mesAnterior = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { mes: d.getMonth() + 1, anio: d.getFullYear() };
};

const EsqueletoFila = () => (
  <Card className="flex items-center gap-4">
    <Skeleton variant="bare" className="h-11 w-11 rounded-full" />
    <div className="flex-1">
      <Skeleton variant="bare" className="h-4 w-40" />
      <Skeleton variant="bare" className="mt-2 h-3 w-56" />
    </div>
    <Skeleton variant="bare" className="h-6 w-20" />
  </Card>
);

/**
 * Cobros: los meses que los usuarios dieron por terminados.
 *
 * Es la única pantalla desde la que el administrador llega a los datos de
 * otra cuenta, y solo de meses cerrados: de un mes abierto la API no devuelve
 * ni las cifras. El documento que se descarga es el mismo estado de cuenta
 * que el usuario ve en su Resumen, emitido a su nombre.
 */
const Cobros = () => {
  const { showAlert } = useAlert();
  const [{ mes, anio }, setPeriodo] = useState(mesAnterior);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(null);      // user_id con una acción en curso
  const [confirmar, setConfirmar] = useState(null);  // { tipo: 'cobrar' | 'deshacer', fila }

  const nombreMes = `${MESES[mes - 1].toLowerCase()} de ${anio}`;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await getCobros(anio, mes);
      setFilas(data.data || []);
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los cobros: ' + mensajeDeError(error));
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [anio, mes, showAlert]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarMes = (delta) => {
    const d = new Date(anio, mes - 1 + delta, 1);
    setPeriodo({ mes: d.getMonth() + 1, anio: d.getFullYear() });
  };

  const resumen = useMemo(() => {
    const porCobrar = filas.filter((f) => f.estado === 'terminado');
    const cobrados = filas.filter((f) => f.estado === 'cobrado');
    return {
      porCobrar: porCobrar.reduce((s, f) => s + totalActual(f), 0),
      nPorCobrar: porCobrar.length,
      cobrado: cobrados.reduce((s, f) => s + (Number(f.total_cobrado) || 0), 0),
      nCobrados: cobrados.length,
      sinTerminar: filas.filter((f) => f.estado === 'abierto').length,
    };
  }, [filas]);

  /**
   * El estado de cuenta del usuario, generado aquí con sus datos del mes.
   * El tipo sale de lo que hay: con recorridos y riegos, el general; con uno
   * solo, el de ese servicio. Así coincide con el total que se cobra, que
   * suma los dos. El nombre del archivo lleva el del usuario: descargar los
   * de varios usuarios del mismo mes daría archivos con el mismo nombre.
   */
  const descargar = async (fila) => {
    setOcupado(fila.user_id);
    try {
      const { data } = await getDatosDeCobro(fila.user_id, anio, mes);
      const { usuario, recorridos, riegos } = data.data;
      const comun = { mes, anio, usuario: { nombre: usuario.nombre, usuario: usuario.usuario } };

      const { doc, nombre } = recorridos.length && riegos.length
        ? await construirReporteGeneralPdf({ ...comun, recorridos, riegos })
        : recorridos.length
          ? await construirReportePdf({ ...comun, recorridos })
          : await construirReporteRiegosPdf({ ...comun, riegos });

      doc.save(`${nombre.replace(/\.pdf$/, '')} - ${usuario.nombre}.pdf`);
    } catch (error) {
      showAlert('error', 'No se pudo generar el PDF: ' + mensajeDeError(error));
    } finally {
      setOcupado(null);
    }
  };

  const ejecutarConfirmacion = async () => {
    if (!confirmar) return;
    const { tipo, fila } = confirmar;
    setOcupado(fila.user_id);
    try {
      const respuesta = tipo === 'cobrar'
        ? await marcarCobrado(fila.user_id, anio, mes)
        : await deshacerCobro(fila.user_id, anio, mes);
      if (fueBien(respuesta)) {
        showAlert('success', tipo === 'cobrar'
          ? `${fila.nombre}: ${nombreMes} cobrado`
          : `${fila.nombre}: cobro deshecho`);
        await cargar();
      } else {
        showAlert('error', mensajeDeRespuesta(respuesta));
      }
    } catch (error) {
      showAlert('error', mensajeDeError(error));
    } finally {
      setOcupado(null);
      setConfirmar(null);
    }
  };

  return (
    <div className="pb-4">
      <PestanasAdmin />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-large-title font-bold tracking-tight text-label">Cobros</h1>
          <p className="mt-1 text-subhead text-label-secondary">
            Los meses que tus usuarios dieron por terminados
          </p>
        </div>
        <SelectorDeMes mes={mes} anio={anio} onCambiar={cambiarMes} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cargando ? [0, 1, 2].map((i) => (
          <Card key={i} className="flex items-center gap-4">
            <Skeleton variant="bare" className="h-12 w-12 rounded-full" />
            <div className="flex-1"><Skeleton variant="bare" className="h-3 w-24" /><Skeleton variant="bare" className="mt-2 h-8 w-28" /></div>
          </Card>
        )) : (
          <>
            <Kpi
              icono={Clock} etiqueta="Por cobrar" valor={dinero.format(resumen.porCobrar)}
              tendencia={{ texto: `${resumen.nPorCobrar} ${resumen.nPorCobrar === 1 ? 'mes' : 'meses'}`, direccion: 'igual', contra: 'terminados' }}
            />
            <Kpi
              icono={CircleCheck} etiqueta="Cobrado" valor={dinero.format(resumen.cobrado)}
              tendencia={{ texto: `${resumen.nCobrados} ${resumen.nCobrados === 1 ? 'mes' : 'meses'}`, direccion: 'igual', contra: 'ya pagados' }}
            />
            <Kpi
              icono={CircleDashed} etiqueta="Sin terminar" valor={resumen.sinTerminar}
              tendencia={{ texto: resumen.sinTerminar === 1 ? 'usuario' : 'usuarios', direccion: 'igual', contra: 'aún registrando' }}
            />
          </>
        )}
      </div>

      <ul className="space-y-3">
        {cargando ? [0, 1, 2].map((i) => <li key={i}><EsqueletoFila /></li>) : filas.length === 0 ? (
          <li>
            <Card className="py-10 text-center text-subhead text-label-secondary">
              Todavía no hay otros usuarios.
            </Card>
          </li>
        ) : filas.map((f) => {
          const { texto, clases, Icono } = presentacion(f);
          const cerrado = f.estado === 'terminado' || f.estado === 'cobrado';
          const total = f.estado === 'cobrado' ? Number(f.total_cobrado) : totalActual(f);
          // Un mes que se cobró, se reabrió y se volvió a terminar puede
          // sumar ahora otra cosa: la diferencia es lo que hay que mirar.
          const cambioTrasCobro = f.estado === 'terminado' && f.cobrado_en
            && Math.abs(totalActual(f) - Number(f.total_cobrado)) > 0.004;

          return (
            <li key={f.user_id}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/14 text-subhead font-semibold text-brand">
                    {iniciales(f.nombre)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <p className="break-words text-headline font-semibold text-label">{f.nombre}</p>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold ${clases}`}>
                        <Icono size={12} strokeWidth={2.4} aria-hidden="true" />
                        {texto}
                      </span>
                    </div>
                    <p className="tabular text-footnote text-label-secondary sm:truncate">
                      {cerrado
                        ? `${f.recorridos} recorridos · ${f.riegos} riegos · terminado el ${fecha(f.terminado_en)}`
                        : f.cobrado_en
                          ? `Lo reabrió el ${fecha(f.reabierto_en)}, después de cobrarse ${dinero.format(Number(f.total_cobrado))} el ${fecha(f.cobrado_en)}`
                          : `Todavía no ha terminado ${MESES[mes - 1].toLowerCase()}`}
                    </p>
                    {f.estado === 'cobrado' && (
                      <p className="text-footnote text-label-tertiary">Cobrado el {fecha(f.cobrado_en)}</p>
                    )}
                    {cambioTrasCobro && (
                      <p className="tabular text-footnote font-medium text-caution">
                        Ya se había cobrado {dinero.format(Number(f.total_cobrado))} el {fecha(f.cobrado_en)};
                        ahora suma {dinero.format(totalActual(f))}.
                      </p>
                    )}
                  </div>
                </div>

                {/* En el móvil una fila abierta no tiene importe ni acciones: el
                    guion solo ocuparía una línea para no decir nada. */}
                <div className={`flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end ${
                  cerrado ? '' : 'hidden sm:flex'
                }`}>
                  <p className="tabular text-title3 font-bold text-label">{cerrado ? dinero.format(total) : '—'}</p>
                  {cerrado && (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Button
                        variant="secondary" size="sm" className="!rounded-full"
                        onClick={() => descargar(f)} loading={ocupado === f.user_id && !confirmar}
                        disabled={ocupado !== null || total === 0}
                        icon={<FileDown size={14} strokeWidth={2.1} />}
                        aria-label={`Descargar el estado de cuenta de ${f.nombre}`}
                      >
                        PDF
                      </Button>
                      {f.estado === 'terminado' ? (
                        <Button
                          size="sm" className="!rounded-full" disabled={ocupado !== null}
                          onClick={() => setConfirmar({ tipo: 'cobrar', fila: f })}
                          icon={<Banknote size={14} strokeWidth={2.1} />}
                        >
                          Marcar cobrado
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm" className="!rounded-full" disabled={ocupado !== null}
                          onClick={() => setConfirmar({ tipo: 'deshacer', fila: f })}
                        >
                          Deshacer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        isOpen={Boolean(confirmar)}
        onClose={() => setConfirmar(null)}
        onConfirm={ejecutarConfirmacion}
        loading={ocupado !== null}
        type={confirmar?.tipo === 'deshacer' ? 'warning' : 'info'}
        title={confirmar?.tipo === 'deshacer' ? 'Deshacer el cobro' : 'Marcar como cobrado'}
        confirmText={confirmar?.tipo === 'deshacer' ? 'Deshacer cobro' : 'Marcar cobrado'}
        message={confirmar
          ? confirmar.tipo === 'deshacer'
            ? `${confirmar.fila.nombre}: ${nombreMes} volverá a quedar por cobrar.`
            : `${confirmar.fila.nombre}: se guardará ${nombreMes} como cobrado por ${dinero.format(totalActual(confirmar.fila))}.`
          : ''}
      />
    </div>
  );
};

export default Cobros;
