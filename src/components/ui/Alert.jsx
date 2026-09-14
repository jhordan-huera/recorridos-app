import React from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { crossFade, project, springSheet } from '../../lib/motion';

const config = {
  success: { Icon: CheckCircle2, tone: 'text-positive', label: 'Listo' },
  error: { Icon: AlertCircle, tone: 'text-critical', label: 'Error' },
  warning: { Icon: AlertTriangle, tone: 'text-caution', label: 'Atención' },
  info: { Icon: Info, tone: 'text-accent', label: 'Información' },
};

/** Distancia a partir de la cual un descarte es inequívoco. */
const DISMISS_DISTANCE = 96;

const Toast = ({ alert, onDismiss }) => {
  const reduceMotion = useReducedMotion();
  const { Icon, tone, label } = config[alert.type] || config.info;

  const x = useMotionValue(0);
  // El aviso se desvanece de forma continua MIENTRAS se arrastra, no de golpe
  // al soltar: se ve en todo momento cuánto falta para descartarlo.
  const opacity = useTransform(x, [-DISMISS_DISTANCE * 1.6, 0, DISMISS_DISTANCE * 1.6], [0, 1, 0]);

  const handleDragEnd = (_event, info) => {
    const velocity = info.velocity.x;
    // Adónde iba el gesto, no dónde se soltó.
    const projected = info.offset.x + project(velocity);
    if (Math.abs(projected) > DISMISS_DISTANCE || Math.abs(velocity) > 500) {
      onDismiss();
    }
    // Si no llega, Motion lo devuelve a su sitio con el spring de abajo,
    // arrancando desde donde esté y conservando la velocidad.
  };

  return (
    <motion.div
      layout
      role="status"
      aria-live={alert.type === 'error' ? 'assertive' : 'polite'}
      // Entra y sale por el mismo camino: desde abajo y hacia abajo.
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      transition={reduceMotion ? crossFade : springSheet}
      style={reduceMotion ? undefined : { x, opacity }}
      drag={reduceMotion ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className="tappable pointer-events-auto flex w-full items-start gap-3 rounded-card
                 material-thick border border-separator/50 p-3.5 shadow-level-3"
    >
      <Icon size={20} strokeWidth={2} className={`mt-px shrink-0 ${tone}`} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className={`vibrant text-footnote font-semibold ${tone}`}>{label}</p>
        <p className="vibrant mt-0.5 text-subhead leading-snug text-label">{alert.message}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="tappable -mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-label-tertiary
                   transition-colors hover:bg-fill/12 hover:text-label"
      >
        <span className="sr-only">Cerrar aviso</span>
        <X size={16} strokeWidth={2.2} />
      </button>
    </motion.div>
  );
};

/**
 * Pila de avisos.
 *
 * Se monta una sola vez, en la raíz de la app. Se descartan deslizando hacia
 * cualquier lado, y el destino se decide proyectando la inercia del gesto.
 */
const Alert = () => {
  const { alerts, hideAlert } = useAlert();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2
                 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]
                 sm:inset-x-auto sm:right-4 sm:items-end sm:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
    >
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto w-full max-w-sm">
            <Toast alert={alert} onDismiss={() => hideAlert(alert.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Alert;
