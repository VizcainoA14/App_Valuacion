/**
 * Contrato IPC (plan 2.3): fuente única de canales, entradas, salidas y semántica.
 * Main, preload y renderer derivan de aquí; no hay tres definiciones que se
 * desincronicen. Sin permisos ni sesión: la app no tiene usuarios (ADR-016).
 *
 * Convención: `<modulo>:<accion>`, verbo primero. Prohibidos los canales
 * genéricos (`db:query`, `app:ejecutar`): reabrirían la superficie de ataque.
 * Prohibido recibir rutas de archivo del renderer (P-1): los diálogos los abre el main.
 */
import { z } from 'zod';
import { zUuid, zFechaIso, zTexto, zTextoNulable, zCatalogo, zSinEntrada } from '../esquemas/basicos';
import { NIVEL_COMPLEJIDAD, TIPO_SERVICIO } from '../enums/plataforma';
import { ESTADO_ACTUAL, CONDICION_TENENCIA, SEMAFORO, CAUSAL_BAJA } from '../enums/catalogos';
import { ESTADO_BIEN } from '../enums/estados';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../parametros/parametrosCalculo';
import type {
  ProcesoDto,
  SedeDto,
  ServicioDto,
  ClaseActivoDto,
  ConvencionCodigoDto,
  AbreviaturaDto,
  ResultadoValidaciones,
} from '../dtos/configuracion';
import type { InformeImportacion, ResultadoImportacion } from '../dtos/importacion';
import type { BarridoDto, BienDto, BienListadoDto, Cobertura, Pagina } from '../dtos/inventario';
import type { CorteDto, ExclusionCalculoDto, FilaCalculoDto, ResumenCalculoDto, ResultadoEjecucionCalculoDto } from '../dtos/calculo';
import type { BajaDto, CandidatoBajaDto } from '../dtos/bajas';
import type { PlantillaDto, ResultadoDescargaPlantilla } from '../dtos/plantillas';
import type { DtoError } from '../errores';
import { CANALES_PERMITIDOS, EVENTOS_PERMITIDOS, type Canal, type Evento } from './canales';

export type { Canal, Evento } from './canales';

/** Marca de tipo para la salida: no se valida en ejecución, solo tipa el cliente. */
export interface Salida<T> {
  readonly __salida?: T;
}
export const salida = <T>(): Salida<T> => ({});

export interface DefinicionCanal<E extends z.ZodType, S> {
  readonly entrada: E;
  readonly salida: Salida<S>;
  /** Escribe en la base: corre en transacción con la bitácora y respeta INT-09. */
  readonly muta: boolean;
  /** Operación larga: responde `{ tareaId }` y emite progreso (plan 2.3 §6). */
  readonly larga?: boolean;
}

const definir = <E extends z.ZodType, S>(d: DefinicionCanal<E, S>) => d;

/** Respuesta del canal `app:obtenerEstado`: diagnóstico del esqueleto. */
export interface EstadoAplicacion {
  readonly nombreProducto: string;
  readonly versionApp: string;
  readonly versionEsquema: number;
  readonly versiones: { readonly electron: string; readonly chrome: string; readonly node: string };
  readonly baseDatos: { readonly conectada: boolean; readonly versionSqlite: string };
}

// ── Esquemas reutilizados por varios canales y por los formularios (plan 2.5 §4) ──


export const camposProceso = {
  nombre: zTexto(150),
  fechaCorte: zFechaIso,
};

export const camposHospital = {
  razonSocial: zTexto(200),
  nit: zTexto(20),
  municipio: zTexto(100),
  departamento: zTexto(100),
  nivelComplejidad: zCatalogo(NIVEL_COMPLEJIDAD),
  nombreGerente: zTexto(150),
  actoNombramientoGerente: zTextoNulable(200),
  direccion: zTexto(200),
  telefono: zTextoNulable(50),
  email: zTextoNulable(150),
};

export const camposSede = {
  codigo: zTexto(10),
  nombre: zTexto(150),
  direccion: zTexto(200),
  municipio: zTexto(100),
  activa: z.boolean(),
};

