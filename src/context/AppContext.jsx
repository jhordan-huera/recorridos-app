import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { CONSULTA_MOVIL } from '../hooks/useMediaPreference';

const AppContext = createContext();

const THEME_KEY = 'theme';
const THEMES = ['light', 'dark', 'system'];

/** Lee la preferencia guardada, cayendo a 'system' si no hay nada válido. */
const readStoredTheme = () => {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  return THEMES.includes(stored) ? stored : 'system';
};

/** Resuelve 'system' contra la preferencia real del sistema operativo. */
const resolveTheme = (theme) => {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const AppProvider = ({ children }) => {
  const [ninos, setNinos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Tema ---
  // Tres estados, no dos: además de claro y oscuro, seguir al sistema es una
  // opción de pleno derecho y es la que viene por defecto.
  const [theme, setThemeState] = useState(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(readStoredTheme()));

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.toggle('dark', resolved === 'dark');

      // La barra de estado del navegador acompaña al tema en lugar de
      // quedarse en blanco sobre una app oscura. En el móvil el fondo claro
      // es azul (index.css), y la barra lo sigue.
      const meta = document.querySelector('meta[name="theme-color"]');
      const movil = window.matchMedia?.(CONSULTA_MOVIL).matches;
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : movil ? '#eaf1fc' : '#f2f2f7');
    };

    apply();
    localStorage.setItem(THEME_KEY, theme);
    if (!window.matchMedia) return undefined;

    // Girar el teléfono o cambiar el tamaño de la ventana cambia el fondo.
    const ancho = window.matchMedia(CONSULTA_MOVIL);
    ancho.addEventListener('change', apply);
    // Si seguimos al sistema, reaccionamos cuando el sistema cambia.
    const sistema = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    sistema?.addEventListener('change', apply);
    return () => {
      ancho.removeEventListener('change', apply);
      sistema?.removeEventListener('change', apply);
    };
  }, [theme]);

  /**
   * Cambia el tema suavizando la transición: un salto brusco de brillo es
   * justo lo que hay que evitar. Durante ~320ms las superficies interpolan
   * color, salvo si el usuario pidió movimiento reducido (ahí el CSS acorta
   * la transición por su cuenta).
   */
  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setThemeState(next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 360);
  }, []);

  /** Alterna entre claro y oscuro partiendo de lo que se ve ahora mismo. */
  const toggleTheme = useCallback(() => {
    setTheme(resolveTheme(theme) === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(() => ({
    ninos, setNinos,
    vehiculos, setVehiculos,
    recorridos, setRecorridos,
    theme,          // 'light' | 'dark' | 'system' — lo que eligió el usuario
    resolvedTheme,  // 'light' | 'dark' — lo que realmente se está pintando
    setTheme,
    toggleTheme,
    isMobile,
  }), [ninos, vehiculos, recorridos, theme, resolvedTheme, setTheme, toggleTheme, isMobile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};
