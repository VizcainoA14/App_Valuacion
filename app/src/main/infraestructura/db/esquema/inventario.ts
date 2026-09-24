/**
 * MOD-03 — Inventario vivo (ANEXO_B §3; paso 02 §10.1; ADR-028).
 *
 * El bien es de la ENTIDAD, no de un ejercicio: se registra una vez y cada
 * barrido (una importación de PL-03) lo encuentra, lo actualiza o lo echa de
 * menos. Así el hospital puede volver a valorar cuando quiera sin reimportar
 * todo desde cero.
 */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  fecha,
  booleano,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
  chkBooleano,
  chkNoNegativo,
} from './_columnas';
import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/sqlite-core';
import { ESTADO_ACTUAL, CONDICION_TENENCIA } from '../../../../compartido/enums/catalogos';
import { ESTADO_BIEN } from '../../../../compartido/enums/estados';
import { proceso, claseActivo, sede, servicio } from './configuracion';

/**
 * Un barrido: la foto de lo que había en los servicios que se recorrieron.
 * Se guarda para saber de dónde salió cada dato y cuándo se vio cada bien.
 */
export const barrido = sqliteTable(
  'barrido',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'cascade' }),
    /** La toma más reciente que trae el archivo. */
    fecha: fecha('fecha').notNull(),
    archivo: texto('archivo').notNull(),
    /** Ruta relativa al almacén donde quedó la copia del libro importado. */
    archivoConservado: texto('archivo_conservado').notNull(),
    hashSha256: texto('hash_sha256').notNull(),
    bienesNuevos: entero('bienes_nuevos').notNull(),
    bienesActualizados: entero('bienes_actualizados').notNull(),
    bienesNoEncontrados: entero('bienes_no_encontrados').notNull(),
    serviciosRecorridos: entero('servicios_recorridos').notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [
    index('ix_barrido_proceso').on(t.procesoId, t.fecha),
    chkNoNegativo('chk_barrido_nuevos', t.bienesNuevos),
    chkNoNegativo('chk_barrido_actualizados', t.bienesActualizados),
    chkNoNegativo('chk_barrido_no_encontrados', t.bienesNoEncontrados),
  ],
);

export const bien = sqliteTable(
  'bien',
  {
    id: uuidPk(),
    procesoId: uuid('proceso_id')
      .notNull()
      .references(() => proceso.id, { onDelete: 'restrict' }),
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
    /** Cuándo se contó por última vez. */
    fechaToma: fecha('fecha_toma').notNull(),
    funcionarioConteo: texto('funcionario_conteo').notNull(),
    observaciones: texto('observaciones'),
    estadoRegistro: enumCatalogo('estado_registro', ESTADO_BIEN).notNull().default('ACTIVO'),
    /** El último barrido que lo encontró. */
    ultimoBarridoId: uuid('ultimo_barrido_id').references(() => barrido.id, { onDelete: 'set null' }),
    /**
     * RN-05-03: juicio del hospital, no salida del motor. Vive en el bien —no en
     * un corte— para que pese en todos los cálculos que vengan.
     */
    obsolescenciaFuncional: booleano('obsolescencia_funcional').notNull().default(false),
    justificacionFuncional: texto('justificacion_funcional'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // INT-01, dentro de la entidad
    uniqueIndex('ux_bien_codigo').on(t.procesoId, t.codigoInstitucional),
    uniqueIndex('ux_bien_placa').on(t.procesoId, t.placa),
    index('ix_bien_clase').on(t.procesoId, t.claseActivoId),
    index('ix_bien_servicio').on(t.procesoId, t.servicioId),
    index('ix_bien_serie').on(t.serie),
    index('ix_bien_estado').on(t.procesoId, t.estadoRegistro),
    chkCatalogo('chk_bien_estado_actual', t.estadoActual, ESTADO_ACTUAL),
    chkCatalogo('chk_bien_tenencia', t.condicionTenencia, CONDICION_TENENCIA),
    chkCatalogo('chk_bien_estado_registro', t.estadoRegistro, ESTADO_BIEN),
    chkBooleano('chk_bien_funcional', t.obsolescenciaFuncional),
    check('chk_bien_cantidad', sql`${t.cantidad} >= 1`),
  ],
);
