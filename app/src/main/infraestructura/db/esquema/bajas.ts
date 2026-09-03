/** MOD-11 — Bajas (paso 09 §10.1). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  centavos,
  x10k,
  fecha,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
} from './_columnas';
import { CAUSAL_BAJA, DESTINO_FINAL } from '../../../../compartido/enums/catalogos';
import { ESTADO_PROPUESTA_BAJA } from '../../../../compartido/enums/estados';
import { ejercicio, responsable } from './configuracion';
import { bien } from './inventario';
import { actaComite, actoAdministrativo } from './consolidacion';

export const propuestaBaja = sqliteTable(
  'propuesta_baja',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    causal: enumCatalogo('causal', CAUSAL_BAJA).notNull(),
    /** Individual por bien, nunca genérica (RN-09-06). */
    justificacionTecnica: texto('justificacion_tecnica').notNull(),
    costoReparacionEstimado: centavos('costo_reparacion_estimado'),
    valorReposicion: centavos('valor_reposicion'),
    relacionReparacionReposicion: x10k('relacion_reparacion_reposicion'),
    valorSalvamento: centavos('valor_salvamento'),
    destinoFinalPropuesto: enumCatalogo('destino_final_propuesto', DESTINO_FINAL),
    soporteUrl: texto('soporte_url'),
    especialistaId: uuid('especialista_id')
      .notNull()
      .references(() => responsable.id, { onDelete: 'restrict' }),
    fechaPropuesta: fecha('fecha_propuesta').notNull(),
    estadoAprobacion: enumCatalogo('estado_aprobacion', ESTADO_PROPUESTA_BAJA)
      .notNull()
      .default('PROPUESTO'),
    /** INT-07: obligatoria en EJECUTADO (trigger). */
    actaComiteId: uuid('acta_comite_id').references(() => actaComite.id, { onDelete: 'restrict' }),
    resolucionId: uuid('resolucion_id').references(() => actoAdministrativo.id, {
      onDelete: 'restrict',
    }),
    observacionComite: texto('observacion_comite'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_propuesta_bien').on(t.ejercicioId, t.bienId),
    index('ix_propuesta_estado').on(t.ejercicioId, t.estadoAprobacion),
    chkCatalogo('chk_propuesta_causal', t.causal, CAUSAL_BAJA),
    chkCatalogo('chk_propuesta_destino', t.destinoFinalPropuesto, DESTINO_FINAL),
    chkCatalogo('chk_propuesta_estado', t.estadoAprobacion, ESTADO_PROPUESTA_BAJA),
  ],
);

export const disposicionFinal = sqliteTable(
  'disposicion_final',
  {
    id: uuidPk(),
    propuestaBajaId: uuid('propuesta_baja_id')
      .notNull()
      .references(() => propuestaBaja.id, { onDelete: 'restrict' }),
    destinoFinal: enumCatalogo('destino_final', DESTINO_FINAL).notNull(),
    fechaDisposicion: fecha('fecha_disposicion').notNull(),
    responsableEntrega: texto('responsable_entrega').notNull(),
    responsableRecibe: texto('responsable_recibe').notNull(),
    /** Obligatorio para RAEE y gestor ambiental (paso 09 §RN). */
    gestorAutorizado: texto('gestor_autorizado'),
    certificadoUrl: texto('certificado_url'),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex('ux_disposicion_propuesta').on(t.propuestaBajaId),
    chkCatalogo('chk_disposicion_destino', t.destinoFinal, DESTINO_FINAL),
  ],
);

export const efectoContableBaja = sqliteTable(
  'efecto_contable_baja',
  {
    id: uuidPk(),
    propuestaBajaId: uuid('propuesta_baja_id')
      .notNull()
      .references(() => propuestaBaja.id, { onDelete: 'restrict' }),
    valorBruto: centavos('valor_bruto').notNull(),
    depreciacionAsociada: centavos('depreciacion_asociada').notNull(),
    deterioroAsociado: centavos('deterioro_asociado').notNull().default(0),
    valorNeto: centavos('valor_neto').notNull(),
    valorRecuperado: centavos('valor_recuperado').notNull().default(0),
    perdidaReconocida: centavos('perdida_reconocida').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex('ux_efecto_propuesta').on(t.propuestaBajaId)],
);
