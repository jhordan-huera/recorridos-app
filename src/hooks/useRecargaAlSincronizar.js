import { useEffect, useRef } from 'react';
import { usePendientes } from '../context/PendientesContext';
import { useConexion } from '../lib/conexion';

/**
 * Vuelve a pedir los datos de una pantalla cuando cambian por fuera de ella:
 * al llegar al servidor algo que se registró sin conexión (de los `tipos`
 * indicados) o al recuperar la conexión, para cambiar la copia guardada por
 * lo actual.
 *
 * No se dispara al montar: de eso ya se ocupa la carga normal de la
 * pantalla. Compara con el valor anterior en lugar de usar una marca de
 * "primera vez", que en desarrollo (StrictMode monta dos veces) pediría todo
 * dos veces.
 */
export const useRecargaAlSincronizar = (tipos, recargar) => {
  const { envios } = usePendientes();
  const { reconexiones } = useConexion();
  const clave = [...tipos.map((t) => envios[t] ?? 0), reconexiones].join('|');
  const anterior = useRef(clave);
  const ultimaRecarga = useRef(recargar);
  ultimaRecarga.current = recargar;

  useEffect(() => {
    if (anterior.current === clave) return;
    anterior.current = clave;
    ultimaRecarga.current();
  }, [clave]);
};
