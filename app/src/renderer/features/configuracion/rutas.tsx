import type { RouteObject } from 'react-router';
import { Paso01 } from './paginas/Paso01';
import { AsistenteEntidad } from './paginas/AsistenteEntidad';
import { DatosEntidad } from './paginas/DatosEntidad';
import { SedesServicios } from './paginas/SedesServicios';
import { CatalogoClases } from './paginas/CatalogoClases';
import { ParametrosCalculo } from './paginas/ParametrosCalculo';
import { PanelEjercicio } from './paginas/PanelEjercicio';

/** Rutas del paso 01 (plan 2.5 §3): `/entidad/:entidadId/paso/01/<subpaso>`. */
export const rutasConfiguracion: RouteObject[] = [
  { path: 'nueva-entidad', Component: AsistenteEntidad },
  {
    path: 'entidad/:entidadId/paso/01',
    Component: Paso01,
    children: [
      { index: true, Component: DatosEntidad },
      { path: 'entidad', Component: DatosEntidad },
      { path: 'sedes', Component: SedesServicios },
      { path: 'clases', Component: CatalogoClases },
      { path: 'parametros', Component: ParametrosCalculo },
      { path: 'ejercicio', Component: PanelEjercicio },
    ],
  },
];
