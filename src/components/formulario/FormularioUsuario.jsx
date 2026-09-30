import React, { useState } from 'react';
import {
  CircleUser, User, AtSign, Lock, Eye, EyeOff, ShieldCheck, LayoutGrid,
  Route as RouteIcon, Droplets, Check, Info, TriangleAlert,
} from 'lucide-react';
import { Seccion, CajaCampo, OpcionesGrandes, OpcionesMarcables } from './Formulario';
import { useCoarsePointer } from '../../hooks/useMediaPreference';

/** Lo mínimo que exige la API para una contraseña. */
const MINIMO_CONTRASENA = 8;

const ROLES = [
  { valor: 'usuario', titulo: 'Usuario', detalle: 'Usa los módulos que le des', icono: User, tono: 'accent' },
  { valor: 'admin', titulo: 'Administrador', detalle: 'Todo, y gestiona las cuentas', icono: ShieldCheck, tono: 'caution' },
];

/**
 * Qué podrá hacer la cuenta, en una línea, para el pie del formulario.
 */
export const ResumenUsuario = ({ datos }) => {
  if (datos.rol === 'admin') return <>Administrador: <span className="font-semibold text-label">acceso a todo</span></>;
  const modulos = [datos.puede_recorridos && 'Recorridos', datos.puede_riegos && 'Riegos'].filter(Boolean);
  if (modulos.length === 0) return <span className="text-caution">Solo podrá ver su perfil</span>;
  return <>Podrá usar <span className="font-semibold text-label">{modulos.join(' y ')}</span></>;
};

/**
 * Contraseña con el ojo para verla y, debajo, si ya llega al mínimo. Quien
 * crea la cuenta tiene que dársela a la otra persona: poder comprobarla
 * antes de guardar evita un "no me deja entrar".
 */
export const CampoContrasena = ({ etiqueta = 'Contraseña', valor, onCambiar, deshabilitado = false, autoFocus = false }) => {
  const [visible, setVisible] = useState(false);
  // En el táctil no: el teclado saldría solo y taparía media hoja.
  const tactil = useCoarsePointer();
  const largo = valor.length;
  const suficiente = largo >= MINIMO_CONTRASENA;

  return (
    <div>
      <CajaCampo
        icono={Lock}
        etiqueta={etiqueta}
        trailing={(
          <button
            type="button"
            onClick={() => setVisible((antes) => !antes)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="tappable -mr-1.5 shrink-0 rounded-full p-2 text-label-tertiary transition-colors hover:bg-fill/12 hover:text-label"
          >
            {visible ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
          </button>
        )}
      >
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="••••••••"
          value={valor}
          disabled={deshabilitado}
          autoFocus={autoFocus && !tactil}
          onChange={(e) => onCambiar(e.target.value)}
        />
      </CajaCampo>
      <p className={`mt-1.5 flex items-center gap-1.5 px-1 text-caption ${
        suficiente ? 'text-positive' : 'text-label-tertiary'
      }`}
      >
        {suficiente
          ? <Check size={13} strokeWidth={2.8} aria-hidden="true" />
          : <span className="tabular font-semibold">{largo}/{MINIMO_CONTRASENA}</span>}
        {suficiente ? 'Largo suficiente' : `Mínimo ${MINIMO_CONTRASENA} caracteres`}
      </p>
    </div>
  );
};

/**
 * Formulario de una cuenta, el mismo para crearla y para editarla. Al crear
 * pide también la contraseña; al editar no, porque eso tiene su propio
 * formulario (Restablecer contraseña).
 *
 *  - Datos de la cuenta: nombre, usuario y, al crear, la contraseña.
 *  - Rol: Usuario o Administrador, en dos opciones grandes.
 *  - Qué puede usar: Recorridos y Riegos, que se marcan por separado. Un
 *    administrador entra a todo, así que ahí no se ofrecen: dejarlos
 *    marcables diría que se le puede cerrar un módulo, y no es así.
 */
const FormularioUsuario = ({ id, onSubmit, datos, onCampo, conContrasena = false, deshabilitado = false }) => {
  // El cursor va solo al nombre en escritorio. En el táctil, el teclado
  // saldría nada más abrir y taparía media hoja.
  const tactil = useCoarsePointer();
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-5" noValidate autoComplete="off">
      <Seccion icono={CircleUser} titulo="Datos de la cuenta">
        <div className="space-y-2">
          <CajaCampo icono={User} etiqueta="Nombre completo">
            <input
              type="text"
              placeholder="Ana García"
              value={datos.nombre}
              disabled={deshabilitado}
              autoFocus={conContrasena && !tactil}
              onChange={(e) => onCampo('nombre', e.target.value)}
            />
          </CajaCampo>
          <div>
            <CajaCampo icono={AtSign} etiqueta="Usuario">
              <input
                type="text"
                placeholder="ana.garcia"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                value={datos.usuario}
                disabled={deshabilitado}
                onChange={(e) => onCampo('usuario', e.target.value)}
              />
            </CajaCampo>
            <p className="mt-1.5 flex items-center gap-1.5 px-1 text-caption text-label-tertiary">
              <Info size={13} strokeWidth={2.2} aria-hidden="true" />
              Con lo que entrará. No hace falta que sea un correo.
            </p>
          </div>
          {conContrasena && (
            <CampoContrasena
              valor={datos.password}
              onCambiar={(v) => onCampo('password', v)}
              deshabilitado={deshabilitado}
            />
          )}
        </div>
      </Seccion>

      <Seccion icono={ShieldCheck} titulo="Rol">
        <OpcionesGrandes
          etiqueta="Rol de la cuenta"
          opciones={ROLES}
          valor={datos.rol}
          onCambiar={(v) => onCampo('rol', v)}
          deshabilitado={deshabilitado}
          apilar
        />
      </Seccion>

      <Seccion icono={LayoutGrid} titulo="Qué puede usar">
        {datos.rol === 'admin' ? (
          <p className="flex items-start gap-2.5 rounded-[1.1rem] border border-caution/25 bg-caution/8 p-3.5 text-footnote text-label-secondary">
            <ShieldCheck size={17} strokeWidth={2} className="mt-px shrink-0 text-caution" aria-hidden="true" />
            Un administrador entra a todos los módulos y además gestiona las cuentas y los cobros.
          </p>
        ) : (
          <>
            <OpcionesMarcables
              etiqueta="Módulos de la cuenta"
              deshabilitado={deshabilitado}
              opciones={[
                {
                  clave: 'recorridos', titulo: 'Recorridos', detalle: 'Con estudiantes y vehículos',
                  icono: RouteIcon, tono: 'positive',
                  marcada: datos.puede_recorridos, onCambiar: (v) => onCampo('puede_recorridos', v),
                },
                {
                  clave: 'riegos', titulo: 'Riegos', detalle: 'Riegos de césped',
                  icono: Droplets, tono: 'info',
                  marcada: datos.puede_riegos, onCambiar: (v) => onCampo('puede_riegos', v),
                },
              ]}
            />
            {!datos.puede_recorridos && !datos.puede_riegos && (
              <p className="mt-2 flex items-start gap-1.5 px-0.5 text-caption text-caution">
                <TriangleAlert size={13} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden="true" />
                Sin ningún módulo, la cuenta solo podrá ver su perfil.
              </p>
            )}
          </>
        )}
      </Seccion>
    </form>
  );
};

export default FormularioUsuario;
