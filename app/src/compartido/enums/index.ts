import type { Catalogo } from './definirCatalogo';
import { CATALOGOS_CANONICOS } from './catalogos';
import {
  ESTADO_EJERCICIO,
  ESTADO_PROPUESTA_BAJA,
  ESTADO_ACTO_ADMINISTRATIVO,
  ESTADO_APROBACION_VALUACION,
} from './estados';
import {
  METODO_CONTEO_MESES,
  METODO_DEPRECIACION,
  ENFOQUE_ADICIONES,
  BASE_COMPARACION_AVALUO,
  TIPO_DATO_PARAMETRO,
} from './parametros';
import {
  NIVEL_COMPLEJIDAD,
  TIPO_SERVICIO,
  TIPO_INSTALACION,
  ACCION_BITACORA,
  PERFIL_RESPONSABLE,
} from './plataforma';

export * from './definirCatalogo';
export * from './catalogos';
export * from './estados';
export * from './parametros';
export * from './plataforma';

/** Todos los catálogos de la aplicación; fuente de los CHECK del esquema (T-B-03). */
export const TODOS_LOS_CATALOGOS: readonly Catalogo<string>[] = Object.freeze([
  ...CATALOGOS_CANONICOS,
  ESTADO_EJERCICIO,
  ESTADO_PROPUESTA_BAJA,
  ESTADO_ACTO_ADMINISTRATIVO,
  ESTADO_APROBACION_VALUACION,
  METODO_CONTEO_MESES,
  METODO_DEPRECIACION,
  ENFOQUE_ADICIONES,
  BASE_COMPARACION_AVALUO,
  TIPO_DATO_PARAMETRO,
  NIVEL_COMPLEJIDAD,
  TIPO_SERVICIO,
  TIPO_INSTALACION,
  ACCION_BITACORA,
  PERFIL_RESPONSABLE,
]);
