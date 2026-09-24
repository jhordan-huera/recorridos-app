import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AtSign, Lock, ArrowRight, NotebookPen, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rutaDeInicio } from '../lib/navegacion';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ThemeToggle from '../components/ui/ThemeToggle';
import { crossFade, springSheet } from '../lib/motion';

const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ usuario: false, password: false });

  const { login, user, error, setError, puedeRecorridos, puedeRiegos } = useAuth();
  const inicio = rutaDeInicio({ puedeRecorridos, puedeRiegos });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (user) navigate(inicio);
    setError('');
  }, [user, navigate, setError, inicio]);

  // Validación en línea: se avisa en cuanto el campo se ha visitado, no al
  // enviar. Antes de tocarlo no se regaña a nadie por algo que aún no hizo.
  //
  // Ya no se exige forma de correo: las cuentas las crea el administrador y el
  // nombre de usuario puede ser cualquier cosa. Solo se comprueba que no esté
  // vacío; si no existe, lo dice el servidor.
  const usuarioError = touched.usuario && usuario.trim().length === 0
    ? 'Introduce tu usuario'
    : undefined;
  const passwordError = touched.password && password.length === 0
    ? 'Introduce tu contraseña'
    : undefined;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ usuario: true, password: true });
    if (!usuario.trim() || !password) return;

    setError('');
    setIsLoading(true);
    await login(usuario.trim(), password);
    setIsLoading(false);
    // Aquí NO se navega. El destino depende de los permisos de la cuenta, y en
    // este punto `inicio` todavía es el de antes de entrar: sin usuario aún,
    // valía /perfil y mandaba allí un instante antes de corregirse. De llevar
    // a cada quien a su sitio se encarga el efecto de arriba, que se dispara
    // cuando el usuario ya está cargado.
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
              <NotebookPen size={23} strokeWidth={2.2} />
            </span>
            <h1 className="text-large-title font-semibold text-label">Bienvenido</h1>
            <p className="mt-1.5 text-subhead text-label-secondary">
              Entra con tu cuenta para llevar tus registros al día.
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

          {/* autoComplete="off" en el formulario y en el campo: sin esto el
              navegador ofrece los usuarios ya escritos en un desplegable, y
              eso enseña quién usa la aplicación a cualquiera que abra el
              login en ese equipo. */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <Input
              label="Usuario"
              type="text"
              name="acceso"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              // Los gestores de contraseñas tienen su propia marca para
              // saltarse un campo; autoComplete por sí solo no les basta.
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              icon={AtSign}
              value={usuario}
              error={usuarioError}
              onChange={(event) => setUsuario(event.target.value)}
              onBlur={() => setTouched((state) => ({ ...state, usuario: true }))}
              placeholder="tu usuario"
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
            © {new Date().getFullYear()} Bitácora
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
            <NotebookPen size={21} strokeWidth={2.2} />
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-display font-semibold text-label">
            Todo lo que haces,<br />bajo control.
          </h2>
          <p className="mt-5 text-body leading-relaxed text-label-secondary">
            Registra recorridos y riegos, sigue el gasto del mes y emite tus estados
            de cuenta desde un único lugar.
          </p>
        </div>

        <p className="relative text-footnote text-label-tertiary">
          Transporte, riego y cobros
        </p>
      </div>
    </div>
  );
};

export default Login;
