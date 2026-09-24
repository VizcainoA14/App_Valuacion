/**
 * Router en MEMORIA (plan 2.5 §3): no hay servidor y `file://` con historial
 * produce pantallas en blanco al recargar.
 *
 * ADR-029: lo principal es el proceso. La pantalla inicial es la lista de
 * procesos; todo lo demás cuelga de uno, y ninguno ve lo de otro.
 *
 *   /                                        procesos: iniciar uno o continuar
 *   /nuevo-proceso                           iniciar un proceso
 *   /formatos                                plantillas en blanco
 *   /proceso/:procesoId                      resumen del proceso: en qué va
 *   /proceso/:procesoId/configuracion/...    hospital, sedes, clases, parámetros
 *   /proceso/:procesoId/formatos             plantillas con los catálogos del proceso
 *   /proceso/:procesoId/inventario/...       barridos, bienes y datos económicos
 *   /proceso/:procesoId/calculo              el cálculo a la fecha de corte
 *   /proceso/:procesoId/bajas                candidatos y bajas registradas
 *   /proceso/:procesoId/informe              el informe del cálculo
 */
import { createMemoryRouter } from 'react-router';
import { Layout } from './Layout';
import { rutasConfiguracion } from '../features/configuracion/rutas';
import { rutasInventario } from '../features/inventario/rutas';
import { rutasCalculo } from '../features/calculo/rutas';
import { rutasBajas } from '../features/bajas/rutas';
import { rutasInforme } from '../features/informe/rutas';
import { SelectorProceso } from '../features/configuracion/paginas/SelectorProceso';
import { ResumenProceso } from '../features/configuracion/paginas/ResumenProceso';
import { Plantillas } from '../features/plantillas/Plantillas';

export const router = createMemoryRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: SelectorProceso },
      // Los formatos en blanco no dependen de ningún proceso: se pueden obtener
      // antes de iniciar uno. Dentro de un proceso salen con sus catálogos.
      { path: 'formatos', Component: Plantillas },
      { path: 'proceso/:procesoId', Component: ResumenProceso },
      { path: 'proceso/:procesoId/formatos', Component: Plantillas },
      ...rutasConfiguracion,
      ...rutasInventario,
      ...rutasCalculo,
      ...rutasBajas,
      ...rutasInforme,
    ],
  },
]);
