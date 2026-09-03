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
import { PERFIL_RESPONSABLE, NIVEL_COMPLEJIDAD, TIPO_SERVICIO } from '../enums/plataforma';
import { ESTADO_ACTUAL, CONDICION_TENENCIA, ESTADO_REGISTRO, SEMAFORO, CAUSAL_BAJA, DESTINO_FINAL } from '../enums/catalogos';
import { ESTADO_PROPUESTA_BAJA } from '../enums/estados';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../parametros/parametrosCalculo';
import type { ResponsableDto } from '../dtos/responsable';
import type {
  EntidadDto,
  SedeDto,
  ServicioDto,
  ClaseActivoDto,
  ConvencionCodigoDto,
  AbreviaturaDto,
  EjercicioDto,
  ResultadoValidaciones,
} from '../dtos/configuracion';
import type { InformeImportacion, ResultadoImportacion } from '../dtos/importacion';
import type { BienDto, BienListadoDto, Cobertura, Pagina } from '../dtos/inventario';
import type { FilaCalculoDto, ResumenCalculoDto, ResultadoEjecucionCalculoDto } from '../dtos/calculo';
import type { CandidatoBajaDto, PropuestaBajaDto, ResumenBajasDto } from '../dtos/bajas';
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

const camposResponsable = {
  nombreCompleto: zTexto(150),
  documentoIdentidad: zTexto(20),
  perfil: zCatalogo(PERFIL_RESPONSABLE),
  cargo: zTexto(150),
  tarjetaProfesional: zTextoNulable(50),
  registroRaa: zTextoNulable(50),
  // Sin valor por defecto aquí: en el parcial de `actualizar` un default
  // silencioso marcaría como interno a un perito al tocar cualquier otro campo.
  esExterno: z.boolean(),
};

