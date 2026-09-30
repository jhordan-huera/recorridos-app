import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';

/**
 * Campo de contraseña con el ojo para verla.
 *
 * Al escribir una contraseña nueva, sobre todo la de otra persona (la que el
 * administrador pone al crear una cuenta), hay que poder comprobar que quedó
 * bien escrita antes de guardarla. Es el mismo ojo del inicio de sesión.
 * Acepta todo lo que acepta Input; el tipo lo decide el ojo.
 */
const InputContrasena = React.forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible((antes) => !antes)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="tappable rounded-full p-1.5 text-label-tertiary transition-colors hover:bg-fill/12 hover:text-label"
        >
          {visible ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
        </button>
      )}
    />
  );
});
InputContrasena.displayName = 'InputContrasena';

export default InputContrasena;
