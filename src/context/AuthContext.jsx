import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  login as loginApi,
  logoutApi,
  getCurrentUser,
  updateProfile as updateProfileApi,
  changePassword as changePasswordApi,
  guardarSesion,
  limpiarSesion,
  getAccessToken,
  registrarCierreDeSesion,
  mensajeDeError,
  esFalloDeRed,
  getCurrentUserInfo,
} from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /** Devuelve la promesa del borrado de las copias: esperarla antes de recargar. */
  const cerrarSesionLocal = useCallback(() => {
    const borrado = limpiarSesion();
    setUser(null);
    return borrado;
  }, []);

  // Si el refresh token también caduca o se revoca, api.js avisa por aquí en
  // lugar de forzar un window.location, que perdía el estado de React.
  useEffect(() => {
    registrarCierreDeSesion(() => {
      cerrarSesionLocal();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    });
  }, [cerrarSesionLocal]);

  useEffect(() => {
    const comprobarSesion = async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        // /auth/me devuelve la ficha real de la base de datos, no el contenido
        // del token: si un admin te cambió el rol, aquí se ve al instante.
        const { data } = await getCurrentUser();
        setUser(data.data);
        guardarSesion({ usuario: data.data });
      } catch (err) {
        // Sin red o sin respuesta a tiempo NO es lo mismo que una sesión
        // inválida. Antes las dos acababan igual: una mala señal al abrir la
        // app te mandaba al login aunque tu sesión fuera buena. Ahora se entra
        // con la última ficha conocida; la siguiente petición que llegue al
        // servidor vuelve a comprobarlo todo, y el servidor sigue siendo quien
        // decide qué se puede hacer.
        const guardado = getCurrentUserInfo();
        if (esFalloDeRed(err) && guardado?.id) {
          setUser(guardado);
        } else {
          // El servidor contestó y el interceptor ya intentó renovar: no hay sesión.
          cerrarSesionLocal();
        }
      } finally {
        setLoading(false);
      }
    };
    comprobarSesion();
  }, [cerrarSesionLocal]);

  const login = async (nombreUsuario, password) => {
    try {
      setError('');
      const { data } = await loginApi({ usuario: nombreUsuario, password });

      // La respuesta pasó de { token, user } a { data: { access_token,
      // refresh_token, usuario } }.
      const { usuario, access_token, refresh_token } = data.data;
      guardarSesion({ access_token, refresh_token, usuario });
      setUser(usuario);

      return { success: true };
    } catch (err) {
      const message = mensajeDeError(err, 'Error en el login');
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    // Se avisa al servidor para que revoque el refresh token. Si falla (sin
    // red, token ya caducado) se cierra igualmente en local: nunca se deja al
    // usuario atrapado en una sesión que quiere abandonar.
    try { await logoutApi(); } catch { /* ignorado a propósito */ }
    await cerrarSesionLocal();
    window.location.href = '/login';
  };

  /** Auto-edición de perfil: PUT /auth/me. No permite cambiar el rol. */
  const updateProfile = async (cambios) => {
    try {
      const { data } = await updateProfileApi(cambios);
      setUser(data.data);
      guardarSesion({ usuario: data.data });
      return { success: true, usuario: data.data };
    } catch (err) {
      return { success: false, error: mensajeDeError(err, 'No se pudo actualizar el perfil') };
    }
  };

  /**
   * Cambiar la contraseña exige la actual y cierra todas las sesiones, así que
   * después hay que volver a entrar. Eso es intencional.
   */
  const changePassword = async (passwordActual, passwordNueva) => {
    try {
      await changePasswordApi({ password_actual: passwordActual, password_nueva: passwordNueva });
      cerrarSesionLocal();
      return { success: true };
    } catch (err) {
      return { success: false, error: mensajeDeError(err, 'No se pudo cambiar la contraseña') };
    }
  };

  const esAdmin = user?.rol === 'admin';

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: esAdmin,
    // Qué módulos ve esta cuenta. Sirve para decidir el menú y las pantallas,
    // NO para autorizar: eso lo hace el servidor en cada ruta. Esconder un
    // botón no impide llamar a la API a mano.
    puedeRecorridos: esAdmin || user?.puede_recorridos === true,
    puedeRiegos: esAdmin || user?.puede_riegos === true,
    login,
    logout,
    updateProfile,
    changePassword,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
