/**
 * T-B-04 — Genera `0002_triggers_integridad.sql` (INT-02 … INT-10 y máquinas de estado).
 *
 * NO se escribe a mano: el SQL sale del esquema Drizzle (qué tablas tienen
 * `ejercicio_id`) y de las máquinas de estado de MOD-00. Un test comprueba que el
 * archivo en disco coincide con lo generado, así que añadir una tabla sin decidir
 * cómo se congela (INT-09) rompe la construcción en vez de pasar inadvertido.
 *
 * Uso: npm run db:triggers   (y luego revisar el diff de la migración)
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTableColumns, getTableName, type Table } from 'drizzle-orm';
import * as esquema from '../src/main/infraestructura/db/esquema';
import { MAQUINAS_DE_ESTADO, type MaquinaEstado } from '../src/compartido/estados';
import { CAMPOS_SENSIBLES } from '../src/compartido/enums/plataforma';

export const RUTA_MIGRACION = 'src/main/infraestructura/db/migraciones/0002_triggers_integridad.sql';

const SEPARADOR = '--> statement-breakpoint';

/** Tablas sin `ejercicio_id` que llegan al ejercicio por otra clave. Subconsulta que devuelve su estado. */
const INDIRECTAS: Readonly<Record<string, { via: string; clave: string }>> = {
  hoja_vida: { via: 'bien', clave: 'bien_id' },
  mantenimiento: { via: 'bien', clave: 'bien_id' },
  soporte_documental: { via: 'bien', clave: 'bien_id' },
  foto_bien: { via: 'bien', clave: 'bien_id' },
  movimiento_bien: { via: 'bien', clave: 'bien_id' },
  override_vida_util: { via: 'bien', clave: 'bien_id' },
  disposicion_final: { via: 'propuesta_baja', clave: 'propuesta_baja_id' },
  efecto_contable_baja: { via: 'propuesta_baja', clave: 'propuesta_baja_id' },
  oferta_comparable: { via: 'avaluo_inmueble', clave: 'avaluo_id' },
};

/** Tablas de configuración que NO pertenecen a un ejercicio: quedan fuera de INT-09 a propósito. */
const SIN_EJERCICIO: ReadonlySet<string> = new Set([
  'entidad',
  'sede',
  'servicio',
  'clase_activo',
  'parametro_calculo',
  'convencion_codigo',
  'abreviatura_tipo',
  'responsable',
  'factor_estado',
  'inmueble',
  'documento_inmueble',
]);

function estadoEjercicio(tabla: string, fila: 'NEW' | 'OLD'): string {
  const indirecta = INDIRECTAS[tabla];
  if (indirecta === undefined) {
    return `(SELECT estado FROM ejercicio WHERE id = ${fila}.ejercicio_id)`;
  }
  return `(SELECT j.estado FROM ${indirecta.via} v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = ${fila}.${indirecta.clave})`;
}

function trigger(nombre: string, evento: string, tabla: string, cuando: string, mensaje: string): string {
  return [
    `CREATE TRIGGER \`${nombre}\` BEFORE ${evento} ON \`${tabla}\``,
    `WHEN ${cuando}`,
    'BEGIN',
    `\tSELECT RAISE(ABORT, '${mensaje}');`,
    'END;',
  ].join('\n');
}

// ── INT-02 … INT-08, INT-10: reglas puntuales ────────────────────────────────

