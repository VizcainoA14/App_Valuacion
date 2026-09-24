/**
 * Máquinas de estado como DATOS, no como `switch`.
 * Una sola fuente de verdad: el dominio valida con ellas, `scripts/generar-triggers.ts`
 * emite los triggers SQL y la interfaz sabe qué acciones ofrecer.
 */
import type { EstadoBien, EstadoProceso } from '../enums/estados';
import { ErrorReglaNegocio } from '../errores';

export interface MaquinaEstado<E extends string> {
  /** Nombre legible para mensajes. */
  readonly nombre: string;
  /** Tabla y columna físicas: el generador de triggers las usa tal cual. */
  readonly tabla: string;
  readonly columna: string;
  readonly fuente: string;
  readonly inicial: E;
  readonly transiciones: Readonly<Record<E, readonly E[]>>;
}

/** Congela en profundidad conservando el tipado literal de las transiciones. */
function definirMaquina<E extends string>(maquina: MaquinaEstado<E>): MaquinaEstado<E> {
  for (const destinos of Object.values<readonly E[]>(maquina.transiciones)) Object.freeze(destinos);
  Object.freeze(maquina.transiciones);
  return Object.freeze(maquina);
}

/**
 * ADR-028 — el bien de un inventario vivo.
 *
 * - Un barrido que no lo encuentra en un servicio que sí recorrió lo pasa a
 *   NO_ENCONTRADO; el siguiente barrido que lo encuentre lo devuelve a ACTIVO.
 * - La baja la decide el hospital fuera de la aplicación; aquí solo se registra.
 * - Una baja registrada por error se anula y el bien vuelve a ACTIVO. El bien
 *   nunca se elimina: cambia de estado y conserva su historia.
 */
export const MAQUINA_BIEN = definirMaquina<EstadoBien>({
  nombre: 'Bien',
  tabla: 'bien',
  columna: 'estado_registro',
  fuente: 'ADR-028',
  inicial: 'ACTIVO',
  transiciones: {
    ACTIVO: ['NO_ENCONTRADO', 'DADO_DE_BAJA'],
    NO_ENCONTRADO: ['ACTIVO', 'DADO_DE_BAJA'],
    DADO_DE_BAJA: ['ACTIVO'],
  },
});

/** ADR-029 — el proceso se trabaja y, cuando alguien lo decide, se finaliza. No se reabre. */
export const MAQUINA_PROCESO = definirMaquina<EstadoProceso>({
  nombre: 'Proceso',
  tabla: 'proceso',
  columna: 'estado',
  fuente: 'ADR-029',
  inicial: 'EN_CURSO',
  transiciones: {
    EN_CURSO: ['FINALIZADO'],
    FINALIZADO: [],
  },
});

export const MAQUINAS_DE_ESTADO: readonly MaquinaEstado<string>[] = Object.freeze([MAQUINA_BIEN, MAQUINA_PROCESO]);

export function estadosDe<E extends string>(maquina: MaquinaEstado<E>): readonly E[] {
  return Object.keys(maquina.transiciones) as E[];
}

export function esTerminal<E extends string>(maquina: MaquinaEstado<E>, estado: E): boolean {
  return maquina.transiciones[estado].length === 0;
}

export function transicionesDesde<E extends string>(maquina: MaquinaEstado<E>, estado: E): readonly E[] {
  return maquina.transiciones[estado];
}

export function puedeTransitar<E extends string>(maquina: MaquinaEstado<E>, desde: E, hacia: E): boolean {
  return maquina.transiciones[desde].includes(hacia);
}

/** Lanza `ErrorReglaNegocio` si la transición no está declarada. */
export function validarTransicion<E extends string>(maquina: MaquinaEstado<E>, desde: E, hacia: E): void {
  if (!puedeTransitar(maquina, desde, hacia)) {
    throw new ErrorReglaNegocio(
      'TRANSICION_NO_PERMITIDA',
      `${maquina.nombre}: no se puede pasar de ${desde} a ${hacia}.`,
      { campo: maquina.columna, detalle: `Permitidas desde ${desde}: ${maquina.transiciones[desde].join(', ') || 'ninguna (estado terminal)'}` },
    );
  }
}
