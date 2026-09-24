import { NavLink } from 'react-router-dom';
import { Users, Banknote } from 'lucide-react';

/**
 * Las dos secciones de administración. Van como pestañas dentro de una sola
 * entrada del menú para no añadir una octava entrada a la barra del móvil.
 */
const PESTANAS = [
  { to: '/users', etiqueta: 'Usuarios', Icono: Users },
  { to: '/cobros', etiqueta: 'Cobros', Icono: Banknote },
];

const PestanasAdmin = () => (
  <nav aria-label="Administración" className="mb-5 inline-flex rounded-full border border-separator/70 bg-surface p-1">
    {PESTANAS.map(({ to, etiqueta, Icono }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) => `tappable flex items-center gap-1.5 rounded-full px-4 py-1.5 text-subhead font-medium transition-colors ${
          isActive ? 'bg-label text-canvas' : 'text-label-secondary hover:text-label'
        }`}
      >
        <Icono size={15} strokeWidth={2.1} aria-hidden="true" />
        {etiqueta}
      </NavLink>
    ))}
  </nav>
);

export default PestanasAdmin;
