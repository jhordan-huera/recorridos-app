import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, Share2, Pencil, ArrowRight, Trash2, Lock } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { springSheet, springSnappy, crossFade, haptics } from '../../lib/motion';
import { CifrasMovil, TARJETA_PASTEL } from './Movil';

/** Tarjeta blanca con su título, como "About" o "Schedules & Location". */
export const TarjetaDetalle = ({ titulo, children }) => (
  <section className={`rounded-[1.6rem] p-1.5 ${TARJETA_PASTEL}`}>
    <h3 className="px-3 pb-2 pt-2 text-subhead font-semibold text-label">{titulo}</h3>
    <div className="rounded-[1.3rem] bg-surface p-3">{children}</div>
  </section>
);

/**
 * Datos en recuadros de dos en dos: icono y etiqueta pequeña arriba, el
 * valor debajo. Con `href`, el recuadro se puede tocar (llamar, abrir un
 * mapa…).
 */
export const DatosDetalle = ({ datos }) => (
  <dl className="grid grid-cols-2 gap-2">
    {datos.filter(Boolean).map(({ icono: Icono, etiqueta, valor, href, ancho }) => {
      const contenido = (
        <>
          <dt className="flex items-center justify-center gap-1 text-caption2 text-label-secondary">
            <Icono size={12} strokeWidth={2.2} aria-hidden="true" /> {etiqueta}
          </dt>
          <dd className="mt-0.5 break-words text-footnote font-semibold text-label">{valor}</dd>
        </>
      );
      const clases = `block rounded-[1rem] bg-[rgb(var(--c-pastel)/0.7)] px-2.5 py-2.5 text-center ${ancho ? 'col-span-2' : ''}`;
      return href
        ? <a key={etiqueta} href={href} className={`tappable ${clases}`}>{contenido}</a>
        : <div key={etiqueta} className={clases}>{contenido}</div>;
    })}
  </dl>
);

/** Un párrafo dentro de su recuadro pastel. */
export const TextoDetalle = ({ children }) => (
  <p className="rounded-[1rem] bg-[rgb(var(--c-pastel)/0.7)] px-3.5 py-3 text-footnote leading-relaxed text-label-secondary">
    {children}
  </p>
);

/**
 * Ficha de detalle en el móvil: ocupa toda la pantalla, entra desde la
 * derecha y enseña un registro entero antes de tocarlo.
 *
 *   ← Título                          compartir
 *   (avatar)  Nombre / subtítulo      [editar]
 *   [cifra] [cifra] [cifra] [cifra]
 *   ( pestaña | pestaña | pestaña )
 *   tarjetas de la pestaña
 *   [        Editar …        →]
 *
 * El botón "atrás" del teléfono (o el gesto) la cierra en lugar de salir de
 * la pantalla: al abrirse deja una entrada en el historial.
 */
