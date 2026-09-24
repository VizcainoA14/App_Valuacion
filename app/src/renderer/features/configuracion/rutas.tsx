import type { RouteObject } from 'react-router';
import { Configuracion } from './paginas/Configuracion';
import { AsistenteProceso } from './paginas/AsistenteProceso';
import { DatosHospital } from './paginas/DatosHospital';
import { SedesServicios } from './paginas/SedesServicios';
import { CatalogoClases } from './paginas/CatalogoClases';
import { ParametrosCalculo } from './paginas/ParametrosCalculo';

/** Configuración del proceso: `/proceso/:procesoId/configuracion/<parte>`. */
export const rutasConfiguracion: RouteObject[] = [
  { path: 'nuevo-proceso', Component: AsistenteProceso },
  {
    path: 'proceso/:procesoId/configuracion',
    Component: Configuracion,
    children: [
      { index: true, Component: DatosHospital },
      { path: 'hospital', Component: DatosHospital },
      { path: 'sedes', Component: SedesServicios },
      { path: 'clases', Component: CatalogoClases },
      { path: 'parametros', Component: ParametrosCalculo },
    ],
  },
];
