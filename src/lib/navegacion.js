import {
  LayoutGrid, Route, GraduationCap, Bus, ShieldCheck, CircleUser, Droplets,
} from 'lucide-react';

/**
 * Menú principal.
 *
 * Los nombres describen lo que hay dentro, no un paraguas vago: "Resumen" dice
 * más que "Inicio" sobre qué se va a encontrar al llegar.
 *
 * Cada entrada declara de qué módulo depende. Estudiantes y Vehículos dependen
 * de recorridos porque son sus datos: sin recorridos no hay nada que hacer con
 * ellos.
 *
 * Filtrar aquí es cosmético. Lo que impide entrar de verdad es el permiso que
 * comprueba el servidor en cada ruta; esconder una pestaña solo evita enseñar
 * un sitio al que la cuenta no puede ir.
 */
const ENTRADAS = [
  { icon: LayoutGrid, path: '/dashboard', label: 'Resumen', modulo: null },
  { icon: Route, path: '/recorridos', label: 'Recorridos', modulo: 'recorridos' },
  { icon: Droplets, path: '/riegos', label: 'Riegos', modulo: 'riegos' },
  { icon: GraduationCap, path: '/ninos', label: 'Estudiantes', modulo: 'recorridos' },
  { icon: Bus, path: '/vehiculos', label: 'Vehículos', modulo: 'recorridos' },
];

export const entradasDeMenu = ({
  isAdmin = false,
  puedeRecorridos = false,
  puedeRiegos = false,
  incluirPerfil = false,
} = {}) => {
  const permitido = { recorridos: puedeRecorridos, riegos: puedeRiegos };
  const items = ENTRADAS.filter((entrada) => !entrada.modulo || permitido[entrada.modulo]);

  // Una sola entrada para todo lo de administración (usuarios y cobros), con
  // pestañas dentro. En el móvil el administrador ya tiene siete entradas
  // abajo; una octava apretaría las etiquetas hasta cortarlas.
  if (isAdmin) items.push({ icon: ShieldCheck, path: '/users', label: 'Admin', rutas: ['/users', '/cobros'] });
  if (incluirPerfil) items.push({ icon: CircleUser, path: '/perfil', label: 'Perfil' });

  return items;
};

/** Si una entrada del menú corresponde a la ruta actual. */
export const estaActiva = (item, ruta) => (
  item.rutas ? item.rutas.includes(ruta) : ruta === item.path || (item.path === '/dashboard' && ruta === '/')
);

/** A dónde mandar a alguien que entra o que pide una pantalla que no le toca. */
export const rutaDeInicio = ({ puedeRecorridos, puedeRiegos }) => (
  puedeRecorridos || puedeRiegos ? '/dashboard' : '/perfil'
);
