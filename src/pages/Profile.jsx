import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CircleUser, AtSign, Shield, KeyRound, ChevronRight, ChevronLeft,
  Bell, Sun, HelpCircle, LogOut, Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useApp } from '../context/AppContext';
import { getCurrentUser } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ThemeToggle from '../components/ui/ThemeToggle';
import ConfirmModal from '../components/ui/ConfirmModal';
import { crossFade, springSheet, springSnappy } from '../lib/motion';

const extractName = (u) => {
  if (!u) return null;
  return u.nombre || u.full_name || u.user_metadata?.full_name || u.user_metadata?.name;
};

/**
 * Fila de ajuste.
 *
 * El control está junto a lo que afecta y la flecha indica que hay un nivel
 * más abajo. Se hunde en la pulsación, no al soltar.
 */
const SettingRow = ({ icon: Icon, label, sublabel, onClick, trailing, danger = false, tone = 'accent' }) => {
  const reduceMotion = useReducedMotion();
  const tones = {
    accent: 'bg-accent/12 text-accent',
    brand: 'bg-brand/14 text-brand',
    info: 'bg-info/14 text-info',
    caution: 'bg-caution/16 text-caution',
    highlight: 'bg-highlight/14 text-highlight',
    positive: 'bg-positive/14 text-positive',
    neutral: 'bg-fill/12 text-label-secondary',
  };

  const content = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-field ${danger ? 'bg-critical/12 text-critical' : tones[tone]}`}>
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block text-subhead font-medium ${danger ? 'text-critical' : 'text-label'}`}>
          {label}
        </span>
        {sublabel && <span className="mt-0.5 block text-footnote text-label-tertiary">{sublabel}</span>}
      </span>
      {trailing ?? (onClick && <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-label-quaternary" />)}
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-3 px-4 py-3">{content}</div>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? { opacity: 0.6 } : { backgroundColor: 'rgb(var(--c-fill) / 0.12)' }}
      transition={springSnappy}
      className="tappable flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill/8"
    >
      {content}
    </motion.button>
  );
};

const SettingGroup = ({ title, children }) => (
  <section className="mb-5">
    {title && (
      <h2 className="mb-2 px-4 text-footnote font-medium text-label-secondary">{title}</h2>
    )}
    <Card padding="p-0" className="divide-y divide-separator/50 overflow-hidden">
      {children}
    </Card>
  </section>
);

