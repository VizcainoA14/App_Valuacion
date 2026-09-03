/**
 * T-A-06 — Matriz de trazabilidad /Teoria → docs/trazabilidad.csv (riesgo RG-15).
 *
 * 1. Recorre los .md de /Teoria y extrae todos los códigos RF-, RN-, VAL-, EN-,
 *    EN-G- e INT- (únicos).
 * 2. Compara los conteos contra la tabla de FASE_1_ANALISIS/1.1 §1. Si difieren,
 *    FALLA: significa que /Teoria cambió y hay que actualizar el análisis.
 * 3. Genera/actualiza docs/trazabilidad.csv CONSERVANDO el estado ya registrado
 *    (un requisito marcado IMPLEMENTADO no vuelve a PENDIENTE al regenerar).
 *
 * Uso: npm run trazabilidad
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizApp = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirTeoria = join(raizApp, '..', 'Teoria');
const rutaCsv = join(raizApp, 'docs', 'trazabilidad.csv');
const rutaAnalisis = join(
  raizApp,
  '..',
  'plan_desarrollo',
  'FASE_1_ANALISIS',
  '1.1_requerimientos.md',
);

// ── 1. Extracción ────────────────────────────────────────────────────────────
const PATRON_CODIGO = /\b(RF-\d{2}-\d{2}|RN-\d{2}-\d{2}|VAL-\d{2}-\d{2}|EN-G-\d{2}|EN-\d{2}-\d{2}|INT-\d{2})\b/g;

const codigos = new Map<string, Set<string>>(); // código → documentos donde aparece
for (const archivo of readdirSync(dirTeoria).filter((a) => a.endsWith('.md'))) {
  if (archivo === 'CORRECCIONES.md') continue; // solo referencia códigos, no los define
  const contenido = readFileSync(join(dirTeoria, archivo), 'utf8');
  for (const [codigo] of contenido.matchAll(PATRON_CODIGO)) {
    if (!codigos.has(codigo)) codigos.set(codigo, new Set());
    codigos.get(codigo)?.add(archivo);
  }
}

const familiaDe = (codigo: string): string =>
  codigo.startsWith('EN-G-') ? 'EN-G' : (codigo.split('-')[0] ?? '');

const conteos = new Map<string, number>();
for (const codigo of codigos.keys()) {
  const familia = familiaDe(codigo);
  conteos.set(familia, (conteos.get(familia) ?? 0) + 1);
}

// ── 2. Verificación contra 1.1 §1 ───────────────────────────────────────────
const analisis = readFileSync(rutaAnalisis, 'utf8');
const esperadoDe = (patron: RegExp): number => {
  const m = analisis.match(patron);
  if (m?.[1] === undefined) throw new Error(`No pude leer el conteo esperado con ${String(patron)}`);
  return Number(m[1]);
};

const esperados: Record<string, number> = {
  RF: esperadoDe(/`RF-nn-nn`\s*\|\s*\*\*(\d+)\*\*/),
  RN: esperadoDe(/`RN-nn-nn`\s*\|\s*\*\*(\d+)\*\*/),
  VAL: esperadoDe(/`VAL-nn-nn`[^|]*\|\s*\*\*(\d+)\*\*/),
  EN: esperadoDe(/`EN-nn-nn`\s*\|\s*\*\*(\d+)\*\*/),
  'EN-G': esperadoDe(/`EN-G-nn`\s*\|\s*(\d+)/),
  INT: esperadoDe(/`INT-nn`\s*\|\s*(\d+)/),
};

let fallo = false;
console.log('Conteo por familia (extraído vs. esperado según 1.1 §1):');
for (const [familia, esperado] of Object.entries(esperados)) {
  const real = conteos.get(familia) ?? 0;
  const marca = real === esperado ? '✓' : '✗';
  if (real !== esperado) fallo = true;
  console.log(`  ${marca} ${familia}: ${real} / ${esperado}`);
}
if (fallo) {
  console.error(
    '\nFALLO (RG-15): /Teoria y el análisis de la Fase 1 divergen. O cambió /Teoria ' +
      '(actualizar 1.1 §1 y registrar en bitácora) o la extracción encontró códigos mal formados.',
  );
  process.exit(1);
}

// ── 3. Generación con conservación de estado ─────────────────────────────────
// ADR-015: la captura móvil está fuera de alcance; estos RF no se implementan.
const NO_IMPLEMENTADOS = new Map<string, string>([
  ['RF-02-01', 'NO_IMPLEMENTADO (ADR-015: sin captura en campo)'],
  ['RF-02-02', 'NO_IMPLEMENTADO (ADR-015: sin captura en campo)'],
]);

interface Fila {
  codigo: string;
  familia: string;
  documentos: string;
  estado: string;
  implementacion: string;
  tests: string;
}

const previas = new Map<string, Fila>();
if (existsSync(rutaCsv)) {
  const lineas = readFileSync(rutaCsv, 'utf8').trim().split('\n').slice(1);
  for (const linea of lineas) {
    const [codigo = '', familia = '', documentos = '', estado = '', implementacion = '', tests = ''] =
      linea.split(';');
    if (codigo !== '') previas.set(codigo, { codigo, familia, documentos, estado, implementacion, tests });
  }
}

const ordenados = [...codigos.keys()].sort();
const filas: Fila[] = ordenados.map((codigo) => {
  const previa = previas.get(codigo);
  return {
    codigo,
    familia: familiaDe(codigo),
    documentos: [...(codigos.get(codigo) ?? [])].sort().join(','),
    estado: previa?.estado ?? NO_IMPLEMENTADOS.get(codigo) ?? 'PENDIENTE',
    implementacion: previa?.implementacion ?? '',
    tests: previa?.tests ?? '',
  };
});

const desaparecidos = [...previas.keys()].filter((c) => !codigos.has(c));
if (desaparecidos.length > 0) {
  console.error(
    `\nFALLO (RG-15): ${desaparecidos.length} código(s) del CSV ya no existen en /Teoria: ` +
      `${desaparecidos.join(', ')}. Un código nunca se renumera ni se borra en silencio.`,
  );
  process.exit(1);
}

const encabezado = 'codigo;familia;documentos;estado;implementacion;tests';
writeFileSync(rutaCsv, `${encabezado}\n${filas.map((f) => [f.codigo, f.familia, f.documentos, f.estado, f.implementacion, f.tests].join(';')).join('\n')}\n`, 'utf8');

console.log(`\nOK: ${filas.length} requisitos en docs/trazabilidad.csv`);
const porEstado = new Map<string, number>();
for (const f of filas) {
  const clave = f.estado.split(' ')[0] ?? f.estado;
  porEstado.set(clave, (porEstado.get(clave) ?? 0) + 1);
}
for (const [estado, n] of [...porEstado.entries()].sort()) console.log(`  ${estado}: ${n}`);