export const camposEntidad = {
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
  estadoRegistro: zCatalogo(ESTADO_REGISTRO).optional(),
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

  // ── TR-12 · catálogo de responsables (T-B-07) ──
  'responsable:listar': definir({
    entrada: z.object({ entidadId: zUuid, incluirInactivos: z.boolean().default(false) }),
    salida: salida<ResponsableDto[]>(),
    muta: false,
  }),
  'responsable:crear': definir({
    entrada: z.object({ entidadId: zUuid, ...camposResponsable, esExterno: z.boolean().default(false) }),
    salida: salida<ResponsableDto>(),
    muta: true,
  }),
  'responsable:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposResponsable).partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ResponsableDto>(),
    muta: true,
  }),
  'responsable:desactivar': definir({
    entrada: z.object({ id: zUuid, justificacion: zTexto(500) }),
    salida: salida<ResponsableDto>(),
    muta: true,
  }),

  // ── Paso 01 · entidad (RF-01-01, RF-01-03, RF-01-09) ──
  'entidad:listar': definir({ entrada: zSinEntrada, salida: salida<EntidadDto[]>(), muta: false }),
  'entidad:porId': definir({ entrada: z.object({ id: zUuid }), salida: salida<EntidadDto | null>(), muta: false }),
  'entidad:crear': definir({
    entrada: z.object({ ...camposEntidad, precargarSemillas: z.boolean().default(true) }),
    salida: salida<EntidadDto>(),
    muta: true,
  }),
  'entidad:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposEntidad).partial(), justificacion: zTextoNulable(500) }),
    salida: salida<EntidadDto>(),
    muta: true,
  }),
  'entidad:clonarParametrizacion': definir({
    entrada: z.object({
      origenId: zUuid,
      destinoId: zUuid,
      incluir: z
        .object({
          clases: z.boolean().default(true),
          sedesYServicios: z.boolean().default(false),
          parametros: z.boolean().default(true),
          convencion: z.boolean().default(true),
        })
        .prefault({}),
    }),
    salida: salida<{ clases: number; sedes: number; servicios: number; parametros: number; abreviaturas: number }>(),
    muta: true,
  }),

  // ── Paso 01 · sedes y servicios ──
  'sede:listar': definir({
    entrada: z.object({ entidadId: zUuid, incluirInactivas: z.boolean().default(false) }),
    salida: salida<SedeDto[]>(),
    muta: false,
  }),
  'sede:crear': definir({
    entrada: z.object({ entidadId: zUuid, ...camposSede, activa: z.boolean().default(true) }),
    salida: salida<SedeDto>(),
    muta: true,
  }),
  'sede:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposSede).partial() }),
    salida: salida<SedeDto>(),
    muta: true,
  }),
  'servicio:listar': definir({
    entrada: z.object({ entidadId: zUuid, incluirInactivos: z.boolean().default(false) }),
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

  // ── Paso 01 · clases de activo (RN-01-03) ──
  'clase:listar': definir({
    entrada: z.object({ entidadId: zUuid, incluirInactivas: z.boolean().default(false) }),
    salida: salida<ClaseActivoDto[]>(),
    muta: false,
  }),
  'clase:crear': definir({
    entrada: z.object({ entidadId: zUuid, ...camposClase, activo: z.boolean().default(true) }),
    salida: salida<ClaseActivoDto>(),
    muta: true,
  }),
  'clase:actualizar': definir({
    entrada: z.object({ id: zUuid, cambios: z.object(camposClase).partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ClaseActivoDto>(),
    muta: true,
  }),
  'clase:precargarSugeridas': definir({
    entrada: z.object({ entidadId: zUuid }),
    salida: salida<{ creadas: number; omitidas: number }>(),
    muta: true,
  }),

  // ── Paso 01 · parámetros de cálculo (RN-01-04, RN-01-05, RF-01-08) ──
  'parametros:obtener': definir({
    entrada: z.object({ entidadId: zUuid }),
    salida: salida<ParametrosCalculo>(),
    muta: false,
  }),
  'parametros:actualizar': definir({
    entrada: z.object({ entidadId: zUuid, cambios: EsquemaParametrosCalculo.partial(), justificacion: zTextoNulable(500) }),
    salida: salida<ParametrosCalculo>(),
    muta: true,
  }),

  // ── Paso 01 · convención de codificación (RN-01-02, RF-01-04) ──
  'convencion:obtener': definir({
    entrada: z.object({ entidadId: zUuid }),
    salida: salida<ConvencionCodigoDto>(),
    muta: false,
  }),
  'convencion:guardar': definir({
    entrada: z.object({
      entidadId: zUuid,
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
    entrada: z.object({ entidadId: zUuid }),
    salida: salida<AbreviaturaDto[]>(),
    muta: false,
  }),
  'abreviatura:guardar': definir({
    entrada: z.object({
      entidadId: zUuid,
      abreviaturas: z.array(z.object({ abreviatura: zTexto(10), descripcion: zTexto(150) })).max(2000),
    }),
    salida: salida<AbreviaturaDto[]>(),
    muta: true,
  }),

  // ── Paso 01 · ejercicio (RF-01-05, RN-01-01, RN-01-06) ──
  'ejercicio:listar': definir({
    entrada: z.object({ entidadId: zUuid }),
    salida: salida<EjercicioDto[]>(),
    muta: false,
  }),
  'ejercicio:porId': definir({ entrada: z.object({ id: zUuid }), salida: salida<EjercicioDto | null>(), muta: false }),
  'ejercicio:crear': definir({
    entrada: z.object({
      entidadId: zUuid,
      nombre: zTexto(150),
      fechaCorte: zFechaIso,
      contratoNumero: zTextoNulable(50),
      responsableId: zUuid,
    }),
    salida: salida<EjercicioDto>(),
    muta: true,
  }),
  'ejercicio:cambiarFechaCorte': definir({
    entrada: z.object({ id: zUuid, fechaCorte: zFechaIso, justificacion: zTexto(500) }),
    salida: salida<EjercicioDto>(),
    muta: true,
  }),

  // ── TR-01 · validaciones de cualquier paso (RF-01-06 y sucesivos) ──
  'validaciones:evaluar': definir({
    entrada: z.object({ paso: z.number().int().min(1).max(11), entidadId: zUuid, ejercicioId: zUuid.nullish() }),
    salida: salida<ResultadoValidaciones>(),
    muta: false,
  }),

  // ── Paso 02 · inventario (TR-10: filtro y orden SIEMPRE en el main) ──
  'bien:listar': definir({
    entrada: z.object({
      ejercicioId: zUuid,
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
    entrada: z.object({ ejercicioId: zUuid, filtros: zFiltrosBien.prefault({}) }),
    salida: salida<string[]>(),
    muta: false,
  }),
  'bien:cobertura': definir({
    entrada: z.object({ entidadId: zUuid, ejercicioId: zUuid }),
    salida: salida<Cobertura>(),
    muta: false,
  }),

  // ── TR-03 · plantillas que la aplicación entrega (ANEXO_A §6.1, ADR-026) ──
  'plantilla:listar': definir({ entrada: zSinEntrada, salida: salida<PlantillaDto[]>(), muta: false }),
  'plantilla:descargar': definir({
    entrada: z.object({ codigo: zTexto(10), entidadId: zUuid.nullish(), ejercicioId: zUuid.nullish() }),
    salida: salida<ResultadoDescargaPlantilla | null>(),
    muta: false,
  }),
  /** Entrega de una vez las plantillas que el hospital debe diligenciar. */
  'plantilla:descargarPaquete': definir({
    entrada: z.object({ codigos: z.array(zTexto(10)).min(1).max(28), entidadId: zUuid.nullish(), ejercicioId: zUuid.nullish() }),
    salida: salida<{ carpeta: string; entregadas: ResultadoDescargaPlantilla[] } | null>(),
    muta: false,
  }),

  // ── Pasos 05 y 06 · motor de cálculo (RF-05-01, RF-06-01) ──
  /** Recalcula TODO el ejercicio: obsolescencia, depreciación y candidatos a baja. */
  'calculo:ejecutar': definir({
    entrada: z.object({ entidadId: zUuid, ejercicioId: zUuid }),
    salida: salida<ResultadoEjecucionCalculoDto>(),
    muta: true,
  }),
  'calculo:resumen': definir({
    entrada: z.object({ ejercicioId: zUuid }),
    salida: salida<ResumenCalculoDto>(),
    muta: false,
  }),
  'calculo:listar': definir({
    entrada: z.object({
      ejercicioId: zUuid,
      semaforo: zCatalogo(SEMAFORO).optional(),
      soloCandidatosBaja: z.boolean().default(false),
      texto: zTextoNulable(200).transform((v) => v ?? undefined),
      pagina: z.number().int().min(0).default(0),
      tamano: z.number().int().min(1).max(500).default(100),
    }),
    salida: salida<Pagina<FilaCalculoDto>>(),
    muta: false,
  }),
  /** RN-05-03: la obsolescencia funcional la declara un especialista, no el motor. */
  'calculo:marcarObsolescenciaFuncional': definir({
    entrada: z.object({ ejercicioId: zUuid, bienId: zUuid, funcional: z.boolean(), justificacion: zTexto(500) }),
    salida: salida<FilaCalculoDto>(),
    muta: true,
  }),

  // ── Paso 09 · bajas (RF-09-01 … RF-09-04) ──
  /** Bandeja de candidatos que alimenta el paso 05 (RF-09-01). */
  'baja:candidatos': definir({
    entrada: z.object({ ejercicioId: zUuid, incluirYaPropuestos: z.boolean().default(false) }),
    salida: salida<CandidatoBajaDto[]>(),
    muta: false,
  }),
  'baja:listar': definir({
    entrada: z.object({ ejercicioId: zUuid, estado: zCatalogo(ESTADO_PROPUESTA_BAJA).optional() }),
    salida: salida<PropuestaBajaDto[]>(),
    muta: false,
  }),
  'baja:resumen': definir({ entrada: z.object({ ejercicioId: zUuid }), salida: salida<ResumenBajasDto>(), muta: false }),
  /** RN-09-06: la justificación es individual y obligatoria; no se admiten lotes. */
  'baja:proponer': definir({
    entrada: z.object({
      ejercicioId: zUuid,
      bienId: zUuid,
      causal: zCatalogo(CAUSAL_BAJA),
      justificacionTecnica: zTexto(1000),
      costoReparacionEstimado: z.number().int().min(0).nullish(),
      valorReposicion: z.number().int().min(0).nullish(),
      valorSalvamento: z.number().int().min(0).nullish(),
      destinoFinalPropuesto: zCatalogo(DESTINO_FINAL).nullish(),
      especialistaId: zUuid,
      fechaPropuesta: zFechaIso,
    }),
    salida: salida<PropuestaBajaDto>(),
    muta: true,
  }),
  'baja:actualizar': definir({
    entrada: z.object({
      id: zUuid,
      cambios: z.object({
        causal: zCatalogo(CAUSAL_BAJA),
        justificacionTecnica: zTexto(1000),
        costoReparacionEstimado: z.number().int().min(0).nullable(),
        valorReposicion: z.number().int().min(0).nullable(),
        valorSalvamento: z.number().int().min(0).nullable(),
        destinoFinalPropuesto: zCatalogo(DESTINO_FINAL).nullable(),
      }).partial(),
      justificacion: zTextoNulable(500),
    }),
    salida: salida<PropuestaBajaDto>(),
    muta: true,
  }),
  /** RN-09-04: la app registra estados; la baja la aprueba el Comité. */
  'baja:cambiarEstado': definir({
    entrada: z.object({ id: zUuid, nuevoEstado: zCatalogo(ESTADO_PROPUESTA_BAJA), observacionComite: zTextoNulable(1000) }),
    salida: salida<PropuestaBajaDto>(),
    muta: true,
  }),

  /** Cierre del inventario: los bienes VALIDADOS pasan a ACTIVOS (ANEXO_B §6.2). */
  'bien:activarValidados': definir({
    entrada: z.object({ ejercicioId: zUuid }),
    salida: salida<{ activados: number }>(),
    muta: true,
  }),

  // ── Etapa 6 · informe de valuación (TR-05, RF-06-08) ──
  'informe:previsualizar': definir({
    entrada: z.object({ entidadId: zUuid, ejercicioId: zUuid }),
    salida: salida<{ html: string; bienes: number; bajas: number }>(),
    muta: false,
  }),
  /** El main abre el diálogo de guardado (P-1) y escribe el PDF. */
  'informe:generar': definir({
    entrada: z.object({ entidadId: zUuid, ejercicioId: zUuid }),
    salida: salida<{ ruta: string; bytes: number } | null>(),
    muta: false,
  }),

  // ── TR-02 · importación (RF-01-02 paso 01; RF-02-07 paso 02; RF-03-03 paso 03) ──
  // `ejercicioId` solo lo exigen las plantillas que traen bienes (PL-03, PL-05).
  'importacion:previsualizar': definir({
    entrada: z.object({ entidadId: zUuid, plantilla: zPlantillaImportable, ejercicioId: zUuid.nullish() }),
    salida: salida<InformeImportacion | null>(),
    muta: false,
  }),
  'importacion:confirmar': definir({
    entrada: z.object({ token: zUuid, aceptarConErrores: z.boolean().default(false) }),
    salida: salida<ResultadoImportacion>(),
    muta: true,
  }),

  // ── T-B-11 · hospital de demostración ──
  'demo:cargar': definir({ entrada: zSinEntrada, salida: salida<EntidadDto>(), muta: true }),
  'demo:borrar': definir({
    entrada: z.object({ entidadId: zUuid }),
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
