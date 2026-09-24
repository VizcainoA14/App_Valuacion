/**
 * Genera `0002_triggers_integridad.sql`: las reglas de integridad que no caben en
 * un CHECK, la máquina de estados del bien y la inmutabilidad de lo calculado.
 *
 * NO se escribe a mano: el SQL sale del esquema Drizzle y de las máquinas de
 * estado de `compartido/estados`. Un test comprueba que el archivo en disco
 * coincide con lo generado, así que cambiar una regla sin regenerar rompe la
 * construcción en vez de pasar inadvertido.
 *
 * Dos niveles de inmutabilidad, ambos garantizados por la base aunque se le
 * escriba por SQL directo (ADR-017):
 *   - lo que se calculó en un corte, lo que trajo un barrido y lo que dice la
 *     bitácora no se reescriben nunca (ADR-028);
 *   - un proceso FINALIZADO no admite escritura en ninguna de sus tablas
 *     (ADR-029). El generador exige que toda tabla del esquema diga cómo llega
 *     a su proceso: una tabla nueva sin esa decisión rompe la construcción.
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

/** Tablas que, una vez escritas, no se modifican: lo que se calculó, lo que se importó, lo que se registró. */
export const TABLAS_INMUTABLES: readonly string[] = Object.freeze([
  'barrido',
  'bitacora',
  'calculo_depreciacion',
  'calculo_exclusion',
  'calculo_obsolescencia',
  'corte',
]);

function trigger(nombre: string, evento: string, tabla: string, cuando: string, mensaje: string): string {
  return [
    `CREATE TRIGGER \`${nombre}\` BEFORE ${evento} ON \`${tabla}\``,
    `WHEN ${cuando}`,
    'BEGIN',
    `\tSELECT RAISE(ABORT, '${mensaje}');`,
    'END;',
  ].join('\n');
}

// ── Reglas puntuales ─────────────────────────────────────────────────────────

const REGLAS_PUNTUALES: string[] = [
  trigger(
    'trg_int02_bien_proceso',
    'UPDATE OF proceso_id',
    'bien',
    'NEW.proceso_id <> OLD.proceso_id',
    'INT-02: un bien no puede cambiar de proceso',
  ),
  // INT-03 + RN-09-09: nunca se elimina un bien; se cambia su estado. Única excepción:
  // el proceso de demostración, que se borra completo de un clic (T-B-11). Por
  // eso un proceso en curso solo se elimina mientras no tenga inventario (ADR-029).
  trigger(
    'trg_int03_bien_delete',
    'DELETE',
    'bien',
    '(SELECT p.es_demostracion FROM proceso p WHERE p.id = OLD.proceso_id) = 0',
    'INT-03: un bien no se elimina; cambie su estado (RN-09-09)',
  ),
  // RNF-07 / ANEXO_B §7.1: los campos sensibles no cambian sin justificación. La capa
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
  // Una baja se registra y, si fue un error, se anula. Nada más: ni se reescribe
  // su causal o su justificación, ni se "desanula".
  trigger(
    'trg_baja_inmutable',
    'UPDATE',
    'baja',
    [
      'OLD.anulada_en IS NOT NULL',
      '\tOR NEW.bien_id IS NOT OLD.bien_id',
      '\tOR NEW.fecha IS NOT OLD.fecha',
      '\tOR NEW.causal IS NOT OLD.causal',
      '\tOR NEW.justificacion IS NOT OLD.justificacion',
      '\tOR NEW.referencia IS NOT OLD.referencia',
      '\tOR NEW.anulada_en IS NULL',
      "\tOR NEW.motivo_anulacion IS NULL OR trim(NEW.motivo_anulacion) = ''",
    ].join('\n'),
    'Una baja registrada solo se anula, con motivo; no se modifica',
  ),
];

// ── Máquinas de estado ───────────────────────────────────────────────────────

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

// ── Inmutabilidad (ADR-017 sobre la unidad de ADR-028) ───────────────────────

function triggerInmutable(tabla: string): string {
  return trigger(`trg_inmutable_${tabla}_upd`, 'UPDATE', tabla, '1', `${tabla}: lo registrado no se modifica`);
}

// ── ADR-029: un proceso finalizado es de solo lectura ────────────────────────

