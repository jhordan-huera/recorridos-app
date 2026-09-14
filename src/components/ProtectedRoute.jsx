import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Indicador de estado mientras se comprueba la sesión. */
const RouteSpinner = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Comprobando sesión">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-fill/25 border-t-accent" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <RouteSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export { RouteSpinner };
export default ProtectedRoute;
