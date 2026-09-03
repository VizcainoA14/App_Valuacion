import { useParams } from 'react-router';
import { useCanal } from '../../ipc/consultas';

/** Contexto de las pantallas del paso 02: `/entidad/:entidadId/ejercicio/:ejercicioId/paso/02/...`. */
export function useContextoEjercicio(): { entidadId: string; ejercicioId: string } {
  const { entidadId, ejercicioId } = useParams();
  if (entidadId === undefined || ejercicioId === undefined) throw new Error('Ruta sin entidadId o ejercicioId');
  return { entidadId, ejercicioId };
}

export function useCobertura(entidadId: string, ejercicioId: string) {
  return useCanal('bien:cobertura', { entidadId, ejercicioId });
}
