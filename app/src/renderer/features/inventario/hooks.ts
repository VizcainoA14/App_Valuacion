import { useParams } from 'react-router';

/** Contexto de las pantallas que cuelgan de un proceso: `/proceso/:procesoId/...`. */
export function useProcesoRuta(): string {
  const { procesoId } = useParams();
  if (procesoId === undefined) throw new Error('Ruta sin procesoId');
  return procesoId;
}
