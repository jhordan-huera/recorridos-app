import { useEffect, useState } from 'react';
import { useAlert } from '../context/AlertContext';
import { usePendientes } from '../context/PendientesContext';
import {
  updateRiego, mensajeDeError, fueBien, mensajeDeRespuesta, esFalloDeRed,
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
 *
 * Sin conexión, un riego nuevo se guarda en el teléfono y se envía después;
 * uno que aún no se ha enviado (`riego._pendiente`) se corrige ahí mismo. Lo
 * que no se puede sin conexión es cambiar un riego que ya está en el servidor.
 */
const RiegoModal = ({ abierto, onCerrar, riego = null, onGuardado }) => {
  const { showAlert } = useAlert();
  const { registrar, editar } = usePendientes();
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

    const listo = (tipo, mensaje) => {
      showAlert(tipo, mensaje, tipo === 'success' ? 4000 : 6000);
      onCerrar();
      onGuardado?.();
    };

    try {
      if (riego?._pendiente) {
        await editar(riego.id, { datos });
        listo('success', 'Cambios guardados. El riego se enviará cuando haya conexión.');
        return;
      }

      if (riego) {
        const respuesta = await updateRiego(riego.id, datos);
        if (fueBien(respuesta)) listo('success', 'Riego actualizado');
        else showAlert('error', mensajeDeRespuesta(respuesta));
        return;
      }

      const { respuesta, guardadoSinConexion } = await registrar({ tipo: 'riego', datos });
      if (guardadoSinConexion) {
        listo('info', 'Sin conexión: el riego se guardó en este teléfono y se enviará solo cuando vuelva la conexión.');
      } else if (fueBien(respuesta)) {
        listo('success', 'Riego registrado');
      } else {
        showAlert('error', mensajeDeRespuesta(respuesta));
      }
    } catch (error) {
      if (riego && !riego._pendiente && esFalloDeRed(error)) {
        showAlert('error', 'Sin conexión: para cambiar un riego que ya está en el servidor hace falta internet. Los riegos nuevos sí se pueden registrar sin conexión.', 7000);
      } else {
        showAlert('error', `No se pudo ${riego ? 'actualizar' : 'registrar'}: ` + mensajeDeError(error));
      }
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
