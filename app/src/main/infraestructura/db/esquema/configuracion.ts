/** MOD-02 — Configuración (ANEXO_B §2, §7.2; paso 01 §10.1; paso 07 FactorEstado). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  x10k,
  fecha,
  marcaTiempo,
  booleano,
  json,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
  chkBooleano,
} from './_columnas';
import { ESTADO_ACTUAL } from '../../../../compartido/enums/catalogos';
import { ESTADO_EJERCICIO } from '../../../../compartido/enums/estados';
import { TIPO_DATO_PARAMETRO } from '../../../../compartido/enums/parametros';
import {
  NIVEL_COMPLEJIDAD,
  TIPO_SERVICIO,
  PERFIL_RESPONSABLE,
} from '../../../../compartido/enums/plataforma';

export const entidad = sqliteTable(
  'entidad',
  {
    id: uuidPk(),
    razonSocial: texto('razon_social').notNull(),
    nit: texto('nit').notNull(),
    municipio: texto('municipio').notNull(),
    departamento: texto('departamento').notNull(),
    nivelComplejidad: enumCatalogo('nivel_complejidad', NIVEL_COMPLEJIDAD).notNull(),
    nombreGerente: texto('nombre_gerente').notNull(),
    actoNombramientoGerente: texto('acto_nombramiento_gerente'),
    direccion: texto('direccion').notNull(),
    telefono: texto('telefono'),
    email: texto('email'),
    /** Ruta relativa al almacén, no URL (CT-14). */
    logoUrl: texto('logo_url'),
    /** Hospital de demostración (T-B-11): banda visible y borrado de un clic. */
    esDemostracion: booleano('es_demostracion').notNull().default(false),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_entidad_nit').on(t.nit),
    chkCatalogo('chk_entidad_nivel', t.nivelComplejidad, NIVEL_COMPLEJIDAD),
    chkBooleano('chk_entidad_demo', t.esDemostracion),
  ],
);

export const sede = sqliteTable(
  'sede',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    codigo: texto('codigo').notNull(),
    nombre: texto('nombre').notNull(),
    direccion: texto('direccion').notNull(),
    municipio: texto('municipio').notNull(),
    activa: booleano('activa').notNull().default(true),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_sede_codigo').on(t.entidadId, t.codigo),
    chkBooleano('chk_sede_activa', t.activa),
  ],
);

export const servicio = sqliteTable(
  'servicio',
  {
    id: uuidPk(),
    sedeId: uuid('sede_id')
      .notNull()
      .references(() => sede.id, { onDelete: 'cascade' }),
    codigo: texto('codigo').notNull(),
    nombre: texto('nombre').notNull(),
    tipo: enumCatalogo('tipo', TIPO_SERVICIO).notNull(),
    responsable: texto('responsable'),
    activo: booleano('activo').notNull().default(true),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_servicio_codigo').on(t.sedeId, t.codigo),
    chkCatalogo('chk_servicio_tipo', t.tipo, TIPO_SERVICIO),
    chkBooleano('chk_servicio_activo', t.activo),
  ],
);

export const claseActivo = sqliteTable(
  'clase_activo',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    codigo: texto('codigo').notNull(),
    nombre: texto('nombre').notNull(),
    subcuentaContable: texto('subcuenta_contable').notNull(),
    /** Nulo si no deprecia. */
    vidaUtilContableMeses: entero('vida_util_contable_meses'),
    /** decimal(5,2) en ANEXO_B → ×10.000. */
    vidaUtilTecnicaAnios: x10k('vida_util_tecnica_anios'),
    esDepreciable: booleano('es_depreciable').notNull().default(true),
    requiereHojaVida: booleano('requiere_hoja_vida').notNull().default(false),
    requiereInvima: booleano('requiere_invima').notNull().default(false),
    responsableTecnico: texto('responsable_tecnico').notNull(),
    activo: booleano('activo').notNull().default(true),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_clase_codigo').on(t.entidadId, t.codigo),
    chkBooleano('chk_clase_depreciable', t.esDepreciable),
    chkBooleano('chk_clase_hoja_vida', t.requiereHojaVida),
    chkBooleano('chk_clase_invima', t.requiereInvima),
    chkBooleano('chk_clase_activo', t.activo),
  ],
);

