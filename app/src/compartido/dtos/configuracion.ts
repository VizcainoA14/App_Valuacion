import type { Uuid, FechaIso, MarcaTiempo } from '../tipos/basicos';
import type { EstadoProceso } from '../enums/estados';
import type { NivelComplejidad, TipoServicio } from '../enums/plataforma';

/** ADR-029 — el proceso de valuación: independiente, con sus propios datos del hospital. */
export interface ProcesoDto {
  readonly id: Uuid;
  readonly nombre: string;
  readonly fechaCorte: FechaIso;
  readonly estado: EstadoProceso;
  readonly finalizadoEn: MarcaTiempo | null;
  readonly razonSocial: string;
  readonly nit: string;
  readonly municipio: string;
  readonly departamento: string;
  readonly nivelComplejidad: NivelComplejidad;
  readonly nombreGerente: string;
  readonly actoNombramientoGerente: string | null;
  readonly direccion: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly logoUrl: string | null;
  readonly esDemostracion: boolean;
  readonly creadoEn: MarcaTiempo;
  readonly actualizadoEn: MarcaTiempo;
}

export interface SedeDto {
  readonly id: Uuid;
  readonly procesoId: Uuid;
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion: string;
  readonly municipio: string;
  readonly activa: boolean;
}

export interface ServicioDto {
  readonly id: Uuid;
  readonly sedeId: Uuid;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: TipoServicio;
  readonly responsable: string | null;
  readonly activo: boolean;
}

export interface ClaseActivoDto {
  readonly id: Uuid;
  readonly procesoId: Uuid;
  readonly codigo: string;
  readonly nombre: string;
  readonly subcuentaContable: string;
  readonly vidaUtilContableMeses: number | null;
  /** Años con 4 decimales (x10k en la base). */
  readonly vidaUtilTecnicaAnios: number | null;
  readonly esDepreciable: boolean;
  readonly requiereHojaVida: boolean;
  readonly requiereInvima: boolean;
  readonly responsableTecnico: string;
  readonly activo: boolean;
}

/** RN-01-02: segmentos ordenados del código institucional. */
export type SegmentoCodigo =
  | { readonly tipo: 'PREFIJO_ENTIDAD'; readonly valor: string }
  | { readonly tipo: 'CODIGO_SEDE' }
  | { readonly tipo: 'ABREVIATURA_TIPO' }
  | { readonly tipo: 'CONSECUTIVO' }
  | { readonly tipo: 'SEPARADOR'; readonly valor: string };

export interface ConvencionCodigoDto {
  readonly procesoId: Uuid;
  readonly segmentos: readonly SegmentoCodigo[];
  readonly longitudConsecutivo: number;
  /** Falsa cuando la entidad aún no definió convención (VAL-01-10): se usa la genérica. */
  readonly definida: boolean;
}

export interface AbreviaturaDto {
  readonly id: Uuid;
  readonly abreviatura: string;
  readonly descripcion: string;
}

export type SeveridadValidacion = 'BLOQUEANTE' | 'ADVERTENCIA';

export interface ResultadoValidacion {
  readonly codigo: string;
  readonly severidad: SeveridadValidacion;
  readonly cumple: boolean;
  readonly mensaje: string;
  /** Qué falta exactamente, cuando no cumple (p. ej. las clases sin subcuenta). */
  readonly detalle: string | null;
}

/** Revisión de la configuración: qué le falta a la entidad para que el cálculo tenga sentido. */
export interface ResultadoValidaciones {
  readonly resultados: readonly ResultadoValidacion[];
  readonly bloqueantesPendientes: number;
  readonly advertencias: number;
  /** Verdadero solo si ninguna bloqueante falla. */
  readonly lista: boolean;
}
