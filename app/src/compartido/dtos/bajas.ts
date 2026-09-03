/** DTOs del paso 09 (ANEXO_B §4.6; paso 09 §10.1). */
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../tipos/basicos';
import type { CausalBaja, DestinoFinal, EstadoActual, Semaforo } from '../enums/catalogos';
import type { EstadoPropuestaBaja } from '../enums/estados';

/** Un bien que el motor señaló como candidato, con lo que hace falta para decidir. */
export interface CandidatoBajaDto {
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly claseNombre: string;
  readonly servicioCodigo: string;
  readonly estadoActual: EstadoActual;
  readonly estadoRegistro: string;
  readonly indiceObsolescencia: number | null;
  readonly semaforo: Semaforo | null;
  readonly obsolescenciaFuncional: boolean;
  /** Por qué el motor lo señaló (ANEXO_C §2.7). Nunca "el sistema lo marcó". */
  readonly motivos: readonly string[];
  readonly causalSugerida: CausalBaja;
  readonly valorNetoLibros: Centavos | null;
  readonly saldoFinalAjustado: Centavos | null;
  readonly totalmenteDepreciado: boolean;
  /** Ya tiene propuesta abierta: no se propone dos veces el mismo bien. */
  readonly propuestaId: Uuid | null;
  readonly estadoPropuesta: EstadoPropuestaBaja | null;
}

export interface EfectoContableDto {
  readonly valorBruto: Centavos;
  readonly depreciacionAsociada: Centavos;
  readonly deterioroAsociado: Centavos;
  readonly valorNeto: Centavos;
  readonly valorRecuperado: Centavos;
  readonly perdidaReconocida: Centavos;
}

export interface PropuestaBajaDto {
  readonly id: Uuid;
  readonly ejercicioId: Uuid;
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly servicioCodigo: string;
  readonly causal: CausalBaja;
  readonly justificacionTecnica: string;
  readonly costoReparacionEstimado: Centavos | null;
  readonly valorReposicion: Centavos | null;
  /** Fracción con 4 decimales; nula si no hay cotización (RN-09-03). */
  readonly relacionReparacionReposicion: number | null;
  readonly procedeBajaPorEconomia: boolean | null;
  readonly recomendacionEconomica: string | null;
  readonly valorSalvamento: Centavos | null;
  readonly destinoFinalPropuesto: DestinoFinal | null;
  readonly especialistaId: Uuid;
  readonly especialistaNombre: string;
  readonly fechaPropuesta: FechaIso;
  readonly estadoAprobacion: EstadoPropuestaBaja;
  readonly observacionComite: string | null;
  readonly efectoContable: EfectoContableDto;
  readonly creadoEn: MarcaTiempo;
  readonly actualizadoEn: MarcaTiempo;
}

export interface ResumenBajasDto {
  readonly ejercicioId: Uuid;
  readonly candidatosSinProponer: number;
  readonly porEstado: Readonly<Record<EstadoPropuestaBaja, number>>;
  readonly totalPropuestas: number;
  /** Agregados sobre las propuestas que siguen vivas (no rechazadas). */
  readonly valorBrutoTotal: Centavos;
  readonly depreciacionTotal: Centavos;
  readonly valorNetoTotal: Centavos;
  readonly perdidaTotal: Centavos;
  readonly valorRecuperadoTotal: Centavos;
}
