/** MOD-07/08 — Resultados persistidos del motor (ANEXO_B §4.2, §4.3; pasos 05 y 06). */
import { sql } from 'drizzle-orm';
import { index, uniqueIndex, check, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  centavos,
  x10k,
  fecha,
  marcaTiempo,
  booleano,
  enumCatalogo,
  creadoEn,
  chkCatalogo,
  chkBooleano,
  chkNoNegativo,
} from './_columnas';
import { SEMAFORO, INDICIO_DETERIORO } from '../../../../compartido/enums/catalogos';
import { METODO_CONTEO_MESES } from '../../../../compartido/enums/parametros';
import { ejercicio, responsable } from './configuracion';
import { bien } from './inventario';

export const calculoObsolescencia = sqliteTable(
  'calculo_obsolescencia',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    fechaCorte: fecha('fecha_corte').notNull(),
    vidaUtilTecnicaAplicada: x10k('vida_util_tecnica_aplicada').notNull(),
    edadActualAnios: x10k('edad_actual_anios').notNull(),
    /** Sin truncar en 1 (RN-05-02). */
    indiceObsolescencia: x10k('indice_obsolescencia').notNull(),
    aniosRestantes: x10k('anios_restantes').notNull(),
    fechaFinVidaUtil: fecha('fecha_fin_vida_util').notNull(),
    semaforo: enumCatalogo('semaforo', SEMAFORO).notNull(),
    obsolescenciaFuncional: booleano('obsolescencia_funcional').notNull().default(false),
    justificacionFuncional: texto('justificacion_funcional'),
    candidatoBaja: booleano('candidato_baja').notNull().default(false),
    conceptoEspecialista: texto('concepto_especialista'),
    /** Recalcular si cambia (plan 2.6 §9). */
    entradaHash: texto('entrada_hash').notNull(),
    parametrosHash: texto('parametros_hash').notNull(),
    calculadoEn: marcaTiempo('calculado_en').notNull(),
    calculadoPorResponsableId: uuid('calculado_por_responsable_id').references(
      () => responsable.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [
    uniqueIndex('ux_calc_obs_bien').on(t.ejercicioId, t.bienId),
    index('ix_calc_obs_semaforo').on(t.ejercicioId, t.semaforo),
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
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    fechaCorte: fecha('fecha_corte').notNull(),
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
    deterioro: centavos('deterioro').notNull().default(0),
    saldoPorDepreciar: centavos('saldo_por_depreciar').notNull(),
    valorNetoLibros: centavos('valor_neto_libros').notNull(),
    totalmenteDepreciado: booleano('totalmente_depreciado').notNull().default(false),
    entradaHash: texto('entrada_hash').notNull(),
    parametrosHash: texto('parametros_hash').notNull(),
    calculadoEn: marcaTiempo('calculado_en').notNull(),
  },
  (t) => [
    uniqueIndex('ux_calc_dep_bien').on(t.ejercicioId, t.bienId),
    chkCatalogo('chk_dep_metodo', t.metodoConteoAplicado, METODO_CONTEO_MESES),
    chkBooleano('chk_dep_total', t.totalmenteDepreciado),
    // INT-05
    check('chk_dep_tope', sql`${t.depreciacionAcumulada} <= ${t.baseDepreciable}`),
    check('chk_dep_vida_util', sql`${t.vidaUtilMeses} > 0`),
    chkNoNegativo('chk_dep_saldo', t.saldoPorDepreciar),
    chkNoNegativo('chk_dep_deterioro', t.deterioro),
  ],
);

export const deterioro = sqliteTable(
  'deterioro',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    valorNetoAntes: centavos('valor_neto_antes').notNull(),
    valorRecuperable: centavos('valor_recuperable').notNull(),
    deterioroReconocido: centavos('deterioro_reconocido').notNull(),
    indicio: enumCatalogo('indicio', INDICIO_DETERIORO).notNull(),
    justificacion: texto('justificacion').notNull(),
    especialistaId: uuid('especialista_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    soporteUrl: texto('soporte_url'),
    reconocidoEn: marcaTiempo('reconocido_en').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex('ux_deterioro_bien').on(t.ejercicioId, t.bienId),
    chkCatalogo('chk_deterioro_indicio', t.indicio, INDICIO_DETERIORO),
    chkNoNegativo('chk_deterioro_valor', t.deterioroReconocido),
  ],
);
