/**
 * MOD-11 — Registro de bajas (paso 09; ADR-028).
 *
 * La baja la decide el hospital por su propio trámite; la aplicación solo la
 * anota para que el bien salga de los cálculos siguientes y el informe la
 * relacione. Una baja registrada por error no se borra: se anula, con motivo.
 */
import { sql } from 'drizzle-orm';
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import { uuidPk, uuid, texto, fecha, marcaTiempo, enumCatalogo, creadoEn, chkCatalogo } from './_columnas';
import { CAUSAL_BAJA } from '../../../../compartido/enums/catalogos';
import { bien } from './inventario';

export const baja = sqliteTable(
  'baja',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    fecha: fecha('fecha').notNull(),
    causal: enumCatalogo('causal', CAUSAL_BAJA).notNull(),
    /** Individual por bien, nunca genérica (RN-09-06). */
    justificacion: texto('justificacion').notNull(),
    /** Número del acto o del acta con que el hospital la aprobó; opcional. */
    referencia: texto('referencia'),
    creadoEn: creadoEn(),
    anuladaEn: marcaTiempo('anulada_en'),
    motivoAnulacion: texto('motivo_anulacion'),
  },
  (t) => [
    index('ix_baja_bien').on(t.bienId),
    // Un bien tiene a lo sumo una baja vigente.
    uniqueIndex('ux_baja_vigente').on(t.bienId).where(sql`${t.anuladaEn} IS NULL`),
    chkCatalogo('chk_baja_causal', t.causal, CAUSAL_BAJA),
  ],
);
