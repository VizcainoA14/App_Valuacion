import type { Uuid, FechaIso, Centavos, MarcaTiempo } from '../tipos/basicos';
import type { EstadoActual, CondicionTenencia } from '../enums/catalogos';
import type { EstadoBien } from '../enums/estados';

/** Fila del listado de bienes: lo mínimo que pinta `<TablaDatos>` (TR-10). */
export interface BienListadoDto {
  readonly id: Uuid;
  readonly codigoInstitucional: string;
  readonly placa: string;
  readonly descripcionFuncional: string;
  readonly claseCodigo: string;
  readonly claseNombre: string;
  readonly marca: string | null;
  readonly modelo: string | null;
  readonly serie: string | null;
  readonly sedeCodigo: string;
  readonly servicioCodigo: string;
  readonly servicioNombre: string;
  readonly cantidad: number;
  readonly estadoActual: EstadoActual;
  readonly condicionTenencia: CondicionTenencia;
  readonly responsableCustodia: string | null;
  readonly estadoRegistro: EstadoBien;
  /** Nulo mientras el bien no tenga sus datos económicos (PL-05). */
  readonly costoAdquisicion: Centavos | null;
  readonly fechaAdquisicion: FechaIso | null;
  readonly tieneHojaVida: boolean;
  /** Juicio del hospital (RN-05-03): pesa en los candidatos a baja de todo cálculo posterior. */
  readonly obsolescenciaFuncional: boolean;
}

/** Ficha completa del bien. */
export interface BienDto extends BienListadoDto {
  readonly procesoId: Uuid;
  readonly claseActivoId: Uuid;
  readonly sedeId: Uuid;
  readonly servicioId: Uuid;
  readonly sedeNombre: string;
  readonly fechaToma: FechaIso;
  readonly funcionarioConteo: string;
  readonly observaciones: string | null;
  readonly justificacionFuncional: string | null;
  readonly creadoEn: MarcaTiempo;
  readonly actualizadoEn: MarcaTiempo;
}

export interface FiltrosBien {
  /** Texto libre: código, placa, descripción, marca, modelo o serie (FTS5). */
  readonly texto?: string | undefined;
  readonly sedeId?: string | undefined;
  readonly servicioId?: string | undefined;
  readonly claseActivoId?: string | undefined;
  readonly estadoActual?: EstadoActual | undefined;
  readonly condicionTenencia?: CondicionTenencia | undefined;
  readonly estadoRegistro?: EstadoBien | undefined;
  readonly sinHojaVida?: boolean | undefined;
}

export type ColumnaOrdenBien =
  | 'codigoInstitucional'
  | 'placa'
  | 'descripcionFuncional'
  | 'claseCodigo'
  | 'servicioCodigo'
  | 'estadoActual'
  | 'estadoRegistro'
  | 'costoAdquisicion';

export interface OrdenBien {
  readonly columna: ColumnaOrdenBien;
  readonly ascendente: boolean;
}

/** Página del listado. `total` es el conteo del filtro completo, no el de la página. */
export interface Pagina<T> {
  readonly filas: readonly T[];
  readonly total: number;
  readonly pagina: number;
  readonly tamano: number;
}

/** Cuántos bienes hay en cada servicio, para saber qué se ha barrido y qué no. */
export interface CoberturaServicio {
  readonly sedeId: Uuid;
  readonly sedeCodigo: string;
  readonly sedeNombre: string;
  readonly servicioId: Uuid;
  readonly servicioCodigo: string;
  readonly servicioNombre: string;
  readonly bienes: number;
  readonly noEncontrados: number;
  /** Fecha de la toma más reciente registrada en el servicio; nula si nunca se barrió. */
  readonly ultimaToma: FechaIso | null;
}

export interface Cobertura {
  readonly servicios: readonly CoberturaServicio[];
  readonly serviciosActivos: number;
  readonly serviciosConBienes: number;
  readonly totalBienes: number;
}

/**
 * Un barrido es una importación de `PL-03`: la foto de lo que había en los
 * servicios que se recorrieron. No reemplaza el inventario; lo actualiza.
 */
export interface BarridoDto {
  readonly id: Uuid;
  readonly procesoId: Uuid;
  /** La toma más reciente que trae el archivo. */
  readonly fecha: FechaIso;
  readonly archivo: string;
  readonly bienesNuevos: number;
  readonly bienesActualizados: number;
  /** Bienes de los servicios recorridos que no aparecieron en el archivo. */
  readonly bienesNoEncontrados: number;
  readonly serviciosRecorridos: number;
  readonly creadoEn: MarcaTiempo;
}
