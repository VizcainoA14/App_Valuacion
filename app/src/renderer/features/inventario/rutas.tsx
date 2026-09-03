import type { RouteObject } from 'react-router';
import { Paso02 } from './paginas/Paso02';
import { ImportarInventario } from './paginas/ImportarInventario';
import { ListadoBienes } from './paginas/ListadoBienes';
import { Cobertura } from './paginas/Cobertura';

/** Rutas del paso 02: los pasos 02-11 cuelgan del ejercicio (plan 2.5 §3). */
export const rutasInventario: RouteObject[] = [
  {
    path: 'entidad/:entidadId/ejercicio/:ejercicioId/paso/02',
    Component: Paso02,
    children: [
      // La primera pantalla es importar: con la base vacía, un listado vacío no
      // le dice a nadie qué hacer a continuación.
      { index: true, Component: ImportarInventario },
      { path: 'importar', Component: ImportarInventario },
      { path: 'bienes', Component: ListadoBienes },
      { path: 'cobertura', Component: Cobertura },
    ],
  },
];
