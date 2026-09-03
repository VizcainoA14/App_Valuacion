/** Paso 11 — Entrega y cierre (paso 11 §10.1; plan 2.4 §6 sello de integridad). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  fecha,
  marcaTiempo,
  booleano,
  json,
  creadoEn,
  chkBooleano,
} from './_columnas';
import { ejercicio, responsable } from './configuracion';

export const productoContractual = sqliteTable(
  'producto_contractual',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    codigoProducto: texto('codigo_producto').notNull(),
    nombre: texto('nombre').notNull(),
    pasoOrigen: entero('paso_origen').notNull(),
    formatoRequerido: texto('formato_requerido').notNull(),
    estado: texto('estado').notNull(),
    entregableUrl: texto('entregable_url'),
    fechaEntrega: fecha('fecha_entrega'),
    verificadoPorResponsableId: uuid('verificado_por_responsable_id').references(
      () => responsable.id,
      { onDelete: 'set null' },
    ),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex('ux_producto_codigo').on(t.ejercicioId, t.codigoProducto)],
);

export const capacitacion = sqliteTable(
  'capacitacion',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    sesion: entero('sesion').notNull(),
    tema: texto('tema').notNull(),
    fecha: fecha('fecha').notNull(),
    duracionMinutos: entero('duracion_minutos').notNull(),
    dirigidoA: texto('dirigido_a').notNull(),
    contenido: texto('contenido'),
    metodologia: texto('metodologia'),
    materialUrl: texto('material_url'),
    listaAsistenciaUrl: texto('lista_asistencia_url'),
    resultadoEvaluacion: texto('resultado_evaluacion'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_capacitacion_ejercicio').on(t.ejercicioId, t.sesion)],
);

export const actaEntrega = sqliteTable(
  'acta_entrega',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    numeroContrato: texto('numero_contrato').notNull(),
    fecha: fecha('fecha').notNull(),
    productosJson: json('productos_json').notNull(),
    documentoUrl: texto('documento_url'),
    estadoFirma: texto('estado_firma').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_acta_entrega_ejercicio').on(t.ejercicioId)],
);

/** Sello del cierre: hash canónico del contenido (INT-09, ADR-017). */
export const cierreEjercicio = sqliteTable(
  'cierre_ejercicio',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    fechaCierre: marcaTiempo('fecha_cierre').notNull(),
    cerradoPorResponsableId: uuid('cerrado_por_responsable_id')
      .notNull()
      .references(() => responsable.id, { onDelete: 'restrict' }),
    actaLiquidacionUrl: texto('acta_liquidacion_url'),
    observaciones: texto('observaciones'),
    hashContenido: texto('hash_contenido').notNull(),
    versionApp: texto('version_app').notNull(),
    versionEsquema: entero('version_esquema').notNull(),
    inmutable: booleano('inmutable').notNull().default(true),
  },
  (t) => [
    uniqueIndex('ux_cierre_ejercicio').on(t.ejercicioId),
    chkBooleano('chk_cierre_inmutable', t.inmutable),
  ],
);