const Profile = () => {
  // updateProfile y changePassword salen del contexto: PUT /users/:id es
  // solo para administradores, así que un usuario normal no puede editarse
  // por esa vía. La auto-edición va por PUT /auth/me.
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { showAlert } = useAlert();
  const { resolvedTheme } = useApp();
  const reduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '', usuario: '', passwordActual: '', password: '', confirmPassword: '',
  });
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getCurrentUser();
        const userData = response.data.data;
        const name = extractName(userData) || '';
        setFormData((prev) => ({ ...prev, nombre: name, usuario: userData.usuario || '' }));
        setDisplayName(name);
      } catch {
        // Sin conexión con el servidor caemos a lo que ya tenemos en sesión.
        if (user) {
          const name = extractName(user) || '';
          setFormData((prev) => ({ ...prev, nombre: name, usuario: user.usuario || '' }));
          setDisplayName(name);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  const handleChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const handleSubmitPerfil = async (event) => {
    event.preventDefault();
    setLoading(true);
    const resultado = await updateProfile({ nombre: formData.nombre, usuario: formData.usuario });
    setLoading(false);

    if (resultado.success) {
      showAlert('success', 'Perfil actualizado');
      setDisplayName(formData.nombre);
      setSection('main');
    } else {
      showAlert('error', resultado.error);
    }
  };

  /**
   * Cambio de contraseña. Exige la actual (el servidor la verifica) y al
   * terminar cierra TODAS las sesiones, así que hay que volver a entrar.
   */
  const handleSubmitPassword = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showAlert('error', 'Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 8) {
      showAlert('error', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    const resultado = await changePassword(formData.passwordActual, formData.password);
    setLoading(false);

    if (resultado.success) {
      showAlert('success', 'Contraseña actualizada. Vuelve a iniciar sesión.');
      setFormData((prev) => ({ ...prev, passwordActual: '', password: '', confirmPassword: '' }));
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } else {
      showAlert('error', resultado.error);
    }
  };

  // Las subvistas entran desde la derecha y se van por la derecha: si algo
  // desaparece por un lado, se espera que vuelva a aparecer por ahí.
  const subviewMotion = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 },
    transition: reduceMotion ? crossFade : springSheet,
  };

  const SubviewHeader = ({ title }) => (
    <div className="mb-5 flex items-center gap-1">
      <motion.button
        type="button"
        onClick={() => setSection('main')}
        whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.92 }}
        transition={springSnappy}
        className="tappable -ml-2 flex items-center gap-0.5 rounded-field py-1 pl-1 pr-2 text-accent transition-colors hover:bg-fill/10"
      >
        <ChevronLeft size={20} strokeWidth={2.3} />
        <span className="text-subhead font-medium">Atrás</span>
      </motion.button>
      <h1 className="text-title3 font-semibold text-label">{title}</h1>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl pb-4">
      <AnimatePresence mode="wait" initial={false}>

        {section === 'personal' && (
          <motion.div key="personal" {...subviewMotion}>
            <SubviewHeader title="Datos personales" />
            <Card>
              <form onSubmit={handleSubmitPerfil} className="space-y-4">
                <Input
                  label="Nombre completo" name="nombre" icon={CircleUser}
                  value={formData.nombre} onChange={handleChange} required
                />
                <Input
                  label="Usuario" name="usuario" type="text" icon={AtSign}
                  autoCapitalize="none" spellCheck={false}
                  value={formData.usuario} onChange={handleChange} required minLength={3}
                />
                <Button type="submit" loading={loading} className="w-full">
                  Guardar cambios
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {section === 'security' && (
          <motion.div key="security" {...subviewMotion}>
            <SubviewHeader title="Seguridad" />
            <Card>
              <div className="mb-4 flex items-start gap-3 rounded-control border border-caution/25 bg-caution/10 p-3.5">
                <Lock size={17} strokeWidth={2} className="mt-px shrink-0 text-caution" />
                <p className="text-footnote leading-relaxed text-label-secondary">
                  Al cambiar la contraseña se cerrarán todas tus sesiones y tendrás que
                  volver a entrar. Usa una que no utilices en otros sitios.
                </p>
              </div>

              <form onSubmit={handleSubmitPassword} className="space-y-4">
                <Input
                  label="Contraseña actual" name="passwordActual" type="password" icon={Lock}
                  autoComplete="current-password"
                  value={formData.passwordActual} onChange={handleChange}
                  placeholder="••••••••" required
                />
                <Input
                  label="Nueva contraseña" name="password" type="password" icon={KeyRound}
                  autoComplete="new-password"
                  value={formData.password} onChange={handleChange}
                  placeholder="••••••••" required minLength={8} hint="Mínimo 8 caracteres"
                />
                <Input
                  label="Confirmar contraseña" name="confirmPassword" type="password" icon={KeyRound}
                  autoComplete="new-password"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="••••••••" required
                  error={
                    formData.confirmPassword && formData.confirmPassword !== formData.password
                      ? 'Las contraseñas no coinciden'
                      : undefined
                  }
                />
                <Button type="submit" loading={loading} className="w-full">
                  Actualizar contraseña
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {section === 'main' && (
          <motion.div
            key="main"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={reduceMotion ? crossFade : springSheet}
          >
            <div className="mb-6 flex flex-col items-center py-4 text-center">
              <span className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-large-title font-semibold text-white">
                {initial}
              </span>
              <h1 className="text-title2 font-semibold text-label">{displayName || 'Usuario'}</h1>
              <p className="mt-0.5 text-subhead text-label-secondary">{formData.usuario}</p>
            </div>

            <SettingGroup title="Cuenta">
              <SettingRow
                icon={CircleUser} tone="accent"
                label="Datos personales" sublabel="Nombre y correo electrónico"
                onClick={() => setSection('personal')}
              />
              <SettingRow
                icon={KeyRound} tone="info"
                label="Seguridad" sublabel="Cambiar contraseña"
                onClick={() => setSection('security')}
              />
            </SettingGroup>

            <SettingGroup title="Preferencias">
              {/* El control vive junto a lo que cambia: el tema se ajusta aquí
                  mismo, sin abrir otra pantalla para una sola opción. */}
              <SettingRow
                icon={Sun} tone="highlight"
                label="Apariencia"
                sublabel={resolvedTheme === 'dark' ? 'Tema oscuro' : 'Tema claro'}
                trailing={<ThemeToggle />}
              />
              <SettingRow
                icon={Bell} tone="caution"
                label="Notificaciones" sublabel="Próximamente"
                onClick={() => showAlert('info', 'Las notificaciones aún no están disponibles')}
              />
              <SettingRow
                icon={Shield} tone="neutral"
                label="Privacidad" sublabel="Próximamente"
                onClick={() => showAlert('info', 'Los ajustes de privacidad aún no están disponibles')}
              />
            </SettingGroup>

            <SettingGroup>
              <SettingRow
                icon={HelpCircle} tone="positive"
                label="Ayuda" sublabel="Contactar con soporte"
                onClick={() => showAlert('info', 'Escribe a soporte para recibir ayuda')}
              />
              <SettingRow
                icon={LogOut} danger
                label="Cerrar sesión"
                onClick={() => setShowLogoutConfirm(true)}
              />
            </SettingGroup>

            <p className="text-center text-footnote text-label-tertiary">Recorridos v1.2.0</p>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Cerrar sesión"
        message="Tendrás que volver a introducir tus credenciales para entrar."
        confirmText="Cerrar sesión"
        type="warning"
      />
    </div>
  );
};

export default Profile;
