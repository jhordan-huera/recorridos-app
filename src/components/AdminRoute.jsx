import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RouteSpinner } from './ProtectedRoute';
import Button from './ui/Button';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <RouteSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    // Nadie queda atrapado: se explica qué pasa y se ofrece una salida clara.
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-caution/14 text-caution">
          <ShieldAlert size={26} strokeWidth={1.9} />
        </span>
        <h1 className="text-title3 font-semibold text-label">Sección restringida</h1>
        <p className="mt-1.5 max-w-sm text-subhead text-label-secondary">
          Esta página es solo para administradores. Si crees que deberías tener acceso,
          pídeselo a quien administre el sistema.
        </p>
        <Button className="mt-6" onClick={() => navigate('/dashboard')}>
          Ir al resumen
        </Button>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
