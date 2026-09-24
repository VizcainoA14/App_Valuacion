import type { RouteObject } from 'react-router';
import { Informe } from './Informe';

/** El informe del cálculo del proceso (ADR-029: uno por proceso). */
export const rutasInforme: RouteObject[] = [{ path: 'proceso/:procesoId/informe', Component: Informe }];
