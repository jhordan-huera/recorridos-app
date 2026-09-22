import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LogOut, CircleUser, LayoutGrid, Route, GraduationCap, Bus, ShieldCheck, Droplets,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useScrollEdge } from '../../hooks/useScrollEdge';
import { crossFade, springSnappy, haptics } from '../../lib/motion';
import ThemeToggle from '../ui/ThemeToggle';
import Badge from '../ui/Badge';

const baseNavItems = [
  { icon: LayoutGrid, path: '/dashboard', label: 'Resumen' },
  { icon: Route, path: '/recorridos', label: 'Recorridos' },
  { icon: Droplets, path: '/riegos', label: 'Riegos' },
  { icon: GraduationCap, path: '/ninos', label: 'Estudiantes' },
  { icon: Bus, path: '/vehiculos', label: 'Vehículos' },
];

const extractName = (u) => {
  if (!u) return null;
  return u.nombre || u.full_name || u.user_metadata?.full_name || u.user_metadata?.name;
};

const Header = () => {
  const { user, isAdmin, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { scrolled } = useScrollEdge();

  // El nombre en caché evita que la cabecera parpadee con el correo mientras
  // llega la ficha real del usuario.
  const [displayName, setDisplayName] = useState(() => {
    const directName = extractName(user);
    if (directName) return directName;
    if (typeof window !== 'undefined' && user?.email) {
      try {
        const cached = JSON.parse(localStorage.getItem('authUserCache') || '{}');
        if (cached.email === user.email && cached.name) return cached.name;
      } catch { /* caché ilegible: seguimos con el correo */ }
    }
    return user?.email?.split('@')[0] || 'Usuario';
  });

  useEffect(() => {
    const realName = extractName(user);
    if (realName && user?.email) {
      setDisplayName(realName);
      localStorage.setItem('authUserCache', JSON.stringify({ name: realName, email: user.email }));
    }
  }, [user]);

  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    if (!showUserMenu) return undefined;
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    localStorage.removeItem('authUserCache');
    setShowUserMenu(false);
    logout();
  };

  const navItems = isAdmin
    ? [...baseNavItems, { icon: ShieldCheck, path: '/users', label: 'Usuarios' }]
    : baseNavItems;

  return (
    <header
      data-scrolled={scrolled}
      className="scroll-edge sticky top-0 z-40 hidden md:block material-chrome"
    >
      <div className="mx-auto flex h-14 max-w-[2000px] items-center gap-4 px-4">

        {/* Marca */}
        <Link to="/dashboard" className="tappable flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-field bg-accent text-white">
            <Route size={17} strokeWidth={2.4} />
          </span>
          <span className="text-headline font-semibold text-label">Recorridos</span>
        </Link>

        {/* Navegación */}
        <nav aria-label="Secciones" className="mx-auto hidden lg:flex items-center gap-0.5 rounded-control bg-fill/10 p-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path
              || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className="tappable relative flex h-9 items-center gap-2 rounded-[0.625rem] px-3"
              >
                {isActive && (
                  <motion.span
                    layoutId="header-nav-indicator"
                    transition={reduceMotion ? { duration: 0.12 } : springSnappy}
                    className="absolute inset-0 rounded-[0.625rem] bg-surface shadow-level-1"
                  />
                )}
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.3 : 1.9}
                  className={`relative z-10 ${isActive ? 'text-accent' : 'text-label-secondary'}`}
                />
                <span className={`relative z-10 text-footnote ${isActive ? 'font-semibold text-label' : 'font-medium text-label-secondary'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Acciones */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />

          {isAdmin && <Badge tone="caution" className="hidden xl:inline-flex">Admin</Badge>}

          <div className="relative" ref={userMenuRef}>
            <motion.button
              type="button"
              onClick={() => { haptics.tick(); setShowUserMenu((open) => !open); }}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.94 }}
              transition={springSnappy}
              className="tappable flex items-center gap-2 rounded-full p-0.5 pl-2.5 transition-colors hover:bg-fill/10"
            >
              <span className="hidden text-footnote font-medium text-label xl:block">{displayName}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-subhead font-semibold text-white">
                {initial}
              </span>
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  role="menu"
                  // Escala desde la esquina del avatar: el menú sale de lo que
                  // se pulsó, no del centro de la nada.
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
                  transition={reduceMotion ? crossFade : springSnappy}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden
                             rounded-card border border-separator/50 material-thick p-1.5 shadow-level-3"
                >
                  <div className="mb-1 flex items-center gap-3 rounded-field px-2.5 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-subhead font-semibold text-white">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="vibrant truncate text-subhead font-semibold text-label">{displayName}</p>
                      <p className="vibrant truncate text-footnote text-label-secondary">{user?.email}</p>
                    </div>
                  </div>

                  <div className="my-1 h-px bg-separator/50" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setShowUserMenu(false); navigate('/perfil'); }}
                    className="tappable flex w-full items-center gap-3 rounded-field px-2.5 py-2.5
                               text-subhead font-medium text-label transition-colors hover:bg-fill/12"
                  >
                    <CircleUser size={18} strokeWidth={1.9} className="text-label-secondary" />
                    Mi perfil
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="tappable flex w-full items-center gap-3 rounded-field px-2.5 py-2.5
                               text-subhead font-medium text-critical transition-colors hover:bg-critical/12"
                  >
                    <LogOut size={18} strokeWidth={1.9} />
                    Cerrar sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
