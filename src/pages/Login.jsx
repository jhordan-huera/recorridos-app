import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Mail, Lock, ArrowRight, Route, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ThemeToggle from '../components/ui/ThemeToggle';
import { crossFade, springSheet } from '../lib/motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const { login, user, error, setError } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (user) navigate('/dashboard');
    setError('');
  }, [user, navigate, setError]);

  // Validación en línea: se avisa en cuanto el campo se ha visitado, no al
  // enviar. Antes de tocarlo no se regaña a nadie por algo que aún no hizo.
  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Introduce un correo válido'
    : undefined;
  const passwordError = touched.password && password.length === 0
    ? 'Introduce tu contraseña'
    : undefined;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || !email || !password) return;

    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="flex min-h-[100dvh] bg-canvas">

      {/* --- Formulario --- */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-20">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? crossFade : springSheet}
          className="mx-auto w-full max-w-[24rem]"
        >
          <div className="mb-8">
            <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-panel bg-accent text-white md:hidden">
              <Route size={24} strokeWidth={2.3} />
            </span>
            <h1 className="text-large-title font-semibold text-label">Bienvenido</h1>
            <p className="mt-1.5 text-subhead text-label-secondary">
              Entra con tu cuenta para gestionar los recorridos.
            </p>
          </div>

          {error && (
            <motion.div
              role="alert"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? crossFade : springSheet}
              className="mb-5 flex items-start gap-3 rounded-control border border-critical/25 bg-critical/10 p-3.5"
            >
              <AlertCircle size={18} strokeWidth={2} className="mt-px shrink-0 text-critical" />
              <p className="text-subhead font-medium text-critical">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              icon={Mail}
              value={email}
              error={emailError}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((state) => ({ ...state, email: true }))}
              placeholder="nombre@empresa.com"
              required
            />

            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              icon={Lock}
              value={password}
              error={passwordError}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((state) => ({ ...state, password: true }))}
              placeholder="••••••••"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="tappable rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-fill/12 hover:text-label"
                >
                  {showPassword ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
                </button>
              }
            />

            <Button
              type="submit"
              size="lg"
              loading={isLoading}
              loadingText="Verificando"
              className="w-full"
              iconTrailing={!isLoading && <ArrowRight size={18} strokeWidth={2.2} />}
            >
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-10 text-center text-footnote text-label-tertiary">
            © {new Date().getFullYear()} Recorridos
          </p>
        </motion.div>
      </div>

      {/* --- Panel de marca (escritorio) --- */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-secondary p-12 md:flex lg:p-16">
        {/* Fondo estático: una superficie grande en movimiento perpetuo cansa
            y compite con el formulario, que es lo que hay que mirar. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,rgb(var(--c-accent)/0.16),transparent_60%),radial-gradient(90%_70%_at_10%_95%,rgb(var(--c-indigo)/0.14),transparent_60%)]"
        />

        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-panel bg-accent text-white">
            <Route size={22} strokeWidth={2.3} />
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-display font-semibold text-label">
            Cada ruta,<br />bajo control.
          </h2>
          <p className="mt-5 text-body leading-relaxed text-label-secondary">
            Planifica recorridos, asigna vehículos y sigue el gasto del mes desde un
            único panel.
          </p>
        </div>

        <p className="relative text-footnote text-label-tertiary">
          Gestión de transporte escolar
        </p>
      </div>
    </div>
  );
};

export default Login;
