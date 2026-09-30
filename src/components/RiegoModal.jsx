import { useEffect, useRef, useState } from 'react';
import { useAlert } from '../context/AlertContext';
import { usePendientes } from '../context/PendientesContext';
import {
  updateRiego, mensajeDeError, fueBien, mensajeDeRespuesta, esFalloDeRed,
} from '../services/api';
import { Droplets, BadgeCheck, PencilLine, DollarSign } from 'lucide-react';
import { hoyISO, horaActual } from '../lib/fechas';
import { nuevoId, COSTO_RIEGO_POR_DEFECTO } from '../lib/pendientes';
import Modal from './ui/Modal';
import { useEnvioUnico } from '../hooks/useEnvioUnico';
import {
  Seccion, OpcionesGrandes, FechaYHora, CajaCampo, PieDeFormulario,
} from './formulario/Formulario';

const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/* Fecha y hora arrancan en el momento de abrir el formulario: lo normal es
   registrar el riego justo después de hacerlo. Son funciones, no constantes,
   porque una constante congelaría la hora en que se cargó la página.

   Precio "normal": en un alta NO se envía costo y lo pone la base de datos
   (1.00). Al editar sí se envía, porque quien vuelve a "normal" desde otro
   precio quiere volver a 1.00, no dejar el que había. */
const formVacio = () => ({ fecha: hoyISO(), hora: horaActual(), precio: 'normal', costo: '' });

const desdeRiego = (riego) => {
  const costo = Number(riego.costo);
  const normal = !Number.isFinite(costo) || costo === COSTO_RIEGO_POR_DEFECTO;
  return {
    fecha: String(riego.fecha).slice(0, 10),
    hora: String(riego.hora).slice(0, 5),
    precio: normal ? 'normal' : 'otro',
    costo: normal ? '' : String(riego.costo),
  };
};

const PRECIOS = [
  { valor: 'normal', titulo: 'Normal', detalle: dinero.format(COSTO_RIEGO_POR_DEFECTO), icono: BadgeCheck, tono: 'info' },
  { valor: 'otro', titulo: 'Otro precio', detalle: 'Lo escribes tú', icono: PencilLine, tono: 'info' },
];

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
  // El id del riego nuevo se fija al abrir el formulario: un segundo envío
  // del mismo formulario lleva el mismo id y el servidor no lo duplica.
  const idAlta = useRef(null);

  // Se rellena al abrir, no en cada render: así lo que el usuario está
  // escribiendo no se pisa si el padre se vuelve a pintar.
  useEffect(() => {
    if (abierto) {
      setFormData(riego ? desdeRiego(riego) : formVacio());
      idAlta.current = nuevoId();
    }
    // Depende del id, no del objeto: un objeto nuevo en cada render del padre
    // reiniciaría el formulario a media escritura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, riego?.id]);

  const handleSubmit = useEnvioUnico(async (event) => {
    event.preventDefault();
    if (!formData.fecha || !formData.hora) {
      showAlert('warning', 'La fecha y la hora son obligatorias');
      return;
    }
    const otro = formData.precio === 'otro';
    const costo = parseFloat(formData.costo);
    if (otro && (!Number.isFinite(costo) || costo < 0)) {
      showAlert('warning', 'Escribe el precio del riego');
      return;
    }

    setGuardando(true);
    const datos = { fecha: formData.fecha, hora: formData.hora };
    if (otro) datos.costo = costo;
    else if (riego) datos.costo = COSTO_RIEGO_POR_DEFECTO;

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

      const { respuesta, guardadoSinConexion } = await registrar({ tipo: 'riego', datos, id: idAlta.current });
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
  });

  const cambiar = (campo, valor) => setFormData((antes) => ({ ...antes, [campo]: valor }));
  const costoVisible = formData.precio === 'otro'
    ? (Number.isFinite(parseFloat(formData.costo)) ? dinero.format(parseFloat(formData.costo)) : '—')
    : dinero.format(COSTO_RIEGO_POR_DEFECTO);

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={riego ? 'Editar riego' : 'Nuevo riego'}
      description={riego ? 'Cambia lo que necesites y guarda.' : 'Cuándo se regó y cuánto costó.'}
      icono={Droplets}
      tono="info"
      footer={(
        <PieDeFormulario
          resumen={<>Costo <span className="tabular font-semibold text-label">{costoVisible}</span></>}
          onCancelar={onCerrar}
          form="form-riego"
          textoEnviar={riego ? 'Guardar cambios' : 'Registrar riego'}
          cargando={guardando}
        />
      )}
    >
      <form id="form-riego" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FechaYHora
          fecha={formData.fecha}
          hora={formData.hora}
          onFecha={(v) => cambiar('fecha', v)}
          onHora={(v) => cambiar('hora', v)}
          deshabilitado={guardando}
        />

        <Seccion icono={DollarSign} titulo="Precio">
          <OpcionesGrandes
            etiqueta="Precio del riego"
            opciones={PRECIOS}
            valor={formData.precio}
            onCambiar={(v) => cambiar('precio', v)}
            deshabilitado={guardando}
          />
          {formData.precio === 'otro' && (
            <CajaCampo icono={DollarSign} etiqueta="Precio de este riego" prefijo="$" className="mt-2">
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                placeholder="0.00" autoFocus
                value={formData.costo}
                disabled={guardando}
                onChange={(e) => cambiar('costo', e.target.value)}
              />
            </CajaCampo>
          )}
        </Seccion>
      </form>
    </Modal>
  );
};

export default RiegoModal;
