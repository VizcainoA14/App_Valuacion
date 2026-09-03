/**
 * Router en MEMORIA (plan 2.5 §3): no hay servidor y `file://` con historial
 * produce pantallas en blanco al recargar.
 *
 *   /                                   selector de entidad
 *   /entidad/:entidadId/paso/01/...     paso 01 (nivel entidad; el ejercicio nace aquí)
 *   /ejercicio/:ejercicioId/paso/NN     pasos 02-11 (hitos C-F)
 */
import { createMemoryRouter } from 'react-router';
import { Layout } from './Layout';
import { rutasConfiguracion } from '../features/configuracion/rutas';
import { rutasInventario } from '../features/inventario/rutas';
import { rutasCalculo } from '../features/calculo/rutas';
import { rutasBajas } from '../features/bajas/rutas';
import { rutasInforme } from '../features/informe/rutas';
import { SelectorEntidad } from '../features/configuracion/paginas/SelectorEntidad';
import { Plantillas } from '../features/plantillas/Plantillas';

export const router = createMemoryRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: SelectorEntidad },
      // Etapa 2 del núcleo: no depende de que haya entidad, para poder obtener los
      // formatos antes de configurar nada (ADR-026).
      { path: 'formatos', Component: Plantillas },
      ...rutasConfiguracion,
      ...rutasInventario,
      ...rutasCalculo,
      ...rutasBajas,
      ...rutasInforme,
    ],
  },
]);
