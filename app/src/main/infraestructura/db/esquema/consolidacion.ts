/** MOD-11 — Consolidación, Comité y actos administrativos (paso 10 §10.1). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  centavos,
  fecha,
  marcaTiempo,
  booleano,
  json,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
  chkBooleano,
} from './_columnas';
import { ESTADO_ACTO_ADMINISTRATIVO } from '../../../../compartido/enums/estados';
import { ejercicio, responsable } from './configuracion';

export const consolidadoSubcuenta = sqliteTable(
  'consolidado_subcuenta',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    subcuenta: texto('subcuenta').notNull(),
    nombreSubcuenta: texto('nombre_subcuenta').notNull(),
    saldoAnterior: centavos('saldo_anterior').notNull(),
    incorporaciones: centavos('incorporaciones').notNull().default(0),
    retirosPorBaja: centavos('retiros_por_baja').notNull().default(0),
    /** Exclusión mutua con valorizaciones/desvalorizaciones (CT-11). */
    ajustesDeValor: centavos('ajustes_de_valor').notNull().default(0),
    valorizaciones: centavos('valorizaciones').notNull().default(0),
    desvalorizaciones: centavos('desvalorizaciones').notNull().default(0),
    nuevoSaldoBruto: centavos('nuevo_saldo_bruto').notNull(),
    depreciacionAcumAnterior: centavos('depreciacion_acum_anterior').notNull(),
    ajusteDepreciacion: centavos('ajuste_depreciacion').notNull().default(0),
    depreciacionRetiradaBaja: centavos('depreciacion_retirada_baja').notNull().default(0),
    nuevaDepreciacionAcumulada: centavos('nueva_depreciacion_acumulada').notNull(),
    deterioroAnterior: centavos('deterioro_anterior').notNull().default(0),
    nuevoDeterioro: centavos('nuevo_deterioro').notNull().default(0),
    valorNetoFinal: centavos('valor_neto_final').notNull(),
    cantidadBienes: entero('cantidad_bienes').notNull(),
    calculadoEn: marcaTiempo('calculado_en').notNull(),
  },
  (t) => [uniqueIndex('ux_consolidado_subcuenta').on(t.ejercicioId, t.subcuenta)],
);

export const verificacionCuadre = sqliteTable(
  'verificacion_cuadre',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    subcuenta: texto('subcuenta').notNull(),
    totalDetalle: centavos('total_detalle').notNull(),
    totalAuxiliar: centavos('total_auxiliar').notNull(),
    totalMayor: centavos('total_mayor').notNull(),
    cuadra: booleano('cuadra').notNull(),
    diferencia: centavos('diferencia').notNull(),
    verificadoEn: marcaTiempo('verificado_en').notNull(),
  },
  (t) => [
    index('ix_cuadre_ejercicio').on(t.ejercicioId, t.subcuenta),
    chkBooleano('chk_cuadre_cuadra', t.cuadra),
  ],
);

export const actaComite = sqliteTable(
  'acta_comite',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    numeroActa: texto('numero_acta').notNull(),
    fecha: fecha('fecha').notNull(),
    lugar: texto('lugar').notNull(),
    asistentesJson: json('asistentes_json').notNull(),
    quorumValido: booleano('quorum_valido').notNull(),
    ordenDelDia: texto('orden_del_dia').notNull(),
    decisiones: texto('decisiones').notNull(),
    documentoUrl: texto('documento_url'),
    estadoFirma: texto('estado_firma').notNull(),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_acta_numero').on(t.ejercicioId, t.numeroActa),
    chkBooleano('chk_acta_quorum', t.quorumValido),
  ],
);

export const actoAdministrativo = sqliteTable(
  'acto_administrativo',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    tipoResolucion: texto('tipo_resolucion').notNull(),
    numero: texto('numero'),
    fecha: fecha('fecha'),
    epigrafe: texto('epigrafe').notNull(),
    /** INT-08: obligatoria al firmar (trigger). */
    actaComiteId: uuid('acta_comite_id').references(() => actaComite.id, { onDelete: 'restrict' }),
    contenidoGenerado: texto('contenido_generado'),
    documentoUrl: texto('documento_url'),
    estado: enumCatalogo('estado', ESTADO_ACTO_ADMINISTRATIVO).notNull().default('PROYECTADO'),
    preparoResponsableId: uuid('preparo_responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    revisoResponsableId: uuid('reviso_responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    firmoResponsableId: uuid('firmo_responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    fechaFirma: marcaTiempo('fecha_firma'),
    inmutable: booleano('inmutable').notNull().default(false),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_acto_ejercicio').on(t.ejercicioId, t.estado),
    chkCatalogo('chk_acto_estado', t.estado, ESTADO_ACTO_ADMINISTRATIVO),
    chkBooleano('chk_acto_inmutable', t.inmutable),
  ],
);