/** Tablas que llegan a su proceso por otra clave: subconsulta que devuelve el `proceso_id`. */
const INDIRECTAS: Readonly<Record<string, string>> = {
  servicio: '(SELECT s.proceso_id FROM sede s WHERE s.id = FILA.sede_id)',
  hoja_vida: '(SELECT b.proceso_id FROM bien b WHERE b.id = FILA.bien_id)',
  mantenimiento: '(SELECT b.proceso_id FROM bien b WHERE b.id = FILA.bien_id)',
  soporte_documental: '(SELECT b.proceso_id FROM bien b WHERE b.id = FILA.bien_id)',
  baja: '(SELECT b.proceso_id FROM bien b WHERE b.id = FILA.bien_id)',
  calculo_obsolescencia: '(SELECT c.proceso_id FROM corte c WHERE c.id = FILA.corte_id)',
  calculo_depreciacion: '(SELECT c.proceso_id FROM corte c WHERE c.id = FILA.corte_id)',
  calculo_exclusion: '(SELECT c.proceso_id FROM corte c WHERE c.id = FILA.corte_id)',
};

/** Fuera de la regla, a propósito: el proceso tiene la suya y la bitácora registra también lo finalizado (EXPORTAR). */
const EXENTAS: ReadonlySet<string> = new Set(['proceso', 'bitacora']);

const MENSAJE_FINALIZADO = 'El proceso está FINALIZADO y es de solo lectura (ADR-029)';

function finalizado(expresionProceso: string): string {
  return `(SELECT estado FROM proceso WHERE id = ${expresionProceso}) = 'FINALIZADO'`;
}

/** Del proceso de demostración se permite borrar todo, también finalizado (T-B-11). */
function finalizadoNoDemo(expresionProceso: string): string {
  return `(SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = ${expresionProceso}) = 1`;
}

function triggersFinalizado(tabla: string, columnas: readonly string[]): string[] {
  if (tabla === 'proceso') {
    return [
      trigger('trg_finalizado_proceso_upd', 'UPDATE', 'proceso', "OLD.estado = 'FINALIZADO'", MENSAJE_FINALIZADO),
      trigger('trg_finalizado_proceso_del', 'DELETE', 'proceso', "OLD.estado = 'FINALIZADO' AND OLD.es_demostracion = 0", MENSAJE_FINALIZADO),
    ];
  }
  const via = columnas.includes('proceso_id') ? 'FILA.proceso_id' : INDIRECTAS[tabla];
  if (via === undefined) throw new Error(`La tabla "${tabla}" no tiene proceso_id ni ruta indirecta declarada: decida cómo la congela ADR-029.`);
  const de = (fila: 'NEW' | 'OLD') => via.replaceAll('FILA', fila);
  return [
    trigger(`trg_finalizado_${tabla}_ins`, 'INSERT', tabla, finalizado(de('NEW')), MENSAJE_FINALIZADO),
    trigger(`trg_finalizado_${tabla}_upd`, 'UPDATE', tabla, `${finalizado(de('OLD'))} OR ${finalizado(de('NEW'))}`, MENSAJE_FINALIZADO),
    trigger(`trg_finalizado_${tabla}_del`, 'DELETE', tabla, finalizadoNoDemo(de('OLD')), MENSAJE_FINALIZADO),
  ];
}

export function generarSql(): string {
  const definiciones = Object.values(esquema as Record<string, unknown>)
    .filter((v): v is Table => typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in v)
    .sort((a, b) => getTableName(a).localeCompare(getTableName(b)));
  const tablas = new Set(definiciones.map((t) => getTableName(t)));
  for (const t of TABLAS_INMUTABLES) {
    if (!tablas.has(t)) throw new Error(`TABLAS_INMUTABLES menciona "${t}", que no está en el esquema.`);
  }

  const encabezado = [
    '-- GENERADO por scripts/generar-triggers.ts. NO EDITAR A MANO: npm run db:triggers.',
    '-- Reglas de integridad que no caben en un CHECK, máquina de estados del bien',
    '-- e inmutabilidad: cortes, barridos y bitácora (ADR-028) y el proceso finalizado (ADR-029).',
    '',
    '-- ── Reglas puntuales ──',
  ].join('\n');

  return [
    encabezado,
    ...REGLAS_PUNTUALES,
    '-- ── Máquina de estados del bien (ADR-028) ──',
    ...MAQUINAS_DE_ESTADO.flatMap(triggersMaquina),
    `-- ── Inmutabilidad: ${TABLAS_INMUTABLES.length} tablas ──`,
    ...TABLAS_INMUTABLES.map(triggerInmutable),
    '-- ── Proceso finalizado: solo lectura (ADR-029) ──',
    ...definiciones
      .filter((t) => !EXENTAS.has(getTableName(t)) || getTableName(t) === 'proceso')
      .flatMap((t) => triggersFinalizado(getTableName(t), Object.values(getTableColumns(t)).map((c) => c.name))),
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
