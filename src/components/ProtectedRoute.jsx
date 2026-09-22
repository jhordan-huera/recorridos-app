import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rutaDeInicio } from '../lib/navegacion';

/** Indicador de estado mientras se comprueba la sesión. */
const RouteSpinner = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Comprobando sesión">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-fill/25 border-t-accent" />
  </div>
);

const ProtectedRoute = ({ children, modulo = null }) => {
  const { user, loading, puedeRecorridos, puedeRiegos } = useAuth();

  if (loading) return <RouteSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Una cuenta sin ese módulo no ve la pantalla ni escribiendo la URL a mano.
  // El servidor rechaza sus peticiones igualmente; esto solo evita dejarla
  // delante de una pantalla que no hará más que dar errores.
  const permitido = { recorridos: puedeRecorridos, riegos: puedeRiegos };
  if (modulo && !permitido[modulo]) {
    return <Navigate to={rutaDeInicio({ puedeRecorridos, puedeRiegos })} replace />;
  }

  return children;
};

export { RouteSpinner };
export default ProtectedRoute;
