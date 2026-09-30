import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus, RefreshCw, Users as UsersIcon, ShieldCheck, Pencil, KeyRound, Trash2,
  AlertTriangle, UserPlus, UserPen,
} from 'lucide-react';
import {
  deleteUser, createUser, updateUser, getAllUsers, resetUserPassword, mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import FormularioUsuario, { ResumenUsuario, CampoContrasena } from '../components/formulario/FormularioUsuario';
import { PieDeFormulario } from '../components/formulario/Formulario';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import CardSkeleton from '../components/ui/CardSkeleton';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import SearchField from '../components/ui/SearchField';
import { crossFade, springSheet } from '../lib/motion';
import PestanasAdmin from '../components/PestanasAdmin';
import { useEnvioUnico } from '../hooks/useEnvioUnico';

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').substring(0, 2).toUpperCase();
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const { isAdmin, user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const reduceMotion = useReducedMotion();

  const FORM_CREAR_VACIO = {
    nombre: '', usuario: '', password: '', rol: 'usuario',
    puede_recorridos: true, puede_riegos: true,
  };
  const [createFormData, setCreateFormData] = useState(FORM_CREAR_VACIO);
  const [editFormData, setEditFormData] = useState({
    nombre: '', usuario: '', rol: 'usuario', puede_recorridos: true, puede_riegos: true,
  });
  const [passwordFormData, setPasswordFormData] = useState({ newPassword: '' });

  useEffect(() => {
    if (isAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await getAllUsers());
    } catch (error) {
      showAlert('error', 'No se pudieron cargar los usuarios: ' + mensajeDeError(error));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser?.id) {
      showAlert('warning', 'No puedes eliminar tu propio usuario');
      return;
    }
    setSelectedUser(users.find((user) => user.id === userId));
    setShowDeleteModal(true);
  };

  const confirmDelete = useEnvioUnico(async () => {
    try {
      setEditing(true);
      await deleteUser(selectedUser.id);
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      showAlert('success', 'Usuario eliminado');
    } catch (error) {
      showAlert('error', 'No se pudo eliminar el usuario: ' + mensajeDeError(error));
    } finally {
      setEditing(false);
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  });

  const handleCreateUser = useEnvioUnico(async (event) => {
    event.preventDefault();
    if (!createFormData.nombre || !createFormData.usuario || !createFormData.password) {
      showAlert('warning', 'Completa todos los campos obligatorios');
      return;
    }
    if (createFormData.password.length < 8) {
      showAlert('warning', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setCreating(true);
      const response = await createUser(createFormData);
      if (fueBien(response)) {
        setShowCreateForm(false);
        setCreateFormData(FORM_CREAR_VACIO);
        await loadUsers();
        showAlert('success', 'Usuario registrado');
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo crear el usuario: ' + mensajeDeError(error));
    } finally {
      setCreating(false);
    }
  });

  const handleEditUser = useEnvioUnico(async (event) => {
    event.preventDefault();
    if (!editFormData.nombre || !editFormData.usuario) {
      showAlert('warning', 'El nombre y el usuario son obligatorios');
      return;
    }

    try {
      setEditing(true);
      const response = await updateUser(selectedUser.id, editFormData);
      if (fueBien(response)) {
        setShowEditForm(false);
        setSelectedUser(null);
        await loadUsers();
        showAlert('success', 'Información actualizada');
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudieron guardar los cambios: ' + mensajeDeError(error));
    } finally {
      setEditing(false);
    }
  });

  const handlePasswordReset = useEnvioUnico(async (event) => {
    event.preventDefault();
    if (passwordFormData.newPassword.length < 8) {
      showAlert('warning', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setEditing(true);
      const response = await resetUserPassword(selectedUser.id, passwordFormData.newPassword);
      if (fueBien(response)) {
        setShowPasswordModal(false);
        setPasswordFormData({ newPassword: '' });
        setSelectedUser(null);
        showAlert('success', 'Contraseña restablecida');
      } else {
        showAlert('error', mensajeDeRespuesta(response));
      }
    } catch (error) {
      showAlert('error', 'No se pudo actualizar la contraseña: ' + mensajeDeError(error));
    } finally {
      setEditing(false);
    }
  });

  const openEditForm = (user) => {
    setSelectedUser(user);
    setEditFormData({
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      puede_recorridos: user.puede_recorridos !== false,
      puede_riegos: user.puede_riegos !== false,
    });
    setShowEditForm(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordFormData({ newPassword: '' });
    setShowPasswordModal(true);
  };

  const usersArray = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  // La API impide borrar al último administrador; la UI refleja esa misma regla.

  const totalAdmins = usersArray.filter((u) => u.rol === 'admin').length;

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return usersArray;
    return usersArray.filter((user) =>
      `${user.nombre} ${user.usuario}`.toLowerCase().includes(term)
    );
  }, [usersArray, searchTerm]);

  if (!isAdmin) return null;

  return (
    <div className="pb-4">
      <PestanasAdmin />
      <PageHeader
        title="Usuarios"
        subtitle="Accesos al sistema y permisos"
        actions={
          <>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar usuario…"
              className="w-full sm:w-56"
            />
            <Button
              variant="secondary"
              onClick={loadUsers}
              disabled={loading}
              icon={<RefreshCw size={16} strokeWidth={2.1} className={loading ? 'animate-spin' : ''} />}
            >
              Actualizar
            </Button>
            <Button onClick={() => setShowCreateForm(true)} icon={<Plus size={17} strokeWidth={2.3} />}>
              Nuevo usuario
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total de usuarios" value={loading ? '—' : usersArray.length} icon={UsersIcon} tone="accent" />
        <StatCard
          label="Administradores"
          value={loading ? '—' : usersArray.filter((user) => user.rol === 'admin').length}
          icon={ShieldCheck}
          tone="highlight"
          footnote="Con acceso completo al sistema"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => <CardSkeleton key={index} lineas={1} />)}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={searchTerm ? 'Sin coincidencias' : 'Todavía no hay usuarios'}
          message={
            searchTerm
              ? 'Ningún usuario coincide con esa búsqueda.'
              : 'Registra al primer miembro del equipo para darle acceso.'
          }
          action={
            !searchTerm && (
              <Button onClick={() => setShowCreateForm(true)} icon={<Plus size={17} strokeWidth={2.3} />}>
                Nuevo usuario
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUser?.id;
              // La API permite borrar a un admin salvo que sea el último que
              // queda. Bloquear a todos los admin dejaba cuentas imborrables.
              const esUltimoAdmin = user.rol === 'admin' && totalAdmins <= 1;
              const cannotDelete = isSelf || esUltimoAdmin;

              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={reduceMotion ? crossFade : springSheet}
                >
                  <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
                    <div className="flex-1 p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/14 text-subhead font-semibold text-brand">
                          {getInitials(user.nombre)}
                        </span>
                        <Badge tone={user.rol === 'admin' ? 'caution' : 'accent'}>
                          {user.rol === 'admin' ? 'Administrador' : 'Usuario'}
                        </Badge>
                      </div>

                      <h3 className="break-words text-headline font-semibold text-label">
                        {user.nombre}
                      </h3>
                      <p className="truncate text-footnote text-label-secondary" title={user.usuario}>
                        {user.usuario}
                      </p>

                      {/* Qué puede abrir esta cuenta, de un vistazo. Un admin
                          entra a todo, así que no se le listan módulos. */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {user.rol === 'admin' ? (
                          <Badge tone="neutral">Acceso completo</Badge>
                        ) : (
                          <>
                            {user.puede_recorridos !== false && <Badge tone="accent">Recorridos</Badge>}
                            {user.puede_riegos !== false && <Badge tone="info">Riegos</Badge>}
                            {user.puede_recorridos === false && user.puede_riegos === false && (
                              <Badge tone="critical">Sin acceso</Badge>
                            )}
                          </>
                        )}
                      </div>

                      {isSelf && (
                        <p className="mt-3 text-caption text-label-tertiary">Esta es tu cuenta</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-separator/60 bg-surface-secondary px-4 py-3">
                      <Button
                        variant="secondary" size="sm" className="flex-1"
                        onClick={() => openEditForm(user)}
                        icon={<Pencil size={14} strokeWidth={2.1} />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        aria-label={`Restablecer contraseña de ${user.nombre}`}
                        className="px-2.5 text-label-secondary hover:bg-caution/16 hover:text-caution"
                        onClick={() => openPasswordModal(user)}
                      >
                        <KeyRound size={16} strokeWidth={2} />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        aria-label={`Eliminar a ${user.nombre}`}
                        className="px-2.5 text-label-secondary hover:bg-critical/14 hover:text-critical"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={cannotDelete}
                        title={cannotDelete ? 'No se puede eliminar esta cuenta' : undefined}
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        loading={editing}
        title="Eliminar usuario"
        message={`${selectedUser?.nombre ?? 'Este usuario'} perderá el acceso de forma permanente. No se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
      />

      {/* Crear y editar: el mismo formulario (components/formulario) */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Nuevo usuario"
        description="La cuenta con la que esa persona entrará a Bitácora."
        icono={UserPlus}
        size="max-w-xl"
        footer={(
          <PieDeFormulario
            resumen={<ResumenUsuario datos={createFormData} />}
            onCancelar={() => setShowCreateForm(false)}
            form="form-crear-usuario"
            textoEnviar="Crear usuario"
            cargando={creating}
          />
        )}
      >
        <FormularioUsuario
          id="form-crear-usuario"
          onSubmit={handleCreateUser}
          datos={createFormData}
          onCampo={(campo, valor) => setCreateFormData((antes) => ({ ...antes, [campo]: valor }))}
          conContrasena
          deshabilitado={creating}
        />
      </Modal>

      <Modal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Editar usuario"
        description={selectedUser ? `Cuenta de ${selectedUser.nombre}.` : undefined}
        icono={UserPen}
        size="max-w-xl"
        footer={(
          <PieDeFormulario
            resumen={<ResumenUsuario datos={editFormData} />}
            onCancelar={() => setShowEditForm(false)}
            form="form-editar-usuario"
            textoEnviar="Guardar cambios"
            cargando={editing}
          />
        )}
      >
        <FormularioUsuario
          id="form-editar-usuario"
          onSubmit={handleEditUser}
          datos={editFormData}
          onCampo={(campo, valor) => setEditFormData((antes) => ({ ...antes, [campo]: valor }))}
          deshabilitado={editing}
        />
      </Modal>

      {/* Restablecer contraseña */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }}
        title="Restablecer contraseña"
        description={selectedUser ? `Cuenta de ${selectedUser.nombre}.` : undefined}
        icono={KeyRound}
        tono="caution"
        size="max-w-md"
        footer={(
          <PieDeFormulario
            onCancelar={() => setShowPasswordModal(false)}
            form="form-password"
            textoEnviar="Restablecer"
            cargando={editing}
          />
        )}
      >
        <form id="form-password" onSubmit={handlePasswordReset} className="space-y-4" noValidate autoComplete="off">
          {/* Se avisa ANTES del problema, no después: quien lo haga debe saber
              que tiene que comunicárselo a la persona afectada. */}
          <div className="flex items-start gap-3 rounded-[1.1rem] border border-caution/25 bg-caution/10 p-3.5">
            <AlertTriangle size={18} strokeWidth={2} className="mt-px shrink-0 text-caution" />
            <p className="text-footnote leading-relaxed text-label-secondary">
              Vas a cambiar la contraseña de <strong className="font-semibold text-label">{selectedUser?.nombre}</strong>.
              Se cerrarán sus sesiones y tendrás que comunicársela para que pueda volver a entrar.
            </p>
          </div>

          <CampoContrasena
            etiqueta="Nueva contraseña"
            valor={passwordFormData.newPassword}
            onCambiar={(valor) => setPasswordFormData({ newPassword: valor })}
            deshabilitado={editing}
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
};

export default Users;
