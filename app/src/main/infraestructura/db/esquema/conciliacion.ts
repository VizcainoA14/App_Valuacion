/** MOD-05 — Conciliación físico-contable (paso 04 §10.1). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  centavos,
  fecha,
  marcaTiempo,
  enumCatalogo,
  creadoEn,
  chkCatalogo,
} from './_columnas';
import { TIPO_DIFERENCIA, ACCION_PROPUESTA } from '../../../../compartido/enums/catalogos';
import { ejercicio } from './configuracion';
import { bien } from './inventario';

export const saldoContable = sqliteTable(
  'saldo_contable',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    subcuenta: texto('subcuenta').notNull(),
    nombreSubcuenta: texto('nombre_subcuenta').notNull(),
    saldoInicial: centavos('saldo_inicial').notNull(),
    movimientosDebito: centavos('movimientos_debito').notNull().default(0),
    movimientosCredito: centavos('movimientos_credito').notNull().default(0),
    saldoLibrosCorte: centavos('saldo_libros_corte').notNull(),
    depreciacionAcumLibros: centavos('depreciacion_acum_libros').notNull().default(0),
    deterioroLibros: centavos('deterioro_libros').notNull().default(0),
    importadoEn: marcaTiempo('importado_en').notNull(),
  },
  (t) => [uniqueIndex('ux_saldo_subcuenta').on(t.ejercicioId, t.subcuenta)],
);

export const activoContable = sqliteTable(
  'activo_contable',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    identificadorContable: texto('identificador_contable').notNull(),
    descripcionContable: texto('descripcion_contable').notNull(),
    subcuenta: texto('subcuenta').notNull(),
    fechaAdquisicionLibros: fecha('fecha_adquisicion_libros'),
    valorLibros: centavos('valor_libros').notNull(),
    depreciacionAcumLibros: centavos('depreciacion_acum_libros').notNull().default(0),
    bienIdEmparejado: uuid('bien_id_emparejado').references(() => bien.id, {
      onDelete: 'set null',
    }),
    /** Nivel de la jerarquía RN-04-01 con que se emparejó. */
    metodoEmparejamiento: texto('metodo_emparejamiento'),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex('ux_activo_contable_id').on(t.ejercicioId, t.identificadorContable),
    index('ix_activo_contable_bien').on(t.bienIdEmparejado),
    index('ix_activo_contable_subcuenta').on(t.ejercicioId, t.subcuenta),
  ],
);

export const partidaConciliatoria = sqliteTable(
  'partida_conciliatoria',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id').references(() => bien.id, { onDelete: 'restrict' }),
    activoContableId: uuid('activo_contable_id').references(() => activoContable.id, {
      onDelete: 'restrict',
    }),
    tipoDiferencia: enumCatalogo('tipo_diferencia', TIPO_DIFERENCIA).notNull(),
    valorInvolucrado: centavos('valor_involucrado').notNull(),
    causaProbable: texto('causa_probable'),
    accionPropuesta: enumCatalogo('accion_propuesta', ACCION_PROPUESTA).notNull(),
    soporteUrl: texto('soporte_url'),
    estado: texto('estado').notNull(),
    resueltaEn: marcaTiempo('resuelta_en'),
    creadoEn: creadoEn(),
  },
  (t) => [
    index('ix_partida_ejercicio').on(t.ejercicioId, t.tipoDiferencia),
    chkCatalogo('chk_partida_tipo', t.tipoDiferencia, TIPO_DIFERENCIA),
    chkCatalogo('chk_partida_accion', t.accionPropuesta, ACCION_PROPUESTA),
  ],
);

export const conciliacion = sqliteTable(
  'conciliacion',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    subcuenta: texto('subcuenta').notNull(),
    cantidadLibros: entero('cantidad_libros').notNull(),
    cantidadFisico: entero('cantidad_fisico').notNull(),
    valorLibros: centavos('valor_libros').notNull(),
    valorFisico: centavos('valor_fisico').notNull(),
    diferenciaValor: centavos('diferencia_valor').notNull(),
    depreciacionLibros: centavos('depreciacion_libros').notNull(),
    depreciacionRecalculada: centavos('depreciacion_recalculada').notNull(),
    calculadoEn: marcaTiempo('calculado_en').notNull(),
  },
  (t) => [uniqueIndex('ux_conciliacion_subcuenta').on(t.ejercicioId, t.subcuenta)],
);
