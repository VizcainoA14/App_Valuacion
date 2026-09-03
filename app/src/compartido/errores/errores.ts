/**
 * MOD-00 — Jerarquía de errores (T-B-01).
 *
 * Un `Error` de JS pierde su clase al cruzar el IPC (plan 2.3 §5), así que toda
 * clase sabe convertirse en `DtoError` serializable. Los códigos son los de
 * /Teoria (`VAL-nn-nn`, `RN-nn-nn`, `INT-nn`) o un identificador técnico en
 * MAYUSCULAS_CON_GUIONES.
 *
 * El motor de cálculo NO lanza estas excepciones para casos de negocio: devuelve
 * resultados discriminados (plan 2.6 §4). Las clases existen para la capa de
 * aplicación y la infraestructura.
 */

export const TIPOS_ERROR = [
  'VALIDACION',
  'REGLA_NEGOCIO',
  'NO_CALCULABLE',
  'INTEGRIDAD',
  'INFRAESTRUCTURA',
] as const;
export type TipoError = (typeof TIPOS_ERROR)[number];

/** Forma serializable que viaja por IPC y consume la interfaz. */
export interface DtoError {
  readonly tipo: TipoError;
  readonly codigo: string;
  readonly mensaje: string;
  readonly campo?: string;
  readonly detalle?: string;
}

export interface OpcionesError {
  /** Campo del formulario o columna afectada, si aplica. */
  readonly campo?: string;
  /** Información adicional apta para mostrar al usuario (nunca un stack). */
  readonly detalle?: string;
}

export abstract class ErrorAplicacion extends Error {
  abstract readonly tipo: TipoError;
  readonly codigo: string;
  readonly campo: string | undefined;
  readonly detalle: string | undefined;

  constructor(codigo: string, mensaje: string, opciones: OpcionesError = {}) {
    super(mensaje);
    this.name = new.target.name;
    this.codigo = codigo;
    this.campo = opciones.campo;
    this.detalle = opciones.detalle;
  }

  aDto(): DtoError {
    const dto: { -readonly [K in keyof DtoError]: DtoError[K] } = {
      tipo: this.tipo,
      codigo: this.codigo,
      mensaje: this.message,
    };
    if (this.campo !== undefined) dto.campo = this.campo;
    if (this.detalle !== undefined) dto.detalle = this.detalle;
    return dto;
  }
}

/** Entrada inválida: formulario, IPC o importación. Código `VAL-nn-nn` o técnico. */
export class ErrorValidacion extends ErrorAplicacion {
  override readonly tipo = 'VALIDACION' as const;
}

/** Una regla `RN-nn-nn` impide la operación. */
export class ErrorReglaNegocio extends ErrorAplicacion {
  override readonly tipo = 'REGLA_NEGOCIO' as const;
}

/** Faltan datos para calcular (RN-03-01, ANEXO_C §2.4/§3.4) cuando hay que abortar una operación. */
export class ErrorNoCalculable extends ErrorAplicacion {
  override readonly tipo = 'NO_CALCULABLE' as const;
}

/** La base de datos rechazó la escritura por una regla `INT-nn` (ANEXO_B §8). */
export class ErrorIntegridad extends ErrorAplicacion {
  override readonly tipo = 'INTEGRIDAD' as const;
}

/** Disco, archivo, base de datos, proceso: nada que el usuario pueda corregir en el formulario. */
export class ErrorInfraestructura extends ErrorAplicacion {
  override readonly tipo = 'INFRAESTRUCTURA' as const;
}

export function esErrorAplicacion(valor: unknown): valor is ErrorAplicacion {
  return valor instanceof ErrorAplicacion;
}

/**
 * Traduce cualquier cosa lanzada a un DTO. Lo inesperado se reporta como
 * infraestructura, sin filtrar el stack al renderer.
 */
export function aDtoError(valor: unknown): DtoError {
  if (esErrorAplicacion(valor)) return valor.aDto();
  const mensaje = valor instanceof Error ? valor.message : String(valor);
  return { tipo: 'INFRAESTRUCTURA', codigo: 'ERROR_INESPERADO', mensaje };
}
