import { useState } from 'react';
import {
  CloudOff, CloudUpload, RefreshCw, TriangleAlert, Droplets, Route as RouteIcon, ChevronRight,
} from 'lucide-react';
import { useConexion } from '../lib/conexion';
import { usePendientes } from '../context/PendientesContext';
import { comoRegistro } from '../lib/pendientes';
import { MESES, dosDigitos } from '../lib/fechas';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const TIPO_RECORRIDO = { traer: 'Traer', llevar: 'Llevar' };
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** "hoy, 14:32", "ayer, 09:05" o "23 sep, 14:32". */
const cuando = (ms) => {
  const d = new Date(ms);
  const hora = `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return `hoy, ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `ayer, ${hora}`;
  return `el ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3).toLowerCase()}, ${hora}`;
};

/** "mar 23 sep" a partir de YYYY-MM-DD, sin pasar por la zona horaria. */
const dia = (fecha) => {
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return fecha;
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`;
};

const TONOS = {
  caution: 'border-caution/30 bg-caution/10 text-caution',
  info: 'border-info/25 bg-info/10 text-info',
  critical: 'border-critical/30 bg-critical/10 text-critical',
};

/** Una fila de la lista de pendientes. */
const Pendiente = ({ item, ocupado, onDescartar, onReintentar }) => {
  const [confirmando, setConfirmando] = useState(false);
  const r = comoRegistro(item);
  const esRiego = item.tipo === 'riego';
  const Icono = esRiego ? Droplets : RouteIcon;
  const rechazado = item.estado === 'rechazado';

  return (
    <li className="rounded-control border border-separator/60 bg-surface-secondary p-3">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-field
                          ${esRiego ? 'bg-info/14 text-info' : 'bg-positive/14 text-positive'}`}>
          <Icono size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-subhead font-semibold text-label">
              {esRiego ? 'Riego' : `Recorrido · ${TIPO_RECORRIDO[r.tipo_recorrido] || r.tipo_recorrido}`}
            </p>
            <Badge tone={rechazado ? 'critical' : 'caution'} className="!py-0.5">
              {rechazado ? 'No se pudo enviar' : 'Por enviar'}
            </Badge>
          </div>
          <p className="tabular mt-0.5 text-footnote text-label-secondary">
            {dia(r.fecha)} · {String(esRiego ? r.hora : r.hora_inicio).slice(0, 5)}
            {!esRiego && r.vehiculo_descripcion ? ` · ${r.vehiculo_descripcion}` : ''}
            {' · '}{dinero.format(parseFloat(r.costo) || 0)}
          </p>
          {rechazado && item.error && (
            <p className="mt-1.5 text-footnote text-critical">{item.error}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {rechazado && !confirmando && (
          <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => onReintentar(item.id)}
            icon={<RefreshCw size={14} strokeWidth={2.1} />}>
            Reintentar
          </Button>
        )}
        {confirmando ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => setConfirmando(false)}>No, conservarlo</Button>
            <Button size="sm" variant="destructive" disabled={ocupado} onClick={() => onDescartar(item.id)}>
              Sí, descartarlo
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => setConfirmando(true)}
            className="hover:bg-critical/12 hover:text-critical">
            Descartar
          </Button>
        )}
      </div>
    </li>
  );
};

/**
 * Aviso de conexión y de lo que queda por enviar.
 *
 * Solo aparece cuando hay algo que decir: sin conexión, con registros
 * guardados en el teléfono o con alguno que el servidor rechazó. Sin conexión
 * dice de cuándo son los datos que se ven, para que nadie tome una copia
 * vieja por la situación actual.
 */
const EstadoDeConexion = () => {
  const { enLinea, copiaDe } = useConexion();
  const { porEnviar, enviando, enviarAhora, descartar, reintentar } = usePendientes();
  const [abierto, setAbierto] = useState(false);

  const rechazados = porEnviar.filter((p) => p.estado === 'rechazado').length;
  const sinEnviar = porEnviar.length - rechazados;
  const hayLista = porEnviar.length > 0;

  let tono = 'info';
  let Icono = CloudUpload;
  let titulo;
  let detalle;

  if (!enLinea) {
    tono = 'caution';
    Icono = CloudOff;
    titulo = 'Sin conexión';
    detalle = copiaDe
      ? `Ves lo guardado ${cuando(copiaDe)}`
      : 'Lo que registres se guarda en este teléfono';
    if (hayLista) detalle = `${porEnviar.length} por enviar · ${detalle.charAt(0).toLowerCase()}${detalle.slice(1)}`;
  } else if (enviando) {
    Icono = RefreshCw;
    titulo = 'Enviando lo guardado sin conexión…';
    detalle = `${sinEnviar} por enviar`;
  } else if (rechazados > 0) {
    tono = 'critical';
    Icono = TriangleAlert;
    titulo = rechazados === 1 ? '1 registro no se pudo enviar' : `${rechazados} registros no se pudieron enviar`;
    detalle = 'Ábrelo para ver qué pasó';
  } else {
    titulo = sinEnviar === 1 ? '1 registro por enviar' : `${sinEnviar} registros por enviar`;
    detalle = 'Se envían solos en cuanto haya conexión';
  }

  const Contenido = (
    <>
      <Icono
        size={17} strokeWidth={2.2}
        className={`shrink-0 ${enviando && enLinea ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-footnote font-semibold">{titulo}</span>
        <span className="block truncate text-caption opacity-85">{detalle}</span>
      </span>
      {hayLista && <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 opacity-70" aria-hidden="true" />}
    </>
  );

  const clases = `mb-4 flex w-full items-center gap-3 rounded-control border px-3.5 py-2.5 text-left ${TONOS[tono]}`;

  return (
    <>
      {/* La región existe siempre, vacía o no: un lector de pantalla solo
          anuncia los cambios de una región que ya estaba en la página. */}
      <div role="status" aria-live="polite">
        {hayLista ? (
          <button type="button" onClick={() => setAbierto(true)} className={`tappable ${clases}`}>
            {Contenido}
          </button>
        ) : (
          (!enLinea) && <div className={clases}>{Contenido}</div>
        )}
      </div>

      <Modal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title="Guardado en este teléfono"
        description="Registros hechos sin conexión que aún no han llegado al servidor. Se envían solos cuando hay conexión y la app está abierta."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cerrar</Button>
            <Button
              onClick={enviarAhora}
              loading={enviando}
              disabled={sinEnviar === 0}
              icon={<RefreshCw size={16} strokeWidth={2.1} />}
            >
              Enviar ahora
            </Button>
          </div>
        }
      >
        {porEnviar.length === 0 ? (
          <p className="py-6 text-center text-subhead text-label-secondary">
            Todo lo registrado ya llegó al servidor.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {porEnviar.map((item) => (
              <Pendiente
                key={item.id}
                item={item}
                ocupado={enviando}
                onDescartar={descartar}
                onReintentar={reintentar}
              />
            ))}
          </ul>
        )}
        {!enLinea && porEnviar.length > 0 && (
          <p className="mt-4 text-footnote text-label-tertiary">
            Ahora mismo no hay conexión. Se enviarán en cuanto vuelva.
          </p>
        )}
      </Modal>
    </>
  );
};

export default EstadoDeConexion;
