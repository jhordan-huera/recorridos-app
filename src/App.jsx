import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Alert from './components/ui/Alert';
import LoadingBar from './components/ui/LoadingBar';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import IdleTimerHandler from './components/IdleTimerHandler';
import { Suspense, lazy } from 'react';
import { Route as RouteIcon } from 'lucide-react';

// Lazy loading components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ninos = lazy(() => import('./pages/Ninos'));
const Vehiculos = lazy(() => import('./pages/Vehiculos'));
const Recorridos = lazy(() => import('./pages/Recorridos'));
const Riegos = lazy(() => import('./pages/Riegos'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));

// Componente principal que usa el contexto de auth
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-canvas">
        <div className="flex h-14 w-14 items-center justify-center rounded-panel bg-accent text-white">
          <RouteIcon size={26} strokeWidth={2.3} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-subhead font-medium text-label-secondary">Recorridos</p>
          {/* Indicador de estado, no de progreso: no promete un porcentaje
              que no conocemos. */}
          <span className="h-1 w-24 overflow-hidden rounded-full bg-fill/15">
            <span className="block h-full w-1/3 animate-shimmer rounded-full bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent,rgb(var(--c-accent)),transparent)]" />
          </span>
        </div>
      </div>
    );
  }

  // Disable console logs in production
  if (import.meta.env.PROD) {
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
  }

  return (
    <AppProvider>
      <Router>
        <IdleTimerHandler />
        <Routes>
          {/* Login Route - Outside Layout */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas text-subhead text-label-secondary">Cargando…</div>}>
                {user ? <Navigate to="/dashboard" replace /> : <Login />}
              </Suspense>
            }
          />

          {/* Main App Routes - Inside Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Suspense fallback={
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-fill/25 border-t-accent" />
                  </div>
                }>
                  <Routes>
                    {/* Rutas protegidas */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/ninos"
                      element={
                        <ProtectedRoute modulo="recorridos">
                          <Ninos />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/vehiculos"
                      element={
                        <ProtectedRoute modulo="recorridos">
                          <Vehiculos />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/recorridos"
                      element={
                        <ProtectedRoute modulo="recorridos">
                          <Recorridos />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/riegos"
                      element={
                        <ProtectedRoute modulo="riegos">
                          <Riegos />
                        </ProtectedRoute>
                      }
                    />

                    {/* ✅ RUTA DE PERFIL AGREGADA */}
                    <Route
                      path="/perfil"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    {/* Ruta de usuarios solo para admin */}
                    <Route
                      path="/users"
                      element={
                        <AdminRoute>
                          <Users />
                        </AdminRoute>
                      }
                    />

                    {/* Ruta catch-all */}
                    <Route
                      path="*"
                      element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
                    />
                  </Routes>
                </Suspense>
              </Layout>
            }
          />
        </Routes>
        <LoadingBar />
        <Alert />
        {/* @vercel/analytics decide el modo leyendo process.env.NODE_ENV, que Vite
            no define en el navegador. Sin encontrarlo asume desarrollo, carga
            script.debug.js y no envía nada: la analítica parecía funcionar y no
            registraba una sola visita. Se le pasa el modo explícitamente. */}
        <Analytics mode={import.meta.env.MODE === 'production' ? 'production' : 'development'} />
      </Router>
    </AppProvider>
  );
}

// Componente principal envuelto en los providers
function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AlertProvider>
  );
}

export default App;