export const camposServicio = {
  codigo: zTexto(10),
  nombre: zTexto(150),
  tipo: zCatalogo(TIPO_SERVICIO),
  responsable: zTextoNulable(150),
  activo: z.boolean(),
};

export const camposClase = {
  codigo: zTexto(10),
  nombre: zTexto(150),
  subcuentaContable: zTexto(20),
  vidaUtilContableMeses: z.number().int().positive().nullable(),
  vidaUtilTecnicaAnios: z.number().positive().nullable(),
  esDepreciable: z.boolean(),
  requiereHojaVida: z.boolean(),
  requiereInvima: z.boolean(),
  responsableTecnico: zTexto(100),
  activo: z.boolean(),
};

export const zSegmentoCodigo = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('PREFIJO_ENTIDAD'), valor: zTexto(10) }),
  z.object({ tipo: z.literal('CODIGO_SEDE') }),
  z.object({ tipo: z.literal('ABREVIATURA_TIPO') }),
  z.object({ tipo: z.literal('CONSECUTIVO') }),
  z.object({ tipo: z.literal('SEPARADOR'), valor: z.string().min(1).max(3) }),
]);

const zPlantillaImportable = z.enum(['PL-01', 'PL-02', 'PL-02b', 'PL-03', 'PL-05']);

const zFiltrosBien = z.object({
  texto: zTextoNulable(200).transform((v) => v ?? undefined),
  sedeId: zUuid.optional(),
  servicioId: zUuid.optional(),
  claseActivoId: zUuid.optional(),
  estadoActual: zCatalogo(ESTADO_ACTUAL).optional(),
  condicionTenencia: zCatalogo(CONDICION_TENENCIA).optional(),
  estadoRegistro: zCatalogo(ESTADO_BIEN).optional(),
  sinHojaVida: z.boolean().optional(),
});

const zColumnaOrdenBien = z.enum([
  'codigoInstitucional',
  'placa',
  'descripcionFuncional',
  'claseCodigo',
  'servicioCodigo',
  'estadoActual',
  'estadoRegistro',
  'costoAdquisicion',
]);

