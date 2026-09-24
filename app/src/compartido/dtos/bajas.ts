/**
 * DTOs de las bajas (ADR-028).
 *
 * La aplicación **señala** candidatos con su motivo y **registra** las bajas
 * que el hospital decidió. El trámite —comité, resolución, acta, disposición
 * final— ocurre fuera de ella y no la bloquea: de él solo se anota, si se
 * quiere, la referencia del documento.
 */
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../tipos/basicos';
import type { CausalBaja, EstadoActual, Semaforo } from '../enums/catalogos';
import type { EstadoBien } from '../enums/estados';

/** Un bien que el motor señaló como candidato en un corte, con lo que hace falta para decidir. */
export interface CandidatoBajaDto {
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly claseNombre: string;
  readonly servicioCodigo: string;
  readonly estadoActual: EstadoActual;
  /** Estado de hoy: puede que ya se haya registrado su baja. */
  readonly estadoRegistro: EstadoBien;
  readonly indiceObsolescencia: number | null;
  readonly semaforo: Semaforo | null;
  readonly obsolescenciaFuncional: boolean;
  /** Por qué el motor lo señaló (ANEXO_C §2.7). Nunca "el sistema lo marcó". */
  readonly motivos: readonly string[];
  readonly causalSugerida: CausalBaja;
  readonly valorNetoLibros: Centavos | null;
  readonly saldoFinalAjustado: Centavos | null;
  readonly totalmenteDepreciado: boolean;
}

/** Una baja que el hospital decidió y registró. */
export interface BajaDto {
  readonly id: Uuid;
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly servicioCodigo: string;
  readonly fecha: FechaIso;
  readonly causal: CausalBaja;
  readonly justificacion: string;
  /** Número del acto o del acta con que el hospital la aprobó, si quiere anotarlo. */
  readonly referencia: string | null;
  readonly registradaEn: MarcaTiempo;
  readonly anuladaEn: MarcaTiempo | null;
  readonly motivoAnulacion: string | null;
}
