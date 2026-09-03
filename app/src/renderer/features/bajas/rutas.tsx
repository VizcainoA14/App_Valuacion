import type { RouteObject } from 'react-router';
import { Paso09 } from './paginas/Paso09';
import { Candidatos } from './paginas/Candidatos';
import { Propuestas } from './paginas/Propuestas';

/** Etapa 5 de ADR-026: revisar candidatos a baja y decidir. */
export const rutasBajas: RouteObject[] = [
  {
    path: 'entidad/:entidadId/ejercicio/:ejercicioId/paso/09',
    Component: Paso09,
    children: [
      { index: true, Component: Candidatos },
      { path: 'candidatos', Component: Candidatos },
      { path: 'propuestas', Component: Propuestas },
    ],
  },
];
