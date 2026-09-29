import { useCallback, useMemo, useState } from 'react';
import { getAllRecorridos } from '../services/api';
import { hoyISO } from '../lib/fechas';

/**
 * Los recorridos que necesitan las fichas de estudiante y de vehículo para
 * sus cifras (viajes del mes, último viaje…).
 *
 * Se piden la primera vez que se abre una ficha, no al entrar en la
 * pantalla: quien solo mira la lista no tiene por qué esperar por ellos. Sin
 * conexión sale la copia guardada, como en el resto de la app.
 */
export const useRecorridosParaFicha = () => {
  const [recorridos, setRecorridos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const pedir = useCallback(async () => {
    if (recorridos || cargando) return;
    setCargando(true);
    try {
      setRecorridos(await getAllRecorridos());
    } catch {
      setRecorridos([]);
    } finally {
      setCargando(false);
    }
  }, [recorridos, cargando]);

  const mesActual = hoyISO().slice(0, 7);

  /** Los de un filtro, del más reciente al más antiguo, y cuántos son de este mes. */
  const resumir = useMemo(() => (filtro) => {
    const lista = (recorridos || [])
      .filter(filtro)
      .sort((a, b) => `${b.fecha}${b.hora_inicio}`.localeCompare(`${a.fecha}${a.hora_inicio}`));
    const delMes = lista.filter((r) => String(r.fecha).startsWith(mesActual));
    return { lista, delMes, listo: recorridos !== null };
  }, [recorridos, mesActual]);

  return { pedir, resumir };
};
