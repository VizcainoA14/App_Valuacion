/**
 * Estados propios de la aplicación (ADR-028). Las transiciones válidas se
 * definen como datos en `estados/`; aquí solo los valores.
 *
 * `ESTADO_REGISTRO` de `ANEXO_B` §6.2 sigue declarado en `catalogos.ts` como
 * reflejo literal de `/especificacion/teoria`, pero el bien ya no lo usa: su
 * ciclo BORRADOR → VALIDADO → ACTIVO → PROPUESTO_BAJA era el de un expediente
 * por ejercicio. Con un inventario vivo que se actualiza en cada barrido, lo
 * único que importa de un bien es si está, si no apareció o si se dio de baja.
 */
import { definirCatalogo, type ValoresDe } from './definirCatalogo';

export const ESTADO_BIEN = definirCatalogo('estado_bien', 'ADR-028', {
  ACTIVO: 'Activo',
  NO_ENCONTRADO: 'No encontrado en el último barrido',
  DADO_DE_BAJA: 'Dado de baja',
});
export type EstadoBien = ValoresDe<typeof ESTADO_BIEN>;

/** ADR-029 — un proceso se trabaja hasta que alguien lo finaliza; entonces queda de solo lectura. */
export const ESTADO_PROCESO = definirCatalogo('estado_proceso', 'ADR-029', {
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
});
export type EstadoProceso = ValoresDe<typeof ESTADO_PROCESO>;
