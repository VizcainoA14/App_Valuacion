/** MOD-04 — Hojas de vida (ANEXO_B §4.1; paso 03 §10.1; paso 05 OverrideVidaUtil). */
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
  actualizadoEn,
  chkCatalogo,
  chkNoNegativo,
} from './_columnas';
import { ESTADO_OPERATIVO, FORMA_ADQUISICION } from '../../../../compartido/enums/catalogos';
import { TIPO_INSTALACION } from '../../../../compartido/enums/plataforma';
import { bien } from './inventario';
import { responsable } from './configuracion';

export const hojaVida = sqliteTable(
  'hoja_vida',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    tipoInstalacion: enumCatalogo('tipo_instalacion', TIPO_INSTALACION),
    registroInvima: texto('registro_invima'),
    especificaciones: texto('especificaciones'),
    fabricante: texto('fabricante'),
    paisOrigen: texto('pais_origen'),
    estadoOperativo: enumCatalogo('estado_operativo', ESTADO_OPERATIVO).notNull(),
    formaAdquisicion: enumCatalogo('forma_adquisicion', FORMA_ADQUISICION).notNull(),
    /** ★ Nula = dato no disponible → INCOMPLETO (RN-03-01). INT-04 la acota por trigger. */
    fechaAdquisicion: fecha('fecha_adquisicion'),
    documentoAdquisicion: texto('documento_adquisicion'),
    numeroFactura: texto('numero_factura'),
    proveedor: texto('proveedor'),
    /** ★ NULL (no disponible) ≠ 0: regla de negocio RN-03-02. */
    costoAdquisicion: centavos('costo_adquisicion'),
    adicionesMejoras: centavos('adiciones_mejoras').notNull().default(0),
    fuenteFinanciacion: texto('fuente_financiacion'),
    fechaPuestaServicio: fecha('fecha_puesta_servicio'),
    /** decimal(5,2) → ×10.000. */
    vidaUtilTecnicaOverride: x10k('vida_util_tecnica_override'),
    justificacionOverride: texto('justificacion_override'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_hoja_vida_bien').on(t.bienId),
    chkCatalogo('chk_hv_instalacion', t.tipoInstalacion, TIPO_INSTALACION),
    chkCatalogo('chk_hv_operativo', t.estadoOperativo, ESTADO_OPERATIVO),
    chkCatalogo('chk_hv_adquisicion', t.formaAdquisicion, FORMA_ADQUISICION),
    chkNoNegativo('chk_hv_adiciones', t.adicionesMejoras),
  ],
);

export const mantenimiento = sqliteTable(
  'mantenimiento',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    fecha: fecha('fecha').notNull(),
    tipo: texto('tipo').notNull(),
    descripcion: texto('descripcion').notNull(),
    ejecutadoPor: texto('ejecutado_por'),
    costo: centavos('costo'),
    resultado: texto('resultado'),
    soporteUrl: texto('soporte_url'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_mantenimiento_bien').on(t.bienId, t.fecha)],
);

export const soporteDocumental = sqliteTable(
  'soporte_documental',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    tipoDocumento: texto('tipo_documento').notNull(),
    url: texto('url').notNull(),
    hashSha256: texto('hash_sha256').notNull(),
    cargadoPorResponsableId: uuid('cargado_por_responsable_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    cargadoEn: marcaTiempo('cargado_en').notNull(),
  },
  (t) => [index('ix_soporte_bien').on(t.bienId)],
);

export const overrideVidaUtil = sqliteTable(
  'override_vida_util',
  {
    id: uuidPk(),
    bienId: uuid('bien_id')
      .notNull()
      .references(() => bien.id, { onDelete: 'restrict' }),
    vidaUtilCatalogo: x10k('vida_util_catalogo').notNull(),
    vidaUtilAjustada: x10k('vida_util_ajustada').notNull(),
    fuente: texto('fuente').notNull(),
    justificacion: texto('justificacion').notNull(),
    especialistaId: uuid('especialista_id').references(() => responsable.id, {
      onDelete: 'set null',
    }),
    soporteUrl: texto('soporte_url'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_override_bien').on(t.bienId)],
);
