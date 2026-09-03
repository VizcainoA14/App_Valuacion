/** MOD-03 — Inventario (ANEXO_B §3; paso 02 §10.1; paso 09 BienEnCustodia). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  fecha,
  marcaTiempo,
  booleano,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
} from './_columnas';
import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/sqlite-core';
import {
  ESTADO_ACTUAL,
  CONDICION_TENENCIA,
  ESTADO_REGISTRO,
} from '../../../../compartido/enums/catalogos';
import { ejercicio, claseActivo, sede, servicio, responsable } from './configuracion';

export const bien = sqliteTable(
  'bien',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    codigoInstitucional: texto('codigo_institucional').notNull(),
    placa: texto('placa').notNull(),
    descripcionFuncional: texto('descripcion_funcional').notNull(),
    claseActivoId: uuid('clase_activo_id')
      .notNull()
      .references(() => claseActivo.id, { onDelete: 'restrict' }),
    marca: texto('marca'),
    modelo: texto('modelo'),
    serie: texto('serie'),
    sedeId: uuid('sede_id')
      .notNull()
      .references(() => sede.id, { onDelete: 'restrict' }),
    servicioId: uuid('servicio_id')
      .notNull()
      .references(() => servicio.id, { onDelete: 'restrict' }),
    cantidad: entero('cantidad').notNull().default(1),
    estadoActual: enumCatalogo('estado_actual', ESTADO_ACTUAL).notNull(),
    condicionTenencia: enumCatalogo('condicion_tenencia', CONDICION_TENENCIA).notNull(),
    responsableCustodia: texto('responsable_custodia'),
    fechaToma: fecha('fecha_toma').notNull(),
    funcionarioConteo: texto('funcionario_conteo').notNull(),
    observaciones: texto('observaciones'),
    estadoRegistro: enumCatalogo('estado_registro', ESTADO_REGISTRO).notNull().default('BORRADOR'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // INT-01
    uniqueIndex('ux_bien_codigo').on(t.ejercicioId, t.codigoInstitucional),
    uniqueIndex('ux_bien_placa').on(t.ejercicioId, t.placa),
    index('ix_bien_clase').on(t.ejercicioId, t.claseActivoId),
    index('ix_bien_servicio').on(t.ejercicioId, t.servicioId),
    index('ix_bien_serie').on(t.serie),
    index('ix_bien_estado').on(t.ejercicioId, t.estadoRegistro),
    chkCatalogo('chk_bien_estado_actual', t.estadoActual, ESTADO_ACTUAL),
    chkCatalogo('chk_bien_tenencia', t.condicionTenencia, CONDICION_TENENCIA),
    chkCatalogo('chk_bien_estado_registro', t.estadoRegistro, ESTADO_REGISTRO),
    check('chk_bien_cantidad', sql`${t.cantidad} >= 1`),
  ],
);

export const fotoBien = sqliteTable(
  'foto_bien',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    /** Ruta relativa al almacén (CT-14). */
    url: texto('url').notNull(),
    tipo: texto('tipo').notNull(),
    hashSha256: texto('hash_sha256').notNull(),
    tomadaEn: marcaTiempo('tomada_en'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_foto_bien').on(t.bienId)],
);

export const movimientoBien = sqliteTable(
  'movimiento_bien',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    servicioOrigenId: uuid('servicio_origen_id')
      .notNull()
      .references(() => servicio.id, { onDelete: 'restrict' }),
    servicioDestinoId: uuid('servicio_destino_id')
      .notNull()
      .references(() => servicio.id, { onDelete: 'restrict' }),
    fecha: fecha('fecha').notNull(),
    motivo: texto('motivo').notNull(),
    /** `usuario_id` en /Teoria; sin login pasa a responsable opcional (C-09). */
    responsableId: uuid('responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_movimiento_bien').on(t.bienId, t.fecha)],
);

export const actaCustodia = sqliteTable(
  'acta_custodia',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    servicioId: uuid('servicio_id')
      .notNull()
      .references(() => servicio.id, { onDelete: 'restrict' }),
    /** Nombre del custodio que firma; texto libre como en /Teoria. */
    responsable: texto('responsable').notNull(),
    fecha: fecha('fecha').notNull(),
    documentoUrl: texto('documento_url'),
    estadoFirma: texto('estado_firma').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_acta_custodia').on(t.ejercicioId, t.servicioId)],
);

export const bienEnCustodia = sqliteTable(
  'bien_en_custodia',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    motivo: texto('motivo').notNull(),
    fechaIngresoCustodia: fecha('fecha_ingreso_custodia').notNull(),
    proximaRevision: fecha('proxima_revision'),
    estadoFuncional: texto('estado_funcional'),
    responsable: texto('responsable'),
    activo: booleano('activo').notNull().default(true),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_custodia_bien').on(t.ejercicioId, t.bienId)],
);
