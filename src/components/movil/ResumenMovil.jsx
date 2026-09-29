import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, CalendarDays, Settings, BarChart3, ChevronLeft, ChevronRight, Wallet, Route as RouteIcon,
  Droplets, FileDown, Lock, LockOpen,
} from 'lucide-react';
import { MESES } from '../../lib/fechas';
import { haptics } from '../../lib/motion';
import {
  BotonCircular, SeccionMovil, InsigniaMovil, AvatarMovil, TARJETA_PASTEL,
} from './Movil';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const saludo = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/** "lun 28 sep" a partir de YYYY-MM-DD, sin pasar por la zona horaria. */
const dia = (fecha) => {
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '';
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`;
};

/** Píldora de acción: la principal en marino, el resto en pastel. */
const Chip = ({ children, onClick, principal = false }) => (
  <button
    type="button"
    onClick={() => { haptics.tick(); onClick(); }}
    className={`tappable flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-footnote font-semibold transition-colors ${
      principal ? 'bg-[rgb(var(--c-marino))] text-white shadow-level-1' : 'bg-[rgb(var(--c-pastel))] text-label'
    }`}
  >
    {children}
  </button>
);

/** Un dato de la tarjeta del mes, como los "Fecha / Hora" de una cita. */
const Dato = ({ icono: Icono, etiqueta, valor }) => (
  <div className="flex min-w-0 items-center gap-2 rounded-[1rem] bg-[rgb(var(--c-pastel)/0.6)] px-2.5 py-2">
    <Icono size={17} strokeWidth={2} className="shrink-0 text-[rgb(var(--c-marino))]" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-caption2 text-label-secondary">{etiqueta}</p>
      <p className="tabular truncate text-footnote font-bold text-label">{valor}</p>
    </div>
  </div>
);

/**
 * Cabecera del Resumen en el móvil: saludo, la pregunta del día, acciones
 * rápidas, la tarjeta del mes (con su selector, cifras y acciones) y lo
 * último registrado en dos columnas. Todo lo que viene después en el Resumen
 * (cifras con comparación, gráficas, calendario…) sigue igual debajo.
 */
const ResumenMovil = ({
  nombre, inicial,
  mes, anio, onCambiarMes,
  estadoDelMes, total, datos, cargando,
  accionMes, onPdf, pdfDeshabilitado,
  onNuevoRecorrido, onNuevoRiego, onCalendario, onGraficas,
  ultimos,
}) => (
  <div className="mb-2">
    {/* Saludo */}
    <div className="mb-5 flex items-center gap-3">
      <Link to="/perfil" aria-label="Mi perfil" className="tappable">
        <AvatarMovil fondo="bg-[rgb(var(--c-marino))] text-white" className="h-12 w-12 text-headline">{inicial}</AvatarMovil>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-footnote text-label-secondary">{saludo()},</p>
        <p className="truncate text-headline font-bold text-label">{nombre}</p>
      </div>
      <BotonCircular etiqueta="Ver el calendario" icono={CalendarDays} onClick={onCalendario} />
      <Link
        to="/perfil"
        aria-label="Ajustes"
        className="tappable flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))] shadow-level-1 ring-1 ring-separator/30"
      >
        <Settings size={20} strokeWidth={2.1} />
      </Link>
    </div>

    <h1 className="mb-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.025em] text-label">
      ¿Qué registramos<br />hoy?
    </h1>

    {/* Acciones rápidas */}
    <div className="-mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {onNuevoRecorrido && (
        <Chip principal onClick={onNuevoRecorrido}>
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Recorrido
        </Chip>
      )}
      {onNuevoRiego && (
        <Chip principal={!onNuevoRecorrido} onClick={onNuevoRiego}>
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Riego
        </Chip>
      )}
      <BotonCircular etiqueta="Gasto por mes" icono={BarChart3} onClick={onGraficas} className="!h-10 !w-10 !bg-[rgb(var(--c-pastel))] !shadow-none !ring-0" />
      <BotonCircular etiqueta="PDF del mes" icono={FileDown} onClick={onPdf} disabled={pdfDeshabilitado} className="!h-10 !w-10 !bg-[rgb(var(--c-pastel))] !shadow-none !ring-0 disabled:opacity-40" />
    </div>

    {/* La tarjeta del mes, dentro de su marco pastel */}
    <SeccionMovil titulo="Tu mes" accion={{ etiqueta: 'Ver calendario', onClick: onCalendario }}>
      <div className={`rounded-[1.7rem] p-1.5 ${TARJETA_PASTEL}`}>
        <div className="rounded-[1.4rem] bg-surface p-4 shadow-level-1">
          <div className="flex items-center gap-3">
            <AvatarMovil fondo="bg-[rgb(var(--c-pastel))] text-[rgb(var(--c-marino))]" className="h-12 w-12 text-caption font-bold uppercase">
              {MESES[mes - 1].slice(0, 3)}
            </AvatarMovil>
            <div className="min-w-0 flex-1">
              <p className="text-headline font-bold text-label" aria-live="polite">{MESES[mes - 1]} {anio}</p>
              <p className="truncate text-caption text-label-secondary">{estadoDelMes}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button" onClick={() => onCambiarMes(-1)} aria-label="Mes anterior"
                className="tappable flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c-pastel)/0.7)] text-[rgb(var(--c-marino))]"
              >
                <ChevronLeft size={18} strokeWidth={2.3} />
              </button>
              <button
                type="button" onClick={() => onCambiarMes(1)} aria-label="Mes siguiente"
                className="tappable flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c-pastel)/0.7)] text-[rgb(var(--c-marino))]"
              >
                <ChevronRight size={18} strokeWidth={2.3} />
              </button>
            </div>
          </div>

          <div className={`mt-4 grid gap-2 ${datos.length === 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Dato icono={Wallet} etiqueta="Gasto" valor={cargando ? '—' : total} />
            {datos.map((d) => <Dato key={d.etiqueta} {...d} valor={cargando ? '—' : d.valor} />)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={accionMes.onClick}
              disabled={accionMes.deshabilitado}
              className="tappable flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-footnote font-semibold text-white disabled:opacity-40"
            >
              {accionMes.reabrir ? <LockOpen size={15} strokeWidth={2.2} /> : <Lock size={15} strokeWidth={2.2} />}
              {accionMes.etiqueta}
            </button>
            <button
              type="button"
              onClick={onPdf}
              disabled={pdfDeshabilitado}
              className="tappable flex h-10 items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--c-pastel))] text-footnote font-semibold text-[rgb(var(--c-marino))] disabled:opacity-40"
            >
              <FileDown size={15} strokeWidth={2.2} /> PDF del mes
            </button>
          </div>
        </div>
      </div>
    </SeccionMovil>

    {/* Lo último, en dos columnas */}
    <SeccionMovil titulo="Lo último del mes" accion={ultimos.length ? { etiqueta: 'Ver todo', onClick: onCalendario } : null}>
      {ultimos.length === 0 ? (
        <p className="rounded-[1.4rem] bg-[rgb(var(--c-pastel)/0.6)] px-4 py-6 text-center text-subhead text-label-secondary">
          Todavía no hay nada registrado este mes.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {ultimos.slice(0, 4).map(({ tipo, registro, clave }) => {
            const esRiego = tipo === 'riego';
            const llevar = registro.tipo_recorrido === 'llevar';
            const hora = String((esRiego ? registro.hora : registro.hora_inicio) ?? '').slice(0, 5);
            return (
              <li key={clave} className={`rounded-[1.4rem] p-3 ${TARJETA_PASTEL}`}>
                <div className="flex items-start justify-between gap-2">
                  <AvatarMovil fondo={esRiego ? 'bg-info/15 text-info' : llevar ? 'bg-caution/15 text-caution' : 'bg-positive/15 text-positive'}>
                    {esRiego ? <Droplets size={18} strokeWidth={2} /> : <RouteIcon size={18} strokeWidth={2} />}
                  </AvatarMovil>
                  {registro._pendiente ? (
                    <InsigniaMovil tono={registro._pendiente === 'rechazado' ? 'error' : 'aviso'}>
                      {registro._pendiente === 'rechazado' ? 'Sin enviar' : 'Por enviar'}
                    </InsigniaMovil>
                  ) : (
                    <InsigniaMovil tono={esRiego ? 'azul' : llevar ? 'naranja' : 'verde'}>
                      {esRiego ? 'Riego' : llevar ? 'Llevar' : 'Traer'}
                    </InsigniaMovil>
                  )}
                </div>
                <p className="mt-3 truncate text-subhead font-bold text-label">
                  {esRiego ? dinero.format(parseFloat(registro.costo) || 0) : (registro.vehiculo_descripcion || 'Sin vehículo')}
                </p>
                <p className="tabular truncate text-caption text-label-secondary">{dia(registro.fecha)} · {hora}</p>
              </li>
            );
          })}
        </ul>
      )}
    </SeccionMovil>
  </div>
);

export default ResumenMovil;
