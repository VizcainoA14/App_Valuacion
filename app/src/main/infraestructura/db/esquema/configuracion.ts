/** MOD-02 — El proceso y su configuración (ANEXO_B §2; paso 01 §10.1; ADR-029). */
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
import { TIPO_DATO_PARAMETRO } from '../../../../compartido/enums/parametros';
import { NIVEL_COMPLEJIDAD, TIPO_SERVICIO } from '../../../../compartido/enums/plataforma';
import { ESTADO_PROCESO } from '../../../../compartido/enums/estados';

/**
 * ADR-029 — El proceso de valuación es la unidad de trabajo, y es independiente:
 * lleva sus propios datos del hospital, catálogos, parámetros, inventario,
 * cálculo, bajas e informe. Nada pasa de un proceso a otro. Por eso el NIT no es
 * único: el mismo hospital hace un proceso cada vez que valora.
 */
export const proceso = sqliteTable(
  'proceso',
  {
    id: uuidPk(),
    /** Cómo lo reconoce quien lo usa, p. ej. "Valuación cierre 2025". */
    nombre: texto('nombre').notNull(),
    /** La fecha a la que se calcula. Una por proceso. */
    fechaCorte: fecha('fecha_corte').notNull(),
    estado: enumCatalogo('estado', ESTADO_PROCESO).notNull().default('EN_CURSO'),
    finalizadoEn: marcaTiempo('finalizado_en'),
    // ── Datos del hospital ──
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
    /** Proceso de demostración (T-B-11): banda visible y borrado de un clic. */
    esDemostracion: booleano('es_demostracion').notNull().default(false),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_proceso_estado').on(t.estado, t.creadoEn),
    chkCatalogo('chk_proceso_estado', t.estado, ESTADO_PROCESO),
    chkCatalogo('chk_proceso_nivel', t.nivelComplejidad, NIVEL_COMPLEJIDAD),
    chkBooleano('chk_proceso_demo', t.esDemostracion),
  ],
);

export const sede = sqliteTable(
  'sede',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    codigo: texto('codigo').notNull(),
    nombre: texto('nombre').notNull(),
    direccion: texto('direccion').notNull(),
    municipio: texto('municipio').notNull(),
    activa: booleano('activa').notNull().default(true),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_sede_codigo').on(t.procesoId, t.codigo),
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
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
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
    uniqueIndex('ux_clase_codigo').on(t.procesoId, t.codigo),
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
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    clave: texto('clave').notNull(),
    /** Serializado como texto; el tipo real lo dice `tipo_dato`. */
    valor: texto('valor').notNull(),
    tipoDato: enumCatalogo('tipo_dato', TIPO_DATO_PARAMETRO).notNull(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_parametro_clave').on(t.procesoId, t.clave),
    chkCatalogo('chk_parametro_tipo', t.tipoDato, TIPO_DATO_PARAMETRO),
  ],
);

export const convencionCodigo = sqliteTable(
  'convencion_codigo',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    segmentosJson: json('segmentos_json').notNull(),
    longitudConsecutivo: entero('longitud_consecutivo').notNull(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [uniqueIndex('ux_convencion_proceso').on(t.procesoId)],
);

export const abreviaturaTipo = sqliteTable(
  'abreviatura_tipo',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    abreviatura: texto('abreviatura').notNull(),
    descripcion: texto('descripcion').notNull(),
  },
  (t) => [uniqueIndex('ux_abreviatura').on(t.procesoId, t.abreviatura)],
);
