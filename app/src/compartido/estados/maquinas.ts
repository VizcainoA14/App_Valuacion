/**
 * T-B-05 — Máquinas de estado de ANEXO_B §6 como DATOS, no como `switch`.
 * Una sola fuente de verdad: el dominio valida con ellas, `scripts/generar-triggers.ts`
 * emite los triggers SQL y la interfaz sabe qué acciones ofrecer.
 */
import type { EstadoRegistro } from '../enums/catalogos';
import type {
  EstadoEjercicio,
  EstadoPropuestaBaja,
  EstadoActoAdministrativo,
} from '../enums/estados';
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

/** ANEXO_B §6.1 — lineal; CERRADO es terminal e inmutable (INT-09). */
export const MAQUINA_EJERCICIO = definirMaquina<EstadoEjercicio>({
  nombre: 'Ejercicio',
  tabla: 'ejercicio',
  columna: 'estado',
  fuente: 'ANEXO_B §6.1',
  inicial: 'ABIERTO',
  transiciones: {
    ABIERTO: ['EN_LEVANTAMIENTO'],
    EN_LEVANTAMIENTO: ['EN_CONCILIACION'],
    EN_CONCILIACION: ['EN_CALCULO'],
    EN_CALCULO: ['EN_VALUACION'],
    EN_VALUACION: ['EN_APROBACION'],
    EN_APROBACION: ['CERRADO'],
    CERRADO: [],
  },
});

/** ANEXO_B §6.2 — seis estados, con la vuelta PROPUESTO_BAJA → ACTIVO de RN-09-04 (CT-06). */
export const MAQUINA_BIEN = definirMaquina<EstadoRegistro>({
  nombre: 'Bien',
  tabla: 'bien',
  columna: 'estado_registro',
  fuente: 'ANEXO_B §6.2',
  inicial: 'BORRADOR',
  transiciones: {
    BORRADOR: ['VALIDADO', 'INCOMPLETO'],
    VALIDADO: ['ACTIVO', 'INCOMPLETO'],
    ACTIVO: ['PROPUESTO_BAJA', 'INCOMPLETO'],
    INCOMPLETO: ['VALIDADO', 'ACTIVO'],
    PROPUESTO_BAJA: ['DADO_DE_BAJA', 'ACTIVO'],
    DADO_DE_BAJA: [], // terminal: RN-09-09, el bien nunca se elimina
  },
});

/** ANEXO_B §6.3 — el rechazo devuelve el bien a ACTIVO (lo hace el caso de uso, no el trigger). */
export const MAQUINA_PROPUESTA_BAJA = definirMaquina<EstadoPropuestaBaja>({
  nombre: 'Propuesta de baja',
  tabla: 'propuesta_baja',
  columna: 'estado_aprobacion',
  fuente: 'ANEXO_B §6.3',
  inicial: 'PROPUESTO',
  transiciones: {
    PROPUESTO: ['EN_REVISION'],
    EN_REVISION: ['APROBADO_COMITE', 'RECHAZADO'],
    APROBADO_COMITE: ['RESOLUCION_EMITIDA'],
    RESOLUCION_EMITIDA: ['EJECUTADO'],
    EJECUTADO: ['DISPOSICION_DOCUMENTADA'],
    DISPOSICION_DOCUMENTADA: [],
    RECHAZADO: [],
  },
});

/** ANEXO_B §6.4 — FIRMADO es inmutable (RN-10-07); solo puede pasar a PUBLICADO. */
export const MAQUINA_ACTO_ADMINISTRATIVO = definirMaquina<EstadoActoAdministrativo>({
  nombre: 'Acto administrativo',
  tabla: 'acto_administrativo',
  columna: 'estado',
  fuente: 'ANEXO_B §6.4',
  inicial: 'PROYECTADO',
  transiciones: {
    PROYECTADO: ['EN_REVISION_JURIDICA'],
    EN_REVISION_JURIDICA: ['APROBADO_COMITE'],
    APROBADO_COMITE: ['FIRMADO'],
    FIRMADO: ['PUBLICADO'],
    PUBLICADO: [],
  },
});

export const MAQUINAS_DE_ESTADO: readonly MaquinaEstado<string>[] = Object.freeze([
  MAQUINA_EJERCICIO,
  MAQUINA_BIEN,
  MAQUINA_PROPUESTA_BAJA,
  MAQUINA_ACTO_ADMINISTRATIVO,
]);

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
