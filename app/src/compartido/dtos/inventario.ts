import type { Uuid, FechaIso, Centavos, MarcaTiempo } from '../tipos/basicos';
import type { EstadoActual, CondicionTenencia, EstadoRegistro } from '../enums/catalogos';

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
  readonly estadoRegistro: EstadoRegistro;
  /** Nulo mientras el bien no tenga hoja de vida (paso 03). */
  readonly costoAdquisicion: Centavos | null;
  readonly fechaAdquisicion: FechaIso | null;
  readonly tieneHojaVida: boolean;
  readonly numeroFotos: number;
}

/** Ficha completa del bien (pantalla 3 del paso 02). */
export interface BienDto extends BienListadoDto {
  readonly ejercicioId: Uuid;
  readonly claseActivoId: Uuid;
  readonly sedeId: Uuid;
  readonly servicioId: Uuid;
  readonly sedeNombre: string;
  readonly fechaToma: FechaIso;
  readonly funcionarioConteo: string;
  readonly observaciones: string | null;
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
  readonly estadoRegistro?: EstadoRegistro | undefined;
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

/** Resumen para el tablero de cobertura por sede y servicio (RF-02-08, VAL-02-05). */
export interface CoberturaServicio {
  readonly sedeId: Uuid;
  readonly sedeCodigo: string;
  readonly sedeNombre: string;
  readonly servicioId: Uuid;
  readonly servicioCodigo: string;
  readonly servicioNombre: string;
  readonly bienes: number;
  readonly conActa: boolean;
  readonly recorrido: boolean;
}

export interface Cobertura {
  readonly servicios: readonly CoberturaServicio[];
  readonly serviciosActivos: number;
  readonly serviciosRecorridos: number;
  readonly totalBienes: number;
}
