import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from './Header';
import BottomNav from './BottomNav';

/**
 * Armazón de la aplicación.
 *
 * La cabecera y la barra inferior son capas translúcidas con el contenido
 * desplazándose por debajo. `#app-shell` envuelve solo la región de contenido:
 * es lo que retrocede cuando se abre una tarea modal, mientras el chrome
 * conserva intacto su posicionamiento fijo.
 */
const Layout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-label">
      {user && <Header />}

      <main
        id="app-shell"
        className="mx-auto w-full max-w-[2000px] flex-1 px-4 pt-4 lg:px-6
                   pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:pb-10 md:pt-6"
      >
        {children}
      </main>

      {user && <BottomNav />}
    </div>
  );
};

export default Layout;
