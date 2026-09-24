import type { RouteObject } from 'react-router';
import { Calculo } from './paginas/Calculo';

/**
 * El cálculo del proceso (ADR-029). Para el hospital obsolescencia y
 * depreciación son un solo acto, "calcular", y hay uno por proceso.
 */
export const rutasCalculo: RouteObject[] = [{ path: 'proceso/:procesoId/calculo', Component: Calculo }];