export const parametroCalculo = sqliteTable(
  'parametro_calculo',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    clave: texto('clave').notNull(),
    /** Serializado como texto; el tipo real lo dice `tipo_dato`. */
    valor: texto('valor').notNull(),
    tipoDato: enumCatalogo('tipo_dato', TIPO_DATO_PARAMETRO).notNull(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_parametro_clave').on(t.entidadId, t.clave),
    chkCatalogo('chk_parametro_tipo', t.tipoDato, TIPO_DATO_PARAMETRO),
  ],
);

export const convencionCodigo = sqliteTable(
  'convencion_codigo',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    segmentosJson: json('segmentos_json').notNull(),
    longitudConsecutivo: entero('longitud_consecutivo').notNull(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [uniqueIndex('ux_convencion_entidad').on(t.entidadId)],
);

export const abreviaturaTipo = sqliteTable(
  'abreviatura_tipo',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    abreviatura: texto('abreviatura').notNull(),
    descripcion: texto('descripcion').notNull(),
  },
  (t) => [uniqueIndex('ux_abreviatura').on(t.entidadId, t.abreviatura)],
);

/** Catálogo de personas para atribuir firmas; NO son cuentas (ADR-016). */
export const responsable = sqliteTable(
  'responsable',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    nombreCompleto: texto('nombre_completo').notNull(),
    documentoIdentidad: texto('documento_identidad').notNull(),
    perfil: enumCatalogo('perfil', PERFIL_RESPONSABLE).notNull(),
    cargo: texto('cargo').notNull(),
    tarjetaProfesional: texto('tarjeta_profesional'),
    /** Obligatorio para el perito (paso 08). */
    registroRaa: texto('registro_raa'),
    esExterno: booleano('es_externo').notNull().default(false),
    activo: booleano('activo').notNull().default(true),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_responsable_entidad').on(t.entidadId, t.perfil),
    chkCatalogo('chk_responsable_perfil', t.perfil, PERFIL_RESPONSABLE),
    chkBooleano('chk_responsable_externo', t.esExterno),
    chkBooleano('chk_responsable_activo', t.activo),
  ],
);

export const ejercicio = sqliteTable(
  'ejercicio',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'restrict' }),
    nombre: texto('nombre').notNull(),
    /** Parámetro central de todo el cálculo. */
    fechaCorte: fecha('fecha_corte').notNull(),
    estado: enumCatalogo('estado', ESTADO_EJERCICIO).notNull().default('ABIERTO'),
    pasoActual: entero('paso_actual').notNull().default(1),
    /** Copia de los parámetros al abrir (RN-01-01). */
    parametrosCongeladosJson: json('parametros_congelados_json').notNull(),
    contratoNumero: texto('contrato_numero'),
    /** Quien abre el ejercicio firma el acta de parametrización. */
    creadoPorResponsableId: uuid('creado_por_responsable_id')
      .notNull()
      .references(() => responsable.id, { onDelete: 'restrict' }),
    creadoEn: creadoEn(),
    cerradoEn: marcaTiempo('cerrado_en'),
    inmutable: booleano('inmutable').notNull().default(false),
  },
  (t) => [
    index('ix_ejercicio_entidad').on(t.entidadId, t.fechaCorte),
    chkCatalogo('chk_ejercicio_estado', t.estado, ESTADO_EJERCICIO),
    chkBooleano('chk_ejercicio_inmutable', t.inmutable),
  ],
);

/** Factores por estado físico para la valuación (paso 07 §10.1). */
export const factorEstado = sqliteTable(
  'factor_estado',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    estado: enumCatalogo('estado', ESTADO_ACTUAL).notNull(),
    factor: x10k('factor').notNull(),
  },
  (t) => [
    uniqueIndex('ux_factor_estado').on(t.entidadId, t.estado),
    chkCatalogo('chk_factor_estado', t.estado, ESTADO_ACTUAL),
  ],
);
