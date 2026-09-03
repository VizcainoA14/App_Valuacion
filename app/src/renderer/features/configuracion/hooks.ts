import { useParams } from 'react-router';
import { useCanal } from '../../ipc/consultas';

/** Entidad activa según la ruta `/entidad/:entidadId/...`. */
export function useEntidadId(): string {
  const { entidadId } = useParams();
  if (entidadId === undefined) throw new Error('Ruta sin entidadId');
  return entidadId;
}

/** El ejercicio "vigente" del paso 01 es el más reciente de la entidad, si existe. */
export function useEjercicioVigente(entidadId: string) {
  const ejercicios = useCanal('ejercicio:listar', { entidadId });
  const vigente = ejercicios.data?.[0] ?? null;
  return { ...ejercicios, vigente };
}

export function useValidaciones(paso: number, entidadId: string, ejercicioId: string | null) {
  return useCanal('validaciones:evaluar', { paso, entidadId, ejercicioId });
}

export function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
