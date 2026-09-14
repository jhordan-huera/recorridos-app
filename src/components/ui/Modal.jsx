import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform,
} from 'motion/react';
import { X } from 'lucide-react';
import { crossFade, project, springSheet, easeOutApple, easeInApple } from '../../lib/motion';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useMediaQuery } from '../../hooks/useMediaPreference';

/** Cuenta capas modales abiertas para empujar el fondo una sola vez. */
let openLayers = 0;

function pushBackground(active) {
  const shell = document.getElementById('app-shell');
  if (!shell) return;
  openLayers += active ? 1 : -1;
  if (openLayers < 0) openLayers = 0;
  shell.toggleAttribute('data-behind-modal', openLayers > 0);
}

const panelChrome =
  'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface ' +
  'border border-separator/50 shadow-level-4';

/**
 * Sheet inferior, para pantallas táctiles.
 *
 * Todo el movimiento vertical lo gobierna un único motion value manejado de
 * forma imperativa. Eso es lo que permite la propiedad más importante: el
 * sheet SIGUE MONTADO mientras se va, así que agarrarlo a media salida lo
 * recoge desde donde esté —con su velocidad— en vez de terminar de cerrarse
 * y volver a abrirse.
 */
const Sheet = ({ isOpen, onClose, onClosed, dismissible, panelRef, children }) => {
  const y = useMotionValue(0);
  const height = useRef(0);
  const closing = useRef(false);

  // El velo se aclara y se oscurece siguiendo al sheet de forma continua
  // durante todo el arrastre, no solo al soltar.
  const scrimOpacity = useTransform(
    y,
    (value) => (height.current > 0 ? Math.max(0, 1 - value / height.current) : 0)
  );

  // Antes del primer pintado el sheet ya está fuera de pantalla: sin esto se
  // vería un fotograma en su posición final.
  useLayoutEffect(() => {
    height.current = panelRef.current?.offsetHeight || window.innerHeight;
    y.set(window.innerHeight);
  }, [y, panelRef]);

  useEffect(() => {
    height.current = panelRef.current?.offsetHeight || window.innerHeight;
    closing.current = false;
    animate(y, 0, springSheet);
    // Solo al montar: a partir de aquí manda el gesto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideOut = useCallback((velocity = 0) => {
    closing.current = true;
    animate(y, window.innerHeight, { ...springSheet, velocity })
      .then(() => { if (closing.current) onClosed(); })
      .catch(() => {});
  }, [y, onClosed]);

  useEffect(() => {
    if (!isOpen) slideOut(0);
  }, [isOpen, slideOut]);

  const handleDragEnd = (_event, info) => {
    const velocity = info.velocity.y;
    // El destino no sale de dónde se soltó, sino de adónde IBA el gesto.
    const projected = y.get() + project(velocity);
    const dismiss = velocity > 500 ? true
      : velocity < -500 ? false
      : projected > height.current * 0.4;

    if (dismiss) {
      // La velocidad del dedo entra tal cual en el spring: sin costura entre
      // arrastrar y animar.
      closing.current = true;
      animate(y, window.innerHeight, { ...springSheet, velocity })
        .then(() => { if (closing.current) onClose?.(); })
        .catch(() => {});
    } else {
      animate(y, 0, { ...springSheet, velocity });
    }
  };

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={() => dismissible && onClose?.()}
        style={{ opacity: scrimOpacity }}
        className="absolute inset-0 bg-[rgb(var(--material-scrim))]"
      />

      <div className="absolute inset-0 flex items-end">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          style={{ y }}
          onClick={(event) => event.stopPropagation()}
          className={`${panelChrome} rounded-t-panel pb-safe`}
          // 1:1 hacia abajo; hacia arriba, resistencia progresiva en lugar de
          // un tope duro que se leería como "congelado".
          drag={dismissible ? 'y' : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.06, bottom: 1 }}
          dragMomentum={false}
          onDragStart={() => { closing.current = false; }}
          onDragEnd={handleDragEnd}
        >
          {dismissible && (
            <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
              <div className="h-1 w-9 rounded-full bg-fill/30" />
            </div>
          )}
          {children}
        </motion.div>
      </div>
    </>
  );
};

