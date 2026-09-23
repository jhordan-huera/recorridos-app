import React from 'react';
import { Lock, LockOpen, CircleCheck, CalendarClock } from 'lucide-react';
import Button from '../ui/Button';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fechaCorta = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long' });
const fecha = (valor) => (valor ? fechaCorta.format(new Date(valor)) : '');

const TONOS = {
  pendiente: 'border-caution/30 bg-caution/8',
  neutro: 'border-separator/60 bg-surface',
  cerrado: 'border-accent/25 bg-accent/8',
  cobrado: 'border-positive/25 bg-positive/8',
};

const ICONOS = {
  pendiente: 'bg-caution/16 text-caution',
  neutro: 'bg-fill/12 text-label-secondary',
  cerrado: 'bg-accent/14 text-accent',
  cobrado: 'bg-positive/14 text-positive',
};

/**
 * En qué punto está el mes a la vista y qué se puede hacer con él.
 *
 * Un mes pasado que sigue abierto se señala en naranja: es trabajo pendiente,
 * y mientras no se termine no se puede cobrar. El mes en curso no, porque es
 * normal que siga abierto.
 */
const EstadoDelMes = ({ nombreMes, cierre, esActual, esFuturo, esAdmin, ocupado, onTerminar, onReabrir }) => {
  if (esFuturo) return null;

  const estado = cierre?.estado ?? 'abierto';
  const Mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  let tono;
  let Icono;
  let titulo;
  let texto;
  let accion;

  if (estado === 'terminado') {
    tono = 'cerrado'; Icono = Lock;
    titulo = `Terminaste ${nombreMes} el ${fecha(cierre.terminado_en)}`;
    texto = esAdmin
      ? 'Queda bloqueado: ya no se puede añadir, cambiar ni borrar nada.'
      : 'Queda bloqueado y pendiente de cobro.';
    accion = <Button variant="ghost" size="sm" className="!rounded-full" onClick={onReabrir} disabled={ocupado}>Reabrir</Button>;
  } else if (estado === 'cobrado') {
    tono = 'cobrado'; Icono = CircleCheck;
    titulo = `${Mes} está cobrado`;
    texto = `Se cobraron ${dinero.format(Number(cierre.total_cobrado))} el ${fecha(cierre.cobrado_en)}.`;
    accion = <Button variant="ghost" size="sm" className="!rounded-full" onClick={onReabrir} disabled={ocupado}>Reabrir</Button>;
  } else {
    tono = esActual ? 'neutro' : 'pendiente';
    Icono = esActual ? CalendarClock : LockOpen;
    titulo = esActual ? `${Mes} está en curso` : `${Mes} sigue abierto`;
    texto = esAdmin
      ? 'Termínalo cuando lo tengas todo registrado: quedará bloqueado para que no cambie.'
      : 'Termínalo cuando lo tengas todo registrado: así se puede cobrar.';
    accion = (
      <Button
        variant={esActual ? 'secondary' : 'primary'} size="sm" className="!rounded-full"
        onClick={onTerminar} disabled={ocupado} icon={<Lock size={14} strokeWidth={2.2} />}
      >
        Terminar {nombreMes.split(' ')[0]}
      </Button>
    );
  }

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-card border px-4 py-3.5 sm:flex-row sm:items-center sm:px-5 ${TONOS[tono]}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ICONOS[tono]}`}>
          <Icono size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-subhead font-semibold text-label">{titulo}</p>
          <p className="text-footnote text-label-secondary">{texto}</p>
        </div>
      </div>
      <div className="flex justify-end">{accion}</div>
    </div>
  );
};

export default EstadoDelMes;
