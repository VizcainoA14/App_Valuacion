/** DTOs de los pasos 05 y 06 (ANEXO_B §4.2 y §4.3). */
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../tipos/basicos';
import type { Semaforo } from '../enums/catalogos';
import type { MetodoConteoMeses } from '../enums/parametros';
import type { MotivoNoCalculado } from '../motor/resultado';

/** Una fila del listado del cálculo: el bien con su obsolescencia y su depreciación. */
export interface FilaCalculoDto {
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly servicioCodigo: string;
  readonly estadoActual: string;
  readonly fechaAdquisicion: FechaIso | null;
  readonly costoAdquisicion: Centavos | null;

  /** Nulos cuando la obsolescencia no se pudo calcular; `motivoObsolescencia` dice por qué. */
  readonly indiceObsolescencia: number | null;
  readonly edadActualAnios: number | null;
  readonly aniosRestantes: number | null;
  readonly fechaFinVidaUtil: FechaIso | null;
  readonly semaforo: Semaforo | null;
  readonly obsolescenciaFuncional: boolean;
  readonly candidatoBaja: boolean;

  readonly saldoFinalAjustado: Centavos | null;
  readonly depreciacionAcumulada: Centavos | null;
  readonly saldoPorDepreciar: Centavos | null;
  readonly valorNetoLibros: Centavos | null;
  readonly mesesTranscurridos: number | null;
  readonly totalmenteDepreciado: boolean;
}

/** Por qué un bien quedó fuera del cálculo. Nunca se colapsa en un cero. */
export interface ExclusionCalculoDto {
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly ambito: 'OBSOLESCENCIA' | 'DEPRECIACION';
  readonly estado: MotivoNoCalculado;
  readonly motivo: string;
}

export interface ResumenCalculoDto {
  readonly ejercicioId: Uuid;
  readonly fechaCorte: FechaIso;
  readonly calculadoEn: MarcaTiempo | null;
  readonly metodoConteoAplicado: MetodoConteoMeses | null;
  /** Bienes vivos del ejercicio (excluye los dados de baja). */
  readonly bienesConsiderados: number;
  readonly conObsolescencia: number;
  /** Vivos sin obsolescencia: les falta fecha de adquisición o vida útil técnica. */
  readonly sinObsolescencia: number;
  readonly conDepreciacion: number;
  /** Vivos a los que la depreciación no les corresponde: no propios (RN-02-04) o clase no depreciable. */
  readonly noAplicaDepreciacion: number;
  /** Vivos a los que SÍ les corresponde pero no se pudo calcular: falta costo, fecha o vida útil contable. */
  readonly sinDepreciacion: number;
  readonly candidatosBaja: number;
  readonly porSemaforo: Readonly<Record<Semaforo, number>>;
  readonly totalSaldoAjustado: Centavos;
  readonly totalDepreciacionAcumulada: Centavos;
  readonly totalDeterioro: Centavos;
  readonly totalValorNetoLibros: Centavos;
  /** El cálculo quedó desfasado: cambió una entrada o un parámetro (plan 2.6 §9). */
  readonly desactualizado: boolean;
}

export interface ResultadoEjecucionCalculoDto {
  readonly resumen: ResumenCalculoDto;
  readonly exclusiones: readonly ExclusionCalculoDto[];
  readonly milisegundos: number;
}
