import React, { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { User, Lock, ArrowRight, NotebookPen, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rutaDeInicio } from '../lib/navegacion';
import ThemeToggle from '../components/ui/ThemeToggle';
import Paisaje from '../components/ilustracion/Paisaje';
import { crossFade, springSheet } from '../lib/motion';

/** Lo que cuenta el panel de la ilustración, uno cada pocos segundos. */
const MENSAJES = [
  {
    titulo: ['Todo lo que haces,', 'bajo control.'],
    texto: 'Recorridos, riegos y cobros del mes en un solo lugar.',
  },
  {
    titulo: ['Registra aunque', 'no haya señal.'],
    texto: 'Lo que guardas sin conexión se envía solo al volver la red.',
  },
  {
    titulo: ['Cierra el mes', 'y cobra.'],
    texto: 'Tu estado de cuenta en PDF, con el detalle de cada día.',
  },
];
const CADA_MS = 6000;

/** Logotipo: la libreta sobre el degradado de la marca. */
const Marca = () => (
  <span
    className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-accent to-brand
               text-white shadow-[0_14px_32px_-10px_rgb(var(--c-accent)/0.65)]"
  >
    <NotebookPen size={30} strokeWidth={2.1} />
  </span>
);

/**
 * Campo del login: más alto y redondeado que los del resto de la app, con
 * el icono dentro. La etiqueta existe aunque no se vea: sin ella, un lector
 * de pantalla solo anunciaría "campo de texto".
 */
const Campo = React.forwardRef(({ etiqueta, icono: Icono, error, trailing, ...props }, ref) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">{etiqueta}</label>
      <div
        className={`group flex h-14 items-center gap-3 rounded-[1.1rem] border bg-surface px-4
                    shadow-level-1 transition-[border-color,box-shadow] duration-[var(--t-fast)]
                    focus-within:shadow-focus
                    ${error ? 'border-critical' : 'border-separator/60 focus-within:border-accent'}`}
      >
        <Icono
          size={19} strokeWidth={1.9} aria-hidden="true"
          className="shrink-0 text-label-tertiary transition-colors group-focus-within:text-accent"
        />
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-label outline-none placeholder:text-label-tertiary"
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-footnote text-critical">{error}</p>
      )}
    </div>
  );
});
Campo.displayName = 'Campo';

const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ usuario: false, password: false });
  const [mensaje, setMensaje] = useState(0);
  const [pausado, setPausado] = useState(false);

  const { login, user, error, setError, puedeRecorridos, puedeRiegos } = useAuth();
  const inicio = rutaDeInicio({ puedeRecorridos, puedeRiegos });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (user) navigate(inicio);
    setError('');
  }, [user, navigate, setError, inicio]);

  // Los mensajes pasan solos, salvo con movimiento reducido o con el puntero
  // encima: nadie quiere que el texto cambie mientras lo está leyendo.
  useEffect(() => {
    if (reduceMotion || pausado) return undefined;
    const reloj = setInterval(() => setMensaje((m) => (m + 1) % MENSAJES.length), CADA_MS);
    return () => clearInterval(reloj);
  }, [reduceMotion, pausado]);

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

  const actual = MENSAJES[mensaje];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-canvas md:flex">
      <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      {/* ── Ilustración ──────────────────────────────────────────────────────
          En el móvil ocupa la parte de arriba y en escritorio la izquierda,
          cortada en diagonal en los dos casos. */}
      <section
        aria-label="Bitácora"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        className="relative h-[38dvh] min-h-[250px] w-full
                   [clip-path:polygon(0_0,100%_0,100%_68%,0_100%)]
                   md:absolute md:inset-y-0 md:left-0 md:h-auto md:w-[58%]
                   md:[clip-path:polygon(0_0,100%_0,74%_100%,0_100%)]"
      >
        <Paisaje className="absolute inset-0 h-full w-full" />
        {/* Oscurece arriba y abajo para que el texto blanco se lea sobre el cielo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#020b22]/55 via-transparent via-40% to-[#020b22]/85"
        />

        <div className="relative flex h-full flex-col justify-between p-6 md:p-12 lg:p-14">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-white/15 ring-1 ring-white/25 backdrop-blur-thin">
              <NotebookPen size={19} strokeWidth={2.2} />
            </span>
            <span className="text-headline font-semibold tracking-tight">Bitácora</span>
          </div>

          {/* Mensajes: solo en escritorio, donde hay sitio. */}
          <div className="hidden max-w-md pb-2 md:block">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mensaje}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reduceMotion ? crossFade : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              >
                <h2 className="text-display font-bold text-white">
                  {actual.titulo[0]}<br />
                  <span className="text-[#9cc8ff]">{actual.titulo[1]}</span>
                </h2>
                <p className="mt-4 text-body text-white/80">{actual.texto}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-2">
              {MENSAJES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMensaje(i)}
                  aria-label={`Mensaje ${i + 1} de ${MENSAJES.length}`}
                  aria-current={i === mensaje ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === mensaje ? 'w-8 bg-white' : 'w-4 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Formulario ─────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex justify-center px-6 pb-12 md:ml-auto md:min-h-[100dvh] md:w-[46%] md:items-center md:px-10 md:py-12">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? crossFade : springSheet}
          className="-mt-8 w-full max-w-[25rem] md:mt-0"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <Marca />
            <h1 className="mt-6 text-title1 font-bold text-label">Bienvenido</h1>
            <p className="mt-1 text-subhead text-label-secondary">
              Entra con tu cuenta para llevar tus registros al día.
            </p>
          </div>

          {error && (
            <motion.div
              role="alert"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? crossFade : springSheet}
              className="mb-5 flex items-start gap-3 rounded-[1.1rem] border border-critical/25 bg-critical/10 p-3.5"
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
            <Campo
              etiqueta="Usuario"
              icono={User}
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
              placeholder="Usuario"
              value={usuario}
              error={usuarioError}
              onChange={(event) => setUsuario(event.target.value)}
              onBlur={() => setTouched((state) => ({ ...state, usuario: true }))}
              required
            />

            <Campo
              etiqueta="Contraseña"
              icono={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              error={passwordError}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((state) => ({ ...state, password: true }))}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="tappable -mr-1.5 shrink-0 rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-fill/12 hover:text-label"
                >
                  {showPassword ? <EyeOff size={19} strokeWidth={1.9} /> : <Eye size={19} strokeWidth={1.9} />}
                </button>
              }
            />

            {/* El botón de la imagen: píldora con el degradado de la marca y
                la flecha en un círculo al final. */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="tappable relative !mt-6 flex h-14 w-full items-center justify-center rounded-full
                         bg-gradient-to-r from-accent to-brand px-16 text-body font-semibold text-white
                         shadow-[0_14px_30px_-12px_rgb(var(--c-accent)/0.75)] transition-[filter,opacity]
                         hover:brightness-110 disabled:opacity-70"
            >
              {isLoading ? 'Verificando…' : 'Iniciar sesión'}
              <span
                aria-hidden="true"
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent"
              >
                {isLoading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  : <ArrowRight size={19} strokeWidth={2.4} />}
              </span>
            </motion.button>
          </form>

          <div aria-hidden="true" className="my-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-separator/70" />
            <span className="flex gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-label-quaternary" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-label-quaternary" />
            </span>
            <span className="h-px flex-1 bg-separator/70" />
          </div>

          <p className="text-center text-footnote text-label-secondary">
            ¿No tienes cuenta? Pídesela al administrador.
          </p>
          <p className="mt-2 text-center text-caption text-label-tertiary">
            © {new Date().getFullYear()} Bitácora
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;