export const contrato = {
  'app:obtenerEstado': definir({ entrada: zSinEntrada, salida: salida<EstadoAplicacion>(), muta: false }),
  /** Un error del renderer (pantalla en blanco) queda en el registro técnico del main. */
  'app:registrarErrorRenderer': definir({
    entrada: z.object({ mensaje: zTexto(2000), origen: zTextoNulable(200), pila: zTextoNulable(8000) }),
    salida: salida<{ registrado: true }>(),
    muta: false,
  }),
  'tarea:cancelar': definir({
    entrada: z.object({ tareaId: zUuid }),
    salida: salida<{ cancelada: boolean }>(),
    muta: false,
  }),

  // ── Configurar · entidad (RF-01-01, RF-01-03, RF-01-09) ──
  'proceso:listar': definir({ entrada: zSinEntrada, salida: salida<ProcesoDto[]>(), muta: false }),
  'proceso:porId': definir({ entrada: z.object({ id: zUuid }), salida: salida<ProcesoDto | null>(), muta: false }),
  /** ADR-029: un proceso nace con su nombre, su fecha de corte y los datos del hospital. */
  'proceso:crear': definir({
    entrada: z.object({ ...camposProceso, ...camposHospital, precargarSemillas: z.boolean().default(true) }),
    salida: salida<ProcesoDto>(),
    muta: true,
  }),
  /** Solo en curso. Cambiar la fecha de corte descarta el cálculo hecho. */
  'proceso:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object({ ...camposProceso, ...camposHospital }).partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ProcesoDto>(),
    muta: true,
  }),
  /** Solo en curso: un proceso finalizado es evidencia de lo que se calculó. */
  'proceso:eliminar': definir({
    entrada: z.object({ id: zUuid, justificacion: zTexto(500) }),
    salida: salida<{ nombre: string }>(),
    muta: true,
  }),
  /** Deja el proceso de solo lectura. Exige que esté calculado. */
  'proceso:finalizar': definir({
    entrada: z.object({ id: zUuid }),
    salida: salida<ProcesoDto>(),
    muta: true,
  }),

  // ── Configurar · sedes y servicios ──
  'sede:listar': definir({
    entrada: z.object({ procesoId: zUuid, incluirInactivas: z.boolean().default(false) }),
    salida: salida<SedeDto[]>(),
    muta: false,
  }),
  'sede:crear': definir({
    entrada: z.object({ procesoId: zUuid, ...camposSede, activa: z.boolean().default(true) }),
    salida: salida<SedeDto>(),
    muta: true,
  }),
  'sede:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposSede).partial() }),
    salida: salida<SedeDto>(),
    muta: true,
  }),
  'servicio:listar': definir({
    entrada: z.object({ procesoId: zUuid, incluirInactivos: z.boolean().default(false) }),
    salida: salida<ServicioDto[]>(),
    muta: false,
  }),
  'servicio:crear': definir({
    entrada: z.object({ sedeId: zUuid, ...camposServicio, activo: z.boolean().default(true) }),
    salida: salida<ServicioDto>(),
    muta: true,
  }),
  'servicio:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposServicio).partial() }),
    salida: salida<ServicioDto>(),
    muta: true,
  }),

  // ── Configurar · clases de activo (RN-01-03) ──
  'clase:listar': definir({
    entrada: z.object({ procesoId: zUuid, incluirInactivas: z.boolean().default(false) }),
    salida: salida<ClaseActivoDto[]>(),
    muta: false,
  }),
  'clase:crear': definir({
    entrada: z.object({ procesoId: zUuid, ...camposClase, activo: z.boolean().default(true) }),
    salida: salida<ClaseActivoDto>(),
    muta: true,
  }),
  'clase:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposClase).partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ClaseActivoDto>(),
    muta: true,
  }),
  'clase:precargarSugeridas': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<{ creadas: number; omitidas: number }>(),
    muta: true,
  }),

  // ── Configurar · parámetros de cálculo (RN-01-04, RN-01-05, RF-01-08) ──
  'parametros:obtener': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<ParametrosCalculo>(),
    muta: false,
  }),
  'parametros:actualizar': definir({
    entrada: z.object({ procesoId: zUuid, cambios: EsquemaParametrosCalculo.partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ParametrosCalculo>(),
    muta: true,
  }),

  // ── Configurar · convención de codificación (RN-01-02, RF-01-04) ──
  'convencion:obtener': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<ConvencionCodigoDto>(),
    muta: false,
  }),
  'convencion:guardar': definir({
    entrada: z.object({
      procesoId: zUuid,
      segmentos: z.array(zSegmentoCodigo).min(1).max(8),
      longitudConsecutivo: z.number().int().min(1).max(10),
    }),
    salida: salida<ConvencionCodigoDto>(),
    muta: true,
  }),
  'convencion:previsualizar': definir({
    entrada: z.object({
      segmentos: z.array(zSegmentoCodigo).min(1).max(8),
      longitudConsecutivo: z.number().int().min(1).max(10),
      ejemplo: z.object({ codigoSede: zTexto(10), abreviatura: zTexto(10), consecutivo: z.number().int().min(1) }),
    }),
    salida: salida<{ codigo: string }>(),
    muta: false,
  }),
  'abreviatura:listar': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<AbreviaturaDto[]>(),
    muta: false,
  }),
  'abreviatura:guardar': definir({
    entrada: z.object({
      procesoId: zUuid,
      abreviaturas: z.array(z.object({ abreviatura: zTexto(10), descripcion: zTexto(150) })).max(2000),
    }),
    salida: salida<AbreviaturaDto[]>(),
    muta: true,
  }),

  // ── Revisión de la configuración: qué le falta a la entidad para calcular ──
  'validaciones:evaluar': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<ResultadoValidaciones>(),
    muta: false,
  }),

  // ── Inventario vivo (ADR-028; TR-10: filtro y orden SIEMPRE en el main) ──
  'bien:listar': definir({
    entrada: z.object({
      procesoId: zUuid,
      filtros: zFiltrosBien.prefault({}),
      orden: z.object({ columna: zColumnaOrdenBien, ascendente: z.boolean() }).prefault({ columna: 'codigoInstitucional', ascendente: true }),
      pagina: z.number().int().min(0).default(0),
      tamano: z.number().int().min(1).max(1000).default(200),
    }),
    salida: salida<Pagina<BienListadoDto>>(),
    muta: false,
  }),
  'bien:porId': definir({ entrada: z.object({ id: zUuid }), salida: salida<BienDto | null>(), muta: false }),
  'bien:idsDelFiltro': definir({
    entrada: z.object({ procesoId: zUuid, filtros: zFiltrosBien.prefault({}) }),
    salida: salida<string[]>(),
    muta: false,
  }),
  'bien:cobertura': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<Cobertura>(),
    muta: false,
  }),
  /**
   * RN-05-03: la obsolescencia funcional es juicio de una persona, no salida del
   * motor. Es una propiedad del bien y pesa en todos los cortes que vengan.
   */
  'bien:marcarObsolescenciaFuncional': definir({
    entrada: z.object({ bienId: zUuid, funcional: z.boolean(), justificacion: zTexto(500) }),
    salida: salida<BienDto>(),
    muta: true,
  }),
  'barrido:listar': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<BarridoDto[]>(),
    muta: false,
  }),

  // ── TR-03 · plantillas que la aplicación entrega (ANEXO_A §6.1, ADR-026) ──
  'plantilla:listar': definir({ entrada: zSinEntrada, salida: salida<PlantillaDto[]>(), muta: false }),
  'plantilla:descargar': definir({
    entrada: z.object({ codigo: zTexto(10), procesoId: zUuid.nullish() }),
    salida: salida<ResultadoDescargaPlantilla | null>(),
    muta: false,
  }),
  /** Entrega de una vez las plantillas que el hospital debe diligenciar. */
  'plantilla:descargarPaquete': definir({
    entrada: z.object({ codigos: z.array(zTexto(10)).min(1).max(28), procesoId: zUuid.nullish() }),
    salida: salida<{ carpeta: string; entregadas: ResultadoDescargaPlantilla[] } | null>(),
    muta: false,
  }),

  // ── Cálculo por cortes (ADR-028; RF-05-01, RF-06-01) ──
  /** El cálculo del proceso: uno por proceso, a su fecha de corte (ADR-029). */
  'corte:actual': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<CorteDto | null>(),
    muta: false,
  }),
  'corte:porId': definir({ entrada: z.object({ id: zUuid }), salida: salida<CorteDto | null>(), muta: false }),
  /** Calcula todo el inventario del proceso a su fecha de corte; reemplaza el cálculo anterior. */
  'calculo:ejecutar': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<ResultadoEjecucionCalculoDto>(),
    muta: true,
  }),
  'calculo:resumen': definir({
    entrada: z.object({ corteId: zUuid }),
    salida: salida<ResumenCalculoDto>(),
    muta: false,
  }),
  'calculo:listar': definir({
    entrada: z.object({
      corteId: zUuid,
      semaforo: zCatalogo(SEMAFORO).optional(),
      soloCandidatosBaja: z.boolean().default(false),
      texto: zTextoNulable(200).transform((v) => v ?? undefined),
      pagina: z.number().int().min(0).default(0),
      tamano: z.number().int().min(1).max(500).default(100),
    }),
    salida: salida<Pagina<FilaCalculoDto>>(),
    muta: false,
  }),
  /** Lo que quedó fuera del corte y por qué (nunca un cero). */
  'calculo:exclusiones': definir({
    entrada: z.object({ corteId: zUuid }),
    salida: salida<ExclusionCalculoDto[]>(),
    muta: false,
  }),

  // ── Bajas (ADR-028) ──
  /** Los candidatos que el motor señaló en un corte, con su motivo. */
  'baja:candidatos': definir({
    entrada: z.object({ corteId: zUuid, incluirYaDadosDeBaja: z.boolean().default(false) }),
    salida: salida<CandidatoBajaDto[]>(),
    muta: false,
  }),
  'baja:listar': definir({
    entrada: z.object({ procesoId: zUuid, incluirAnuladas: z.boolean().default(false) }),
    salida: salida<BajaDto[]>(),
    muta: false,
  }),
  /**
   * Registra una baja que el hospital ya decidió. La aplicación no la aprueba
   * ni exige el acta; la justificación sí es individual (RN-09-06).
   */
  'baja:registrar': definir({
    entrada: z.object({
      bienId: zUuid,
      fecha: zFechaIso,
      causal: zCatalogo(CAUSAL_BAJA),
      justificacion: zTexto(1000),
      referencia: zTextoNulable(200),
    }),
    salida: salida<BajaDto>(),
    muta: true,
  }),
  /** Deshace una baja registrada por error: el bien vuelve a ACTIVO. */
  'baja:anular': definir({
    entrada: z.object({ id: zUuid, motivo: zTexto(500) }),
    salida: salida<BajaDto>(),
    muta: true,
  }),

  // ── Informe de valuación (TR-05, RF-06-08): uno por corte ──
  'informe:previsualizar': definir({
    entrada: z.object({ corteId: zUuid }),
    salida: salida<{ html: string; bienes: number; candidatos: number }>(),
    muta: false,
  }),
  /** El main abre el diálogo de guardado (P-1) y escribe el PDF. */
  'informe:generar': definir({
    entrada: z.object({ corteId: zUuid }),
    salida: salida<{ ruta: string; bytes: number } | null>(),
    muta: false,
  }),

  // ── TR-02 · importación (RF-01-02 configuración; RF-02-07 barrido; RF-03-03 datos económicos) ──
  'importacion:previsualizar': definir({
    // `procesoId` nulo solo lo admite PL-01, y significa "crear la entidad desde
    // la plantilla": es como llega un hospital que recibió el formato diligenciado.
    entrada: z.object({ procesoId: zUuid.nullish(), plantilla: zPlantillaImportable }),
    salida: salida<InformeImportacion | null>(),
    muta: false,
  }),
  'importacion:confirmar': definir({
    entrada: z.object({ token: zUuid, aceptarConErrores: z.boolean().default(false) }),
    salida: salida<ResultadoImportacion>(),
    muta: true,
  }),

  // ── T-B-11 · hospital de demostración ──
  'demo:cargar': definir({ entrada: zSinEntrada, salida: salida<ProcesoDto>(), muta: true }),
  'demo:borrar': definir({
    entrada: z.object({ procesoId: zUuid }),
    salida: salida<{ eliminados: Record<string, number> }>(),
    muta: true,
  }),
} as const satisfies Record<Canal, DefinicionCanal<z.ZodType, unknown>>;