const REGLAS_PUNTUALES: string[] = [
  trigger(
    'trg_int02_bien_ejercicio',
    'UPDATE OF ejercicio_id',
    'bien',
    'NEW.ejercicio_id <> OLD.ejercicio_id',
    'INT-02: un bien no puede cambiar de ejercicio',
  ),
  // INT-03 + RN-09-09: nunca se elimina un bien; se cambia su estado. Única excepción:
  // el hospital de demostración, que se borra completo de un clic (T-B-11).
  trigger(
    'trg_int03_bien_delete',
    'DELETE',
    'bien',
    '(SELECT e.es_demostracion FROM ejercicio j JOIN entidad e ON e.id = j.entidad_id WHERE j.id = OLD.ejercicio_id) = 0',
    'INT-03: un bien no se elimina; cambie su estado (RN-09-09)',
  ),
  trigger(
    'trg_int04_hoja_vida_insert',
    'INSERT',
    'hoja_vida',
    'NEW.fecha_adquisicion IS NOT NULL AND NEW.fecha_adquisicion > (SELECT j.fecha_corte FROM bien b JOIN ejercicio j ON j.id = b.ejercicio_id WHERE b.id = NEW.bien_id)',
    'INT-04: fecha_adquisicion posterior a la fecha de corte del ejercicio',
  ),
  trigger(
    'trg_int04_hoja_vida_update',
    'UPDATE OF fecha_adquisicion, bien_id',
    'hoja_vida',
    'NEW.fecha_adquisicion IS NOT NULL AND NEW.fecha_adquisicion > (SELECT j.fecha_corte FROM bien b JOIN ejercicio j ON j.id = b.ejercicio_id WHERE b.id = NEW.bien_id)',
    'INT-04: fecha_adquisicion posterior a la fecha de corte del ejercicio',
  ),
  trigger(
    'trg_int04_ejercicio_fecha_corte',
    'UPDATE OF fecha_corte',
    'ejercicio',
    'EXISTS (SELECT 1 FROM hoja_vida h JOIN bien b ON b.id = h.bien_id WHERE b.ejercicio_id = NEW.id AND h.fecha_adquisicion > NEW.fecha_corte)',
    'INT-04: hay bienes adquiridos después de la nueva fecha de corte',
  ),
  trigger(
    'trg_int07_propuesta_insert',
    'INSERT',
    'propuesta_baja',
    "NEW.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA') AND NEW.acta_comite_id IS NULL",
    'INT-07: una baja ejecutada exige acta del Comité',
  ),
  trigger(
    'trg_int07_propuesta_update',
    'UPDATE OF estado_aprobacion, acta_comite_id',
    'propuesta_baja',
    "NEW.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA') AND NEW.acta_comite_id IS NULL",
    'INT-07: una baja ejecutada exige acta del Comité',
  ),
  trigger(
    'trg_int08_acto_insert',
    'INSERT',
    'acto_administrativo',
    "NEW.estado IN ('FIRMADO', 'PUBLICADO') AND NEW.acta_comite_id IS NULL",
    'INT-08: un acto firmado exige acta del Comité',
  ),
  trigger(
    'trg_int08_acto_update',
    'UPDATE OF estado, acta_comite_id',
    'acto_administrativo',
    "NEW.estado IN ('FIRMADO', 'PUBLICADO') AND NEW.acta_comite_id IS NULL",
    'INT-08: un acto firmado exige acta del Comité',
  ),
  // RN-10-07: el acto firmado queda congelado; solo cambia a PUBLICADO.
  trigger(
    'trg_rn1007_acto_congelado',
    'UPDATE',
    'acto_administrativo',
    [
      'OLD.inmutable = 1 AND (',
      '\tNEW.inmutable = 0',
      '\tOR NEW.contenido_generado IS NOT OLD.contenido_generado',
      '\tOR NEW.epigrafe IS NOT OLD.epigrafe',
      '\tOR NEW.numero IS NOT OLD.numero',
      '\tOR NEW.fecha IS NOT OLD.fecha',
      '\tOR NEW.tipo_resolucion IS NOT OLD.tipo_resolucion',
      '\tOR NEW.acta_comite_id IS NOT OLD.acta_comite_id',
      '\tOR NEW.firmo_responsable_id IS NOT OLD.firmo_responsable_id',
      '\tOR NEW.fecha_firma IS NOT OLD.fecha_firma',
      ')',
    ].join('\n'),
    'RN-10-07: un acto firmado es inmutable',
  ),
  // RNF-07 / ANEXO_B §7.1: los 8 campos sensibles no cambian sin justificación. La capa
  // de aplicación lo valida antes; la base lo garantiza aunque se escriba por SQL directo.
  trigger(
    'trg_rnf07_bitacora_justificacion',
    'INSERT',
    'bitacora',
    `NEW.accion = 'ACTUALIZAR' AND NEW.campo IN (${CAMPOS_SENSIBLES.map((c) => `'${c}'`).join(', ')}) AND (NEW.justificacion IS NULL OR trim(NEW.justificacion) = '')`,
    'RNF-07: modificar un campo sensible exige justificación (ANEXO_B §7.1)',
  ),
  trigger(
    'trg_int10_calculo_dep_insert',
    'INSERT',
    'calculo_depreciacion',
    '(SELECT c.es_depreciable FROM bien b JOIN clase_activo c ON c.id = b.clase_activo_id WHERE b.id = NEW.bien_id) = 0',
    'INT-10: la clase del bien no es depreciable',
  ),
  trigger(
    'trg_int10_calculo_dep_update',
    'UPDATE OF bien_id',
    'calculo_depreciacion',
    '(SELECT c.es_depreciable FROM bien b JOIN clase_activo c ON c.id = b.clase_activo_id WHERE b.id = NEW.bien_id) = 0',
    'INT-10: la clase del bien no es depreciable',
  ),
];

// ── Máquinas de estado (T-B-05) ──────────────────────────────────────────────

