import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

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
      // quedarse en blanco sobre una app oscura.
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#f2f2f7');
    };

    apply();
    localStorage.setItem(THEME_KEY, theme);

    // Si seguimos al sistema, reaccionamos cuando el sistema cambia.
    if (theme !== 'system' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
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
