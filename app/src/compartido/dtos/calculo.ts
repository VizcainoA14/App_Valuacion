/** DTOs del cálculo (ANEXO_B §4.2 y §4.3), organizados por corte (ADR-028). */
import type { Centavos, FechaIso, MarcaTiempo, Uuid } from '../tipos/basicos';
import type { Semaforo } from '../enums/catalogos';
import type { MetodoConteoMeses } from '../enums/parametros';
import type { MotivoNoCalculado } from '../motor/resultado';
import type { ParametrosCalculo } from '../parametros/parametrosCalculo';

/**
 * El cálculo de un proceso a su fecha de corte: la depreciación y la
 * obsolescencia de todo su inventario, con los parámetros que regían al
 * calcular. Uno por proceso; recalcular lo reemplaza (ADR-029).
 */
export interface CorteDto {
  readonly id: Uuid;
  readonly procesoId: Uuid;
  readonly fechaCorte: FechaIso;
  readonly parametros: ParametrosCalculo;
  readonly calculadoEn: MarcaTiempo;
  readonly bienesConsiderados: number;
  readonly conDepreciacion: number;
  readonly exclusiones: number;
  readonly totalValorNetoLibros: Centavos;
}

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

  /** Nulos cuando la obsolescencia no se pudo calcular; las exclusiones dicen por qué. */
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

/**
 * Por qué un bien quedó fuera de una parte del cálculo. Nunca se colapsa en un
 * cero. `GENERAL` = el bien no entra al corte en absoluto (p. ej. se adquirió
 * después de la fecha de corte).
 */
export type AmbitoExclusion = 'GENERAL' | 'OBSOLESCENCIA' | 'DEPRECIACION';

export interface ExclusionCalculoDto {
  readonly bienId: Uuid;
  readonly codigoInstitucional: string;
  readonly ambito: AmbitoExclusion;
  readonly estado: MotivoNoCalculado;
  readonly motivo: string;
}

export interface ResumenCalculoDto {
  readonly corteId: Uuid;
  readonly fechaCorte: FechaIso;
  readonly calculadoEn: MarcaTiempo;
  readonly metodoConteoAplicado: MetodoConteoMeses;
  /** Bienes que entraron al corte (no dados de baja). */
  readonly bienesConsiderados: number;
  readonly conObsolescencia: number;
  readonly sinObsolescencia: number;
  readonly conDepreciacion: number;
  /** A los que la depreciación no les corresponde: no propios (RN-02-04) o clase no depreciable. */
  readonly noAplicaDepreciacion: number;
  /** A los que SÍ les corresponde pero no se pudo calcular: falta costo, fecha o vida útil contable. */
  readonly sinDepreciacion: number;
  readonly candidatosBaja: number;
  readonly porSemaforo: Readonly<Record<Semaforo, number>>;
  readonly totalSaldoAjustado: Centavos;
  readonly totalDepreciacionAcumulada: Centavos;
  readonly totalDeterioro: Centavos;
  readonly totalValorNetoLibros: Centavos;
  /** El inventario cambió después de calcular: conviene recalcular antes de finalizar. */
  readonly inventarioCambio: boolean;
}

export interface ResultadoEjecucionCalculoDto {
  readonly corte: CorteDto;
  readonly resumen: ResumenCalculoDto;
  readonly exclusiones: readonly ExclusionCalculoDto[];
  readonly milisegundos: number;
}
