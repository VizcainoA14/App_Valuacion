/** TR-06 — Bitácora (ANEXO_B §7.1, corregida por C-09: responsable en vez de usuario, origen en vez de ip). */
import { index, sqliteTable } from 'drizzle-orm/sqlite-core';
import { uuidPk, uuid, texto, marcaTiempo, enumCatalogo, chkCatalogo } from './_columnas';
import { ACCION_BITACORA } from '../../../../compartido/enums/plataforma';
import { ejercicio, responsable } from './configuracion';

export const bitacora = sqliteTable(
  'bitacora',
  {
    id: uuidPk(),
    /** Nula para cambios de configuración que no pertenecen a un ejercicio (RF-01-08). */
    ejercicioId: uuid('ejercicio_id').references(() => ejercicio.id, { onDelete: 'restrict' }),
    entidadAfectada: texto('entidad_afectada').notNull(),
    registroId: texto('registro_id').notNull(),
    accion: enumCatalogo('accion', ACCION_BITACORA).notNull(),
    campo: texto('campo'),
    valorAnterior: texto('valor_anterior'),
    valorNuevo: texto('valor_nuevo'),
    /** Quien decidió, cuando la acción tiene responsable identificable. */
    responsableId: uuid('responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    fecha: marcaTiempo('fecha').notNull(),
    /** Nombre del equipo + usuario del sistema operativo. */
    origen: texto('origen').notNull(),
    /** Obligatoria en los 8 campos sensibles (trigger de T-B-09). */
    justificacion: texto('justificacion'),
  },
  (t) => [
    index('ix_bitacora_registro').on(t.entidadAfectada, t.registroId),
    index('ix_bitacora_ejercicio').on(t.ejercicioId, t.fecha),
    chkCatalogo('chk_bitacora_accion', t.accion, ACCION_BITACORA),
  ],
);
