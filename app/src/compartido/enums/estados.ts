/**
 * Estados de las máquinas de `ANEXO_B` §6 (salvo `estado_registro`, que es
 * catálogo canónico y vive en catalogos.ts). Las transiciones válidas se
 * definen como datos en `estados/` (T-B-05); aquí solo los valores.
 */
import { definirCatalogo, type ValoresDe } from './definirCatalogo';

export const ESTADO_EJERCICIO = definirCatalogo('estado_ejercicio', 'ANEXO_B §6.1', {
  ABIERTO: 'Abierto',
  EN_LEVANTAMIENTO: 'En levantamiento',
  EN_CONCILIACION: 'En conciliación',
  EN_CALCULO: 'En cálculo',
  EN_VALUACION: 'En valuación',
  EN_APROBACION: 'En aprobación',
  CERRADO: 'Cerrado',
});
export type EstadoEjercicio = ValoresDe<typeof ESTADO_EJERCICIO>;

export const ESTADO_PROPUESTA_BAJA = definirCatalogo('estado_propuesta_baja', 'ANEXO_B §6.3', {
  PROPUESTO: 'Propuesto',
  EN_REVISION: 'En revisión',
  APROBADO_COMITE: 'Aprobado por el Comité',
  RESOLUCION_EMITIDA: 'Resolución emitida',
  EJECUTADO: 'Ejecutado',
  DISPOSICION_DOCUMENTADA: 'Disposición documentada',
  RECHAZADO: 'Rechazado',
});
export type EstadoPropuestaBaja = ValoresDe<typeof ESTADO_PROPUESTA_BAJA>;

export const ESTADO_ACTO_ADMINISTRATIVO = definirCatalogo(
  'estado_acto_administrativo',
  'ANEXO_B §6.4',
  {
    PROYECTADO: 'Proyectado',
    EN_REVISION_JURIDICA: 'En revisión jurídica',
    APROBADO_COMITE: 'Aprobado por el Comité',
    FIRMADO: 'Firmado',
    PUBLICADO: 'Publicado',
  },
);
export type EstadoActoAdministrativo = ValoresDe<typeof ESTADO_ACTO_ADMINISTRATIVO>;

/**
 * `ValuacionMueble.estado_aprobacion` figura como enum en ANEXO_B §4.4 pero
 * /Teoria no enumera sus valores. Provisional según CT-16 (plan 1.4), a
 * confirmar por el propietario antes del hito E.
 */
export const ESTADO_APROBACION_VALUACION = definirCatalogo(
  'estado_aprobacion_valuacion',
  'ANEXO_B §4.4 · CT-16 (provisional)',
  {
    PENDIENTE: 'Pendiente',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
  },
);
export type EstadoAprobacionValuacion = ValoresDe<typeof ESTADO_APROBACION_VALUACION>;
