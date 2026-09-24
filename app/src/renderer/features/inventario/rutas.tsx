import type { RouteObject } from 'react-router';
import { Inventario } from './paginas/Inventario';
import { ImportarInventario } from './paginas/ImportarInventario';
import { ListadoBienes } from './paginas/ListadoBienes';
import { Barridos } from './paginas/Barridos';

/** El inventario del proceso: `/proceso/:procesoId/inventario/<pantalla>`. Cada proceso lo importa de cero (ADR-029). */
export const rutasInventario: RouteObject[] = [
  {
    path: 'proceso/:procesoId/inventario',
    Component: Inventario,
    children: [
      // La primera pantalla es importar: con la base vacía, un listado vacío no
      // le dice a nadie qué hacer a continuación.
      { index: true, Component: ImportarInventario },
      { path: 'importar', Component: ImportarInventario },
      { path: 'bienes', Component: ListadoBienes },
      { path: 'barridos', Component: Barridos },
    ],
  },
];
