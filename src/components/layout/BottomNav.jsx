import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { LayoutGrid, Route, GraduationCap, Bus, ShieldCheck, CircleUser, Droplets } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { springSnappy, haptics } from '../../lib/motion';

// Los nombres describen lo que hay dentro, no un paraguas vago: "Resumen"
// dice más que "Inicio" sobre qué se va a encontrar al llegar.
const baseNavItems = [
    { icon: LayoutGrid, label: 'Resumen', path: '/dashboard' },
    { icon: Route, label: 'Recorridos', path: '/recorridos' },
    { icon: Droplets, label: 'Riegos', path: '/riegos' },
    { icon: GraduationCap, label: 'Estudiantes', path: '/ninos' },
    { icon: Bus, label: 'Vehículos', path: '/vehiculos' },
];

const BottomNav = () => {
    const location = useLocation();
    const { isAdmin } = useAuth();
    const reduceMotion = useReducedMotion();

    const navItems = isAdmin
        ? [...baseNavItems, { icon: ShieldCheck, label: 'Usuarios', path: '/users' }, { icon: CircleUser, label: 'Perfil', path: '/perfil' }]
        : [...baseNavItems, { icon: CircleUser, label: 'Perfil', path: '/perfil' }];

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
                        const isActive = location.pathname === item.path
                            || (item.path === '/dashboard' && location.pathname === '/');

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
