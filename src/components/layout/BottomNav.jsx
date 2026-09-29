import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { entradasDeMenu, estaActiva } from '../../lib/navegacion';
import { springSnappy, haptics } from '../../lib/motion';
import { useEsMovil } from '../../hooks/useMediaPreference';

/**
 * Barra del móvil: una píldora flotante. La sección en la que se está
 * enseña su nombre; las demás, solo el icono (el nombre queda para los
 * lectores de pantalla y en el `title`). Así caben hasta siete sin cortar
 * ninguna etiqueta a la mitad.
 */
const BarraMovil = ({ navItems, location, reduceMotion }) => (
    <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
        <ul className="mx-auto flex max-w-md items-center gap-1 rounded-full bg-surface/90 p-1.5 shadow-level-3 ring-1 ring-separator/30 backdrop-blur-regular">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = estaActiva(item, location.pathname);
                return (
                    <li key={item.path} className={isActive ? 'shrink-0' : 'min-w-0 flex-1'}>
                        <Link
                            to={item.path}
                            onClick={() => haptics.tick()}
                            aria-current={isActive ? 'page' : undefined}
                            title={item.label}
                            className="tappable relative flex h-11 items-center justify-center gap-1.5 rounded-full px-3"
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="barra-movil-activa"
                                    transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                                    className="absolute inset-0 rounded-full bg-[rgb(var(--c-pastel))]"
                                />
                            )}
                            <Icon
                                size={20}
                                strokeWidth={isActive ? 2.4 : 1.9}
                                className={`relative shrink-0 ${isActive ? 'text-[rgb(var(--c-marino))]' : 'text-label-secondary'}`}
                            />
                            {isActive
                                ? <span className="relative text-footnote font-semibold text-[rgb(var(--c-marino))]">{item.label}</span>
                                : <span className="sr-only">{item.label}</span>}
                        </Link>
                    </li>
                );
            })}
        </ul>
    </nav>
);

const BottomNav = () => {
    const location = useLocation();
    const { isAdmin, puedeRecorridos, puedeRiegos } = useAuth();
    const reduceMotion = useReducedMotion();

    const navItems = entradasDeMenu({ isAdmin, puedeRecorridos, puedeRiegos, incluirPerfil: true });
    const esMovil = useEsMovil();

    if (esMovil) return <BarraMovil navItems={navItems} location={location} reduceMotion={reduceMotion} />;

    return (
        <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        >
            {/* Capa translúcida: el contenido se desplaza por debajo en lugar de
                quedar recortado por una franja opaca. */}
            <div className="material-chrome material-edge-top pb-safe">
                <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = estaActiva(item, location.pathname);

                        return (
                            <li key={item.path} className="flex-1">
                                <Link
                                    to={item.path}
                                    onClick={() => haptics.tick()}
                                    aria-current={isActive ? 'page' : undefined}
                                    className="tappable relative flex flex-col items-center gap-0.5 rounded-control px-1 pb-1.5 pt-1.5"
                                >
                                    {isActive && (
                                        // El indicador se desliza entre pestañas con un spring
                                        // compartido: la selección se mueve, no salta.
                                        <motion.span
                                            layoutId="tab-indicator"
                                            transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                                            className="absolute inset-x-1 inset-y-0 rounded-control bg-accent/12"
                                        />
                                    )}

                                    <motion.span
                                        className="relative z-10 flex flex-col items-center gap-0.5"
                                        // El hundido responde a la pulsación, no a soltar.
                                        whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.88 }}
                                        transition={springSnappy}
                                    >
                                        <Icon
                                            size={22}
                                            strokeWidth={isActive ? 2.3 : 1.9}
                                            className={isActive ? 'text-accent' : 'text-label-tertiary'}
                                        />
                                        {/* La etiqueta está siempre visible: tener que adivinar
                                            qué hace un icono es peor que un poco menos de aire. */}
                                        <span
                                            className={`text-[0.625rem] leading-tight tracking-[0.004em] ${
                                                isActive ? 'font-semibold text-accent' : 'font-medium text-label-tertiary'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </motion.span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
};

export default BottomNav;