/**
 * Diálogo centrado, para ratón y pantalla grande.
 *
 * Escala desde el control que lo abrió —no desde el centro de la nada— y se
 * materializa: desenfoque y escala animan juntos, de modo que la superficie
 * llega como un material y no como una simple opacidad. La salida recorre el
 * mismo camino con la curva espejada.
 */
const Dialog = ({ isOpen, onClose, onClosed, dismissible, size, origin, panelRef, children }) => {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence onExitComplete={onClosed}>
      {isOpen && (
        <>
          <motion.div
            key="scrim"
            aria-hidden="true"
            onClick={() => dismissible && onClose?.()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: easeOutApple }}
            className="absolute inset-0 bg-[rgb(var(--material-scrim))]"
          />

          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget && dismissible) onClose?.();
            }}
          >
            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              style={{ transformOrigin: origin }}
              onClick={(event) => event.stopPropagation()}
              className={`${panelChrome} rounded-sheet ${size}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
              transition={
                reduceMotion ? crossFade
                  : isOpen ? springSheet
                    : { duration: 0.18, ease: easeInApple }
              }
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Capa modal.
 *
 * Sheet arrastrable en táctil, diálogo centrado en escritorio. En ambos casos
 * entra y sale por el mismo camino, y el fondo se atenúa y retrocede para
 * decir que esto es una tarea que bloquea.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = 'max-w-lg',
  dismissible = true,
}) => {
  const isTouch = useMediaQuery('(max-width: 639px), (pointer: coarse)');
  const reduceMotion = useReducedMotion();

  // `mounted` sobrevive a que `isOpen` pase a false: el nodo sigue en el DOM
  // durante la salida.
  const [mounted, setMounted] = useState(isOpen);
  const panelRef = useRef(null);
  const originRef = useRef('center center');

  useEffect(() => {
    if (!isOpen) return;

    // Ancla el diálogo a su origen para que la relación entre el botón
    // pulsado y el contenido que aparece sea evidente.
    const trigger = document.activeElement;
    if (trigger instanceof HTMLElement && trigger !== document.body) {
      const rect = trigger.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const yPct = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      originRef.current = `${x.toFixed(1)}% ${yPct.toFixed(1)}%`;
    } else {
      originRef.current = 'center center';
    }

    setMounted(true);
  }, [isOpen]);

  // Con movimiento reducido no hay deslizamiento que interrumpir: se desmonta
  // en cuanto se cierra y el fundido lo resuelve el CSS global.
  useEffect(() => {
    if (!isOpen && mounted && reduceMotion) setMounted(false);
  }, [isOpen, mounted, reduceMotion]);

  useBodyScrollLock(mounted);
  useFocusTrap(mounted && isOpen, panelRef);

  useEffect(() => {
    if (!mounted) return undefined;
    pushBackground(true);
    return () => pushBackground(false);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, dismissible, onClose]);

  const handleClosed = useCallback(() => setMounted(false), []);

  if (!mounted) return null;

  const content = (
    <>
      <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          {title && <h2 className="text-title3 font-semibold text-label">{title}</h2>}
          {description && <p className="mt-1 text-subhead text-label-secondary">{description}</p>}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            className="tappable -mr-1 -mt-1 shrink-0 rounded-full p-2 text-label-tertiary
                       transition-colors hover:bg-fill/10 hover:text-label active:bg-fill/20"
          >
            <X size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="scroll-area flex-1 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">{children}</div>

      {footer && (
        <div className="shrink-0 border-t border-separator/60 bg-surface-secondary px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      {isTouch && !reduceMotion ? (
        <Sheet
          isOpen={isOpen}
          onClose={onClose}
          onClosed={handleClosed}
          dismissible={dismissible}
          panelRef={panelRef}
        >
          {content}
        </Sheet>
      ) : (
        <Dialog
          isOpen={isOpen}
          onClose={onClose}
          onClosed={handleClosed}
          dismissible={dismissible}
          size={isTouch ? 'max-w-lg' : size}
          origin={originRef.current}
          panelRef={panelRef}
        >
          {content}
        </Dialog>
      )}
    </div>,
    document.body
  );
};

export default Modal;
