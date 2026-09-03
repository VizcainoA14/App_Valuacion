/** MOD-09 — Valuación de muebles (ANEXO_B §4.4; paso 07 §10.1). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  centavos,
  x10k,
  fecha,
  marcaTiempo,
  enumCatalogo,
  creadoEn,
  chkCatalogo,
  chkNoNegativo,
} from './_columnas';
import { METODO_VALUACION, TIPO_AJUSTE } from '../../../../compartido/enums/catalogos';
import { ESTADO_APROBACION_VALUACION } from '../../../../compartido/enums/estados';
import { ejercicio, responsable } from './configuracion';
import { bien } from './inventario';

export const valuacionMueble = sqliteTable(
  'valuacion_mueble',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    metodoValuacion: enumCatalogo('metodo_valuacion', METODO_VALUACION).notNull(),
    valorEquipoNuevoEquivalente: centavos('valor_equipo_nuevo_equivalente'),
    factorEstado: x10k('factor_estado'),
    factorVidaRestante: x10k('factor_vida_restante'),
    valorAvaluoCalculado: centavos('valor_avaluo_calculado'),
    valorAvaluoFinal: centavos('valor_avaluo_final').notNull(),
    /** Contra `valor_neto_libros` por defecto (CT-03). */
    diferenciaVsLibros: centavos('diferencia_vs_libros').notNull(),
    tipoAjuste: enumCatalogo('tipo_ajuste', TIPO_AJUSTE).notNull(),
    justificacionTecnica: texto('justificacion_tecnica').notNull(),
    especialistaId: uuid('especialista_id')
      .notNull()
      .references(() => responsable.id, { onDelete: 'restrict' }),
    fechaValuacion: marcaTiempo('fecha_valuacion').notNull(),
    soporteMercadoUrl: texto('soporte_mercado_url'),
    estadoAprobacion: enumCatalogo('estado_aprobacion', ESTADO_APROBACION_VALUACION)
      .notNull()
      .default('PENDIENTE'),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex('ux_valuacion_bien').on(t.ejercicioId, t.bienId),
    index('ix_valuacion_especialista').on(t.ejercicioId, t.especialistaId),
    chkCatalogo('chk_val_metodo', t.metodoValuacion, METODO_VALUACION),
    chkCatalogo('chk_val_ajuste', t.tipoAjuste, TIPO_AJUSTE),
    chkCatalogo('chk_val_aprobacion', t.estadoAprobacion, ESTADO_APROBACION_VALUACION),
    // INT-06
    chkNoNegativo('chk_val_final', t.valorAvaluoFinal),
  ],
);

export const referenciaMercado = sqliteTable(
  'referencia_mercado',
  {
    id: uuidPk(),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    familiaEquipo: texto('familia_equipo').notNull(),
    especificacion: texto('especificacion'),
    proveedor: texto('proveedor').notNull(),
    valorCotizado: centavos('valor_cotizado').notNull(),
    fechaCotizacion: fecha('fecha_cotizacion').notNull(),
    /** 12 meses por defecto (T-E-04). */
    vigenciaHasta: fecha('vigencia_hasta').notNull(),
    soporteUrl: texto('soporte_url'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_referencia_familia').on(t.ejercicioId, t.familiaEquipo)],
);
