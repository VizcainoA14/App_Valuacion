import type { RouteObject } from 'react-router';
import { Informe } from './Informe';

/** Etapa 6 de ADR-026: la entrega. Cuelga del paso 11 (entrega final y cierre). */
export const rutasInforme: RouteObject[] = [
  { path: 'entidad/:entidadId/ejercicio/:ejercicioId/paso/11', Component: Informe },
];