export type Contrato = typeof contrato;
export type EntradaDe<C extends Canal> = z.input<Contrato[C]['entrada']>;
export type EntradaValidadaDe<C extends Canal> = z.output<Contrato[C]['entrada']>;
export type SalidaDe<C extends Canal> = Contrato[C]['salida'] extends Salida<infer S> ? S : never;

/** Misma lista que la del preload; `satisfies` garantiza que el contrato la cubre exactamente. */
export const CANALES: readonly Canal[] = CANALES_PERMITIDOS;
export const EVENTOS: readonly Evento[] = EVENTOS_PERMITIDOS;

export interface EventoProgreso {
  readonly tareaId: string;
  readonly hechos: number;
  readonly total: number;
  readonly fase: string;
}
export interface EventoTareaFinalizada {
  readonly tareaId: string;
  readonly estado: 'ok' | 'cancelada' | 'error';
  readonly resumen: unknown;
}
export interface EventoAlerta {
  readonly nivel: 'info' | 'advertencia' | 'error';
  readonly mensaje: string;
}
export interface DatosDeEvento {
  readonly 'evento:progreso': EventoProgreso;
  readonly 'evento:tareaFinalizada': EventoTareaFinalizada;
  readonly 'evento:alerta': EventoAlerta;
}

/** Sobre que devuelve todo canal: un `Error` de JS pierde su clase al cruzar el IPC (P-4). */
export type RespuestaIpc<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly error: DtoError };

/** Superficie completa que el preload expone como `window.api`. Nada más. */
export interface ApiRenderer {
  invocar<C extends Canal>(canal: C, entrada?: EntradaDe<C>): Promise<RespuestaIpc<SalidaDe<C>>>;
  suscribir<E extends Evento>(evento: E, callback: (datos: DatosDeEvento[E]) => void): () => void;
}