const DetalleMovil = ({
  abierto, onCerrar,
  cabecera, avatar, nombre, subtitulo,
  cifras = [], pestanas = [],
  onEditar, etiquetaEditar = 'Editar',
  onEliminar = null, etiquetaEliminar = 'Eliminar',
  bloqueado = null,
  compartir = null,
}) => {
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef(null);
  const [pestana, setPestana] = useState(pestanas[0]?.clave ?? null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;

  useBodyScrollLock(abierto);
  useFocusTrap(abierto, panelRef);

  // Cada vez que se abre, empieza por la primera pestaña.
  useEffect(() => {
    if (abierto) setPestana(pestanas[0]?.clave ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // "Atrás" del teléfono: una entrada en el historial que, al volver, cierra
  // la ficha. Sin ella, el gesto de volver sacaba de la pantalla entera.
  useEffect(() => {
    if (!abierto) return undefined;
    if (!window.history.state?.detalleMovil) {
      window.history.pushState({ ...window.history.state, detalleMovil: true }, '');
    }
    const alVolver = () => alCerrar.current();
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [abierto]);

  const cerrar = () => {
    if (window.history.state?.detalleMovil) window.history.back();
    else alCerrar.current();
  };

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  });

  const editar = () => {
    haptics.tick();
    cerrar();
    onEditar();
  };

  const eliminar = () => {
    cerrar();
    onEliminar();
  };

  const compartirFicha = async () => {
    if (!compartir) return;
    try {
      if (navigator.share) {
        await navigator.share(compartir);
        return;
      }
      await navigator.clipboard.writeText(`${compartir.title}\n${compartir.text}`);
      showAlert('success', 'Copiado: ya puedes pegarlo donde quieras');
    } catch (error) {
      // Cancelar el menú de compartir no es un error.
      if (error?.name !== 'AbortError') showAlert('error', 'No se pudo compartir');
    }
  };

  const actual = pestanas.find((p) => p.clave === pestana) ?? pestanas[0];

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={cabecera}
          tabIndex={-1}
          initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
          animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
          transition={reduceMotion ? crossFade : springSheet}
          className="fixed inset-0 z-50 flex flex-col bg-canvas outline-none"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
            {/* ← Título · compartir */}
            <div className="mb-5 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
              <motion.button
                type="button" onClick={cerrar} aria-label="Volver"
                whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }} transition={springSnappy}
                className="tappable flex h-11 w-11 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))] shadow-level-1 ring-1 ring-separator/30"
              >
                <ChevronLeft size={21} strokeWidth={2.3} />
              </motion.button>
              <h2 className="truncate text-center text-headline font-bold text-label">{cabecera}</h2>
              {compartir ? (
                <motion.button
                  type="button" onClick={compartirFicha} aria-label="Compartir"
                  whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }} transition={springSnappy}
                  className="tappable flex h-11 w-11 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))] shadow-level-1 ring-1 ring-separator/30"
                >
                  <Share2 size={19} strokeWidth={2.1} />
                </motion.button>
              ) : <span aria-hidden="true" />}
            </div>

            {/* Avatar, nombre y el acceso directo a editar */}
            <div className="mb-5 flex items-center gap-3.5">
              <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-surface text-[rgb(var(--c-marino))] shadow-level-1 ring-4 ring-surface">
                {avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-headline font-bold leading-tight text-label">{nombre}</p>
                {subtitulo && <p className="mt-0.5 text-footnote text-label-secondary">{subtitulo}</p>}
              </div>
              {!bloqueado && (
                <button
                  type="button" onClick={editar} aria-label={etiquetaEditar}
                  className="tappable flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-accent text-white shadow-level-2"
                >
                  <Pencil size={19} strokeWidth={2.2} />
                </button>
              )}
            </div>

            {cifras.length > 0 && <CifrasMovil cifras={cifras} />}

            {/* Pestañas */}
            {pestanas.length > 1 && (
              <div role="tablist" aria-label="Secciones" className="mb-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pestanas.length}, minmax(0, 1fr))` }}>
                {pestanas.map((p) => {
                  const activa = p.clave === actual?.clave;
                  return (
                    <button
                      key={p.clave}
                      type="button"
                      role="tab"
                      aria-selected={activa}
                      onClick={() => setPestana(p.clave)}
                      className={`tappable relative rounded-full py-2 text-footnote font-semibold transition-colors ${
                        activa ? 'bg-[rgb(var(--c-pastel))] text-[rgb(var(--c-marino))]' : 'bg-surface/60 text-label-secondary'
                      }`}
                    >
                      {p.etiqueta}
                      {activa && (
                        <motion.span
                          layoutId="detalle-pestana"
                          transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                          className="absolute inset-x-6 -bottom-1 h-0.5 rounded-full bg-[rgb(var(--c-marino))]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div role={pestanas.length > 1 ? 'tabpanel' : undefined} className="space-y-3">
              {actual?.contenido}
            </div>
          </div>

          {/* Acción principal, siempre a mano */}
          <div className="border-t border-separator/30 bg-canvas/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-regular">
            {bloqueado ? (
              <p className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface/70 text-footnote font-medium text-label-secondary">
                <Lock size={15} strokeWidth={2.2} aria-hidden="true" /> {bloqueado}
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {onEliminar && (
                  <button
                    type="button" onClick={eliminar} aria-label={etiquetaEliminar} title={etiquetaEliminar}
                    className="tappable flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-critical/12 text-critical"
                  >
                    <Trash2 size={18} strokeWidth={2.1} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={editar}
                  className="tappable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-[rgb(var(--c-marino))] text-subhead font-semibold text-white shadow-level-2"
                >
                  {etiquetaEditar} <ArrowRight size={18} strokeWidth={2.3} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default DetalleMovil;