function triggersMaquina(m: MaquinaEstado<string>): string[] {
  const permitidas = Object.entries(m.transiciones)
    .filter(([, destinos]) => destinos.length > 0)
    .map(
      ([desde, destinos]) =>
        `(OLD.${m.columna} = '${desde}' AND NEW.${m.columna} IN (${destinos.map((d) => `'${d}'`).join(', ')}))`,
    );
  return [
    trigger(
      `trg_estado_${m.tabla}_inicial`,
      'INSERT',
      m.tabla,
      `NEW.${m.columna} <> '${m.inicial}'`,
      `${m.nombre}: todo registro nace en ${m.inicial} (${m.fuente})`,
    ),
    trigger(
      `trg_estado_${m.tabla}_transicion`,
      `UPDATE OF ${m.columna}`,
      m.tabla,
      `NEW.${m.columna} <> OLD.${m.columna} AND NOT (\n\t${permitidas.join('\n\tOR ')}\n)`,
      `${m.nombre}: transición de ${m.columna} no permitida (${m.fuente})`,
    ),
  ];
}

// ── INT-09: ejercicio CERRADO rechaza toda escritura ─────────────────────────

function triggersInt09(tabla: string): string[] {
  const cerrado = (fila: 'NEW' | 'OLD') => `${estadoEjercicio(tabla, fila)} = 'CERRADO'`;
  const mensaje = 'INT-09: el ejercicio está CERRADO y es inmutable';

  if (tabla === 'ejercicio') {
    return [
      trigger('trg_int09_ejercicio_update', 'UPDATE', 'ejercicio', "OLD.estado = 'CERRADO'", mensaje),
      trigger('trg_int09_ejercicio_delete', 'DELETE', 'ejercicio', "OLD.estado = 'CERRADO'", mensaje),
    ];
  }

  // Consultar o exportar un ejercicio cerrado es legítimo (RN-11-04) y debe quedar en bitácora.
  const condicionInsert =
    tabla === 'bitacora' ? `${cerrado('NEW')} AND NEW.accion <> 'EXPORTAR'` : cerrado('NEW');

  return [
    trigger(`trg_int09_${tabla}_ins`, 'INSERT', tabla, condicionInsert, mensaje),
    trigger(`trg_int09_${tabla}_upd`, 'UPDATE', tabla, `${cerrado('OLD')} OR ${cerrado('NEW')}`, mensaje),
    trigger(`trg_int09_${tabla}_del`, 'DELETE', tabla, cerrado('OLD'), mensaje),
  ];
}

export function generarSql(): string {
  const tablas = Object.values(esquema as Record<string, unknown>).filter(
    (v): v is Table => typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in v,
  );

  const bloques: string[] = [];
  const int09: string[] = [];
  let tablasCongeladas = 0;

  for (const tabla of tablas.sort((a, b) => getTableName(a).localeCompare(getTableName(b)))) {
    const nombre = getTableName(tabla);
    const columnas = Object.values(getTableColumns(tabla)).map((c) => c.name);
    const tieneEjercicio = columnas.includes('ejercicio_id');

    if (SIN_EJERCICIO.has(nombre)) {
      if (tieneEjercicio) throw new Error(`${nombre} tiene ejercicio_id pero está en SIN_EJERCICIO`);
      continue;
    }
    if (nombre !== 'ejercicio' && !tieneEjercicio && INDIRECTAS[nombre] === undefined) {
      throw new Error(
        `La tabla "${nombre}" no tiene ejercicio_id ni ruta indirecta declarada: decide cómo la congela INT-09.`,
      );
    }
    int09.push(...triggersInt09(nombre));
    tablasCongeladas += 1;
  }

  for (const m of MAQUINAS_DE_ESTADO) bloques.push(...triggersMaquina(m));

  const encabezado = [
    '-- GENERADO por scripts/generar-triggers.ts (T-B-04). NO EDITAR A MANO: npm run db:triggers.',
    '-- Reglas de integridad ANEXO_B §8 que no caben en un CHECK, máquinas de estado ANEXO_B §6',
    '-- e inmutabilidad del ejercicio cerrado (INT-09, ADR-017) sobre TODAS las tablas del ejercicio.',
    '',
    '-- ── INT-02 … INT-08, INT-10 y RN-10-07 ──',
  ].join('\n');

  return [
    encabezado,
    ...REGLAS_PUNTUALES,
    '-- ── Máquinas de estado (ANEXO_B §6) ──',
    ...bloques,
    `-- ── INT-09: ${int09.length} triggers sobre ${tablasCongeladas} tablas (incluido ejercicio) ──`,
    ...int09,
  ].join(`\n${SEPARADOR}\n`).concat('\n');
}

const esEjecucionDirecta =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (esEjecucionDirecta) {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const sql = generarSql();
  writeFileSync(join(raiz, RUTA_MIGRACION), sql, 'utf8');
  const total = (sql.match(/CREATE TRIGGER/g) ?? []).length;
  console.log(`OK: ${total} triggers escritos en ${RUTA_MIGRACION}`);
}
