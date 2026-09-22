import { useEffect, useState } from 'react';
import { useAlert } from '../context/AlertContext';
import {
  createRiego, updateRiego, mensajeDeError, fueBien, mensajeDeRespuesta,
} from '../services/api';
import { hoyISO, horaActual } from '../lib/fechas';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

/* Fecha y hora arrancan en el momento de abrir el formulario: lo normal es
   registrar el riego justo después de hacerlo. Son funciones, no constantes,
   porque una constante congelaría la hora en que se cargó la página.

   El costo vacío NO se envía: la base de datos pone 1.00. Prefijarlo aquí
   duplicaría el valor por defecto en dos sitios que algún día discreparían. */
const formVacio = () => ({ fecha: hoyISO(), hora: horaActual(), costo: '' });

const desdeRiego = (riego) => ({
  fecha: String(riego.fecha).slice(0, 10),
  hora: String(riego.hora).slice(0, 5),
  costo: riego.costo ?? '',
});

/**
 * Alta y edición de un riego.
 *
 * Vive fuera de la pantalla de Riegos porque el Resumen registra riegos con
 * este mismo formulario. Dos copias acabarían aceptando cosas distintas, y la
 * que menos se mira es la que se queda atrás.
 */
const RiegoModal = ({ abierto, onCerrar, riego = null, onGuardado }) => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);

  // Se rellena al abrir, no en cada render: así lo que el usuario está
  // escribiendo no se pisa si el padre se vuelve a pintar.
  useEffect(() => {
    if (abierto) setFormData(riego ? desdeRiego(riego) : formVacio());
    // Depende del id, no del objeto: un objeto nuevo en cada render del padre
    // reiniciaría el formulario a media escritura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, riego?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.fecha || !formData.hora) {
      showAlert('warning', 'La fecha y la hora son obligatorias');
      return;
    }

    setGuardando(true);
    const datos = { fecha: formData.fecha, hora: formData.hora };
    // Solo se manda si el usuario escribió algo; si no, manda el DEFAULT.
    if (String(formData.costo).trim() !== '') datos.costo = parseFloat(formData.costo);

    try {
      const respuesta = riego ? await updateRiego(riego.id, datos) : await createRiego(datos);
      if (fueBien(respuesta)) {
        showAlert('success', riego ? 'Riego actualizado' : 'Riego registrado');
        onCerrar();
        onGuardado?.();
      } else {
        showAlert('error', mensajeDeRespuesta(respuesta));
      }
    } catch (error) {
      showAlert('error', `No se pudo ${riego ? 'actualizar' : 'registrar'}: ` + mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={riego ? 'Editar riego' : 'Nuevo riego'}
      description={riego ? null : 'Si dejas el costo vacío se registra como $1.00.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Fecha" type="date" name="fecha" value={formData.fecha}
          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          required disabled={guardando}
        />
        <Input
          label="Hora" type="time" name="hora" value={formData.hora}
          onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
          required disabled={guardando}
        />
        <Input
          label="Costo" type="number" name="costo" step="0.01" min="0"
          placeholder="1.00"
          value={formData.costo}
          onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
          disabled={guardando}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : riego ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RiegoModal;
