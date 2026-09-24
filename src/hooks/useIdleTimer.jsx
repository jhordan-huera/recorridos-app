import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { estaEnLinea } from '../lib/conexion';

const useIdleTimer = (timeout = 1000 * 60 * 15) => { // 15 minutos por defecto
    const [isIdle, setIsIdle] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsIdle(false);
        timerRef.current = setTimeout(() => {
            // Sin conexión no se cierra: para volver a entrar hace falta
            // internet, y la sesión caída dejaría el teléfono inservible justo
            // cuando hay que registrar algo sin señal. Se vuelve a contar.
            if (!estaEnLinea() || navigator.onLine === false) {
                resetTimer();
                return;
            }
            setIsIdle(true);
            logout();
            navigate('/login');
        }, timeout);
    };

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

        const handleActivity = () => resetTimer();

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        resetTimer(); // Iniciar timer

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [logout, navigate, timeout]);

    return isIdle;
};

export default useIdleTimer;
