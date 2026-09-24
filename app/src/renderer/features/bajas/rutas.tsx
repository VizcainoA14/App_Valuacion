import type { RouteObject } from 'react-router';
import { Bajas } from './paginas/Bajas';

/** Candidatos a baja del cálculo del proceso y registro de las bajas decididas (ADR-028, ADR-029). */
export const rutasBajas: RouteObject[] = [{ path: 'proceso/:procesoId/bajas', Component: Bajas }];
