import type { RouteObject } from 'react-router';
import { Paso05 } from './paginas/Paso05';
import { Calcular } from './paginas/Calcular';
import { Resultados } from './paginas/Resultados';

/**
 * Etapa 4 de ADR-026. Cuelga del paso 05 porque ahí empieza el cálculo
 * (obsolescencia) y la depreciación del 06 se muestra en la misma pantalla: para
 * el hospital son un solo acto, "calcular".
 */
export const rutasCalculo: RouteObject[] = [
  {
    path: 'entidad/:entidadId/ejercicio/:ejercicioId/paso/05',
    Component: Paso05,
    children: [
      { index: true, Component: Calcular },
      { path: 'calcular', Component: Calcular },
      { path: 'resultados', Component: Resultados },
    ],
  },
];
