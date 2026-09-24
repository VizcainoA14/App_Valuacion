import { useParams } from 'react-router';
import { useCanal } from '../../ipc/consultas';

/** El proceso de la ruta `/proceso/:procesoId/...`. */
export function useProcesoId(): string {
  const { procesoId } = useParams();
  if (procesoId === undefined) throw new Error('Ruta sin procesoId');
  return procesoId;
}

/**
 * ADR-029 — un proceso finalizado es de solo lectura. La base ya lo impide;
 * la interfaz lo dice antes, para no ofrecer botones que van a fallar.
 */
export function useSoloLectura(procesoId: string): boolean {
  const proceso = useCanal('proceso:porId', { id: procesoId });
  return proceso.data?.estado === 'FINALIZADO';
}

/** Qué le falta a la configuración del proceso para que el cálculo tenga sentido. */
export function useValidaciones(procesoId: string) {
  return useCanal('validaciones:evaluar', { procesoId });
}

export function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
