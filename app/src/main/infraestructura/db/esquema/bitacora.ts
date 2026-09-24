/** TR-06 — Bitácora (ANEXO_B §7.1, corregida por C-09: origen en vez de ip; ADR-028: sin ejercicio ni responsable). */
import { index, sqliteTable } from 'drizzle-orm/sqlite-core';
import { uuidPk, texto, marcaTiempo, enumCatalogo, chkCatalogo } from './_columnas';
import { ACCION_BITACORA } from '../../../../compartido/enums/plataforma';

export const bitacora = sqliteTable(
  'bitacora',
  {
    id: uuidPk(),
    entidadAfectada: texto('entidad_afectada').notNull(),
    registroId: texto('registro_id').notNull(),
    accion: enumCatalogo('accion', ACCION_BITACORA).notNull(),
    campo: texto('campo'),
    valorAnterior: texto('valor_anterior'),
    valorNuevo: texto('valor_nuevo'),
    fecha: marcaTiempo('fecha').notNull(),
    /** Nombre del equipo + usuario del sistema operativo. */
    origen: texto('origen').notNull(),
    /** Obligatoria en los campos sensibles (trigger). */
    justificacion: texto('justificacion'),
  },
  (t) => [
    index('ix_bitacora_registro').on(t.entidadAfectada, t.registroId),
    index('ix_bitacora_fecha').on(t.fecha),
    chkCatalogo('chk_bitacora_accion', t.accion, ACCION_BITACORA),
  ],
);
