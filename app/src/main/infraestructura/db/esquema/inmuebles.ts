/** MOD-10 — Inmuebles (paso 08 §10.1). El predio cuelga de la entidad; el avalúo, del ejercicio (CT-15). */
import { index, uniqueIndex, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  uuidPk,
  uuid,
  texto,
  entero,
  centavos,
  x10k,
  fecha,
  booleano,
  enumCatalogo,
  creadoEn,
  actualizadoEn,
  chkCatalogo,
  chkBooleano,
} from './_columnas';
import { ESTADO_LEGALIZACION, ESTADO_CONSERVACION } from '../../../../compartido/enums/catalogos';
import { entidad, ejercicio, responsable } from './configuracion';

export const inmueble = sqliteTable(
  'inmueble',
  {
    id: uuidPk(),
    entidadId: uuid('entidad_id')
      .notNull()
      .references(() => entidad.id, { onDelete: 'cascade' }),
    codigoInmueble: texto('codigo_inmueble').notNull(),
    nombre: texto('nombre').notNull(),
    tipoInmueble: texto('tipo_inmueble').notNull(),
    direccion: texto('direccion').notNull(),
    municipio: texto('municipio').notNull(),
    departamento: texto('departamento').notNull(),
    destinacion: texto('destinacion'),
    usoActual: texto('uso_actual'),
    matriculaInmobiliaria: texto('matricula_inmobiliaria'),
    codigoCatastral: texto('codigo_catastral'),
    tituloAdquisicion: texto('titulo_adquisicion'),
    fechaAdquisicion: fecha('fecha_adquisicion'),
    afectaciones: texto('afectaciones'),
    estadoLegalizacion: enumCatalogo('estado_legalizacion', ESTADO_LEGALIZACION).notNull(),
    areaTerrenoM2: x10k('area_terreno_m2'),
    areaConstruidaM2: x10k('area_construida_m2'),
    numeroPisos: entero('numero_pisos'),
    vetustezAnios: entero('vetustez_anios'),
    vidaUtilTotalAnios: entero('vida_util_total_anios'),
    estadoConservacion: enumCatalogo('estado_conservacion', ESTADO_CONSERVACION),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_inmueble_codigo').on(t.entidadId, t.codigoInmueble),
    chkCatalogo('chk_inmueble_legalizacion', t.estadoLegalizacion, ESTADO_LEGALIZACION),
    chkCatalogo('chk_inmueble_conservacion', t.estadoConservacion, ESTADO_CONSERVACION),
  ],
);

export const avaluoInmueble = sqliteTable(
  'avaluo_inmueble',
  {
    id: uuidPk(),
    inmuebleId: uuid('inmueble_id')
      .notNull()
      .references(() => inmueble.id, { onDelete: 'restrict' }),
    ejercicioId: uuid('ejercicio_id')
      .notNull()
      .references(() => ejercicio.id, { onDelete: 'restrict' }),
    metodoTerreno: texto('metodo_terreno'),
    valorM2Terreno: centavos('valor_m2_terreno'),
    valorTotalTerreno: centavos('valor_total_terreno'),
    metodoConstruccion: texto('metodo_construccion'),
    costoReposicionM2: centavos('costo_reposicion_m2'),
    factorDepreciacion: x10k('factor_depreciacion'),
    valorM2ConstruccionDepreciado: centavos('valor_m2_construccion_depreciado'),
    valorTotalConstruccion: centavos('valor_total_construccion'),
    valorTotalInmueble: centavos('valor_total_inmueble').notNull(),
    /** Perito del catálogo (externo, con registro R.A.A). Los textos son la foto impresa. */
    peritoId: uuid('perito_id').references(() => responsable.id, { onDelete: 'set null' }),
    peritoNombre: texto('perito_nombre').notNull(),
    peritoRegistroRaa: texto('perito_registro_raa').notNull(),
    fechaVisita: fecha('fecha_visita'),
    fechaInforme: fecha('fecha_informe').notNull(),
    vigenciaHasta: fecha('vigencia_hasta').notNull(),
    informeUrl: texto('informe_url'),
    valorLibrosAnterior: centavos('valor_libros_anterior'),
    diferenciaValuacion: centavos('diferencia_valuacion'),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex('ux_avaluo_inmueble_ejercicio').on(t.inmuebleId, t.ejercicioId)],
);

export const ofertaComparable = sqliteTable(
  'oferta_comparable',
  {
    id: uuidPk(),
    avaluoId: uuid('avaluo_id')
      .notNull()
      .references(() => avaluoInmueble.id, { onDelete: 'cascade' }),
    direccion: texto('direccion').notNull(),
    descripcion: texto('descripcion'),
    areaTerrenoM2: x10k('area_terreno_m2'),
    areaConstruidaM2: x10k('area_construida_m2'),
    valorOfertado: centavos('valor_ofertado').notNull(),
    factorNegociacion: x10k('factor_negociacion'),
    valorDepurado: centavos('valor_depurado'),
    valorM2Homogeneizado: centavos('valor_m2_homogeneizado'),
    incluida: booleano('incluida').notNull().default(true),
    motivoDescarte: texto('motivo_descarte'),
    fuente: texto('fuente'),
    link: texto('link'),
  },
  (t) => [
    index('ix_oferta_avaluo').on(t.avaluoId),
    chkBooleano('chk_oferta_incluida', t.incluida),
  ],
);

export const documentoInmueble = sqliteTable(
  'documento_inmueble',
  {
    id: uuidPk(),
    inmuebleId: uuid('inmueble_id')
      .notNull()
      .references(() => inmueble.id, { onDelete: 'cascade' }),
    tipoDocumento: texto('tipo_documento').notNull(),
    url: texto('url').notNull(),
    hashSha256: texto('hash_sha256').notNull(),
    fechaExpedicion: fecha('fecha_expedicion'),
    vigenciaHasta: fecha('vigencia_hasta'),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_documento_inmueble').on(t.inmuebleId)],
);
