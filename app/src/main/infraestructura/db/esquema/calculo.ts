/**
 * MOD-07/08 — Cortes de cálculo y sus resultados (ANEXO_B §4.2, §4.3; ADR-028).
 *
 * Un corte es la corrida del motor de un proceso, a su fecha. Guarda los
 * parámetros que usó y, bien por bien, lo que calculó y lo que no pudo
 * calcular. No se modifica —un trigger lo impide—: recalcular lo reemplaza
 * entero, y con el proceso finalizado ya no se puede (ADR-029).
 */
import { sql } from 'drizzle-orm';
import { index, uniqueIndex, check, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  centavos,
  x10k,
  fecha,
  json,
  booleano,
  enumCatalogo,
  creadoEn,
  chkCatalogo,
  chkBooleano,
  chkNoNegativo,
} from './_columnas';
import { SEMAFORO } from '../../../../compartido/enums/catalogos';
import { METODO_CONTEO_MESES } from '../../../../compartido/enums/parametros';
import { proceso } from './configuracion';
import { bien } from './inventario';

export const corte = sqliteTable(
  'corte',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    /** Parámetro central de todo el cálculo. */
    fechaCorte: fecha('fecha_corte').notNull(),
    /** Copia de los parámetros vigentes al calcular (RN-01-01). */
    parametrosJson: json('parametros_json').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex('ux_corte_proceso').on(t.procesoId)],
);

export const calculoObsolescencia = sqliteTable(
  'calculo_obsolescencia',
  {
    id: uuidPk(),
    corteId: uuid('corte_id')
      .notNull()
      .references(() => corte.id, { onDelete: 'cascade' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    vidaUtilTecnicaAplicada: x10k('vida_util_tecnica_aplicada').notNull(),
    edadActualAnios: x10k('edad_actual_anios').notNull(),
    /** Sin truncar en 1 (RN-05-02). */
    indiceObsolescencia: x10k('indice_obsolescencia').notNull(),
    aniosRestantes: x10k('anios_restantes').notNull(),
    fechaFinVidaUtil: fecha('fecha_fin_vida_util').notNull(),
    semaforo: enumCatalogo('semaforo', SEMAFORO).notNull(),
    /** Lo que el hospital había declarado del bien al momento del corte. */
    obsolescenciaFuncional: booleano('obsolescencia_funcional').notNull().default(false),
    candidatoBaja: booleano('candidato_baja').notNull().default(false),
    /** Por qué el motor lo señaló (ANEXO_C §2.7), tal como se dijo ese día. JSON: string[]. */
    motivosBaja: json('motivos_baja'),
  },
  (t) => [
    uniqueIndex('ux_calc_obs_bien').on(t.corteId, t.bienId),
    index('ix_calc_obs_semaforo').on(t.corteId, t.semaforo),
    chkCatalogo('chk_obs_semaforo', t.semaforo, SEMAFORO),
    chkBooleano('chk_obs_funcional', t.obsolescenciaFuncional),
    chkBooleano('chk_obs_candidato', t.candidatoBaja),
    chkNoNegativo('chk_obs_indice', t.indiceObsolescencia),
  ],
);

export const calculoDepreciacion = sqliteTable(
  'calculo_depreciacion',
  {
    id: uuidPk(),
    corteId: uuid('corte_id')
      .notNull()
      .references(() => corte.id, { onDelete: 'cascade' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    valorAdquisicion: centavos('valor_adquisicion').notNull(),
    adicionesMejoras: centavos('adiciones_mejoras').notNull().default(0),
    saldoFinalAjustado: centavos('saldo_final_ajustado').notNull(),
    valorResidual: centavos('valor_residual').notNull().default(0),
    baseDepreciable: centavos('base_depreciable').notNull(),
    fechaInicioDepreciacion: fecha('fecha_inicio_depreciacion').notNull(),
    vidaUtilMeses: entero('vida_util_meses').notNull(),
    /** decimal(18,4) en ANEXO_B: pesos ×10.000, no centavos. */
    depreciacionMensual: x10k('depreciacion_mensual').notNull(),
    mesesTranscurridos: x10k('meses_transcurridos').notNull(),
    /** Se persiste en cada fila para auditar aunque el parámetro cambie. */
    metodoConteoAplicado: enumCatalogo('metodo_conteo_aplicado', METODO_CONTEO_MESES).notNull(),
    depreciacionAcumulada: centavos('depreciacion_acumulada').notNull(),
    /** La aplicación no reconoce deterioro (exige indicios y avalúo): queda en 0 y el informe lo dice. */
    deterioro: centavos('deterioro').notNull().default(0),
    saldoPorDepreciar: centavos('saldo_por_depreciar').notNull(),
    valorNetoLibros: centavos('valor_neto_libros').notNull(),
    totalmenteDepreciado: booleano('totalmente_depreciado').notNull().default(false),
  },
  (t) => [
    uniqueIndex('ux_calc_dep_bien').on(t.corteId, t.bienId),
    chkCatalogo('chk_dep_metodo', t.metodoConteoAplicado, METODO_CONTEO_MESES),
    chkBooleano('chk_dep_total', t.totalmenteDepreciado),
    // INT-05
    check('chk_dep_tope', sql`${t.depreciacionAcumulada} <= ${t.baseDepreciable}`),
    check('chk_dep_vida_util', sql`${t.vidaUtilMeses} > 0`),
    chkNoNegativo('chk_dep_saldo', t.saldoPorDepreciar),
    chkNoNegativo('chk_dep_deterioro', t.deterioro),
  ],
);

/**
 * Regla 11: lo que no se pudo calcular no es un cero. Se guarda con su motivo
 * para que el informe de ESTE corte lo relacione aunque después el bien cambie.
 */
export const calculoExclusion = sqliteTable(
  'calculo_exclusion',
  {
    id: uuidPk(),
    corteId: uuid('corte_id')
      .notNull()
      .references(() => corte.id, { onDelete: 'cascade' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    ambito: text('ambito', { enum: ['GENERAL', 'OBSOLESCENCIA', 'DEPRECIACION'] }).notNull(),
    estado: text('estado', { enum: ['NO_APLICA', 'NO_CALCULABLE', 'ERROR_DATOS'] }).notNull(),
    motivo: texto('motivo').notNull(),
  },
  (t) => [
    index('ix_calc_exclusion').on(t.corteId, t.bienId),
    check('chk_exclusion_ambito', sql`${t.ambito} IN ('GENERAL', 'OBSOLESCENCIA', 'DEPRECIACION')`),
    check('chk_exclusion_estado', sql`${t.estado} IN ('NO_APLICA', 'NO_CALCULABLE', 'ERROR_DATOS')`),
  ],
);
