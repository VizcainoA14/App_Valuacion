/**
 * T-A-01 — Verificación de versiones congeladas.
 *
 * Comprueba que:
 *  1. Ninguna dependencia de package.json usa rangos (^, ~, >, <, *, x).
 *  2. Las versiones instaladas coinciden con las declaradas.
 *  3. El Electron declarado coincide con el registrado en docs/decisiones-runtime.md.
 *  4. Informa (sin fallar) si el registro de npm publica versiones más nuevas, para la
 *     revisión de cadencia de 8 semanas de ADR-002.
 *
 * Uso: npm run verificar:versiones
 * Sale con código 1 si el congelado está violado; los avisos de novedades no fallan.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

interface PaqueteJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}

const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')) as PaqueteJson;
const decisiones = readFileSync(join(raiz, 'docs', 'decisiones-runtime.md'), 'utf8');

let errores = 0;
const fallo = (msg: string): void => {
  console.error(`  ✗ ${msg}`);
  errores += 1;
};

// ── 1. Sin rangos ────────────────────────────────────────────────────────────
console.log('1. Versiones exactas en package.json (sin ^ ni ~):');
const todas: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
const esExacta = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
for (const [nombre, version] of Object.entries(todas)) {
  if (!esExacta.test(version)) fallo(`${nombre} usa un rango: "${version}"`);
}
if (errores === 0) console.log(`  ✓ ${Object.keys(todas).length} dependencias, todas exactas`);

// ── 2. Instalado === declarado ───────────────────────────────────────────────
console.log('2. Instalado coincide con declarado:');
let desalineadas = 0;
for (const [nombre, declarada] of Object.entries(todas)) {
  try {
    const instalada = (
      JSON.parse(
        readFileSync(join(raiz, 'node_modules', nombre, 'package.json'), 'utf8'),
      ) as { version: string }
    ).version;
    if (instalada !== declarada) {
      fallo(`${nombre}: declarada ${declarada}, instalada ${instalada}`);
      desalineadas += 1;
    }
  } catch {
    fallo(`${nombre}: no está instalada (¿falta npm install?)`);
    desalineadas += 1;
  }
}
if (desalineadas === 0) console.log('  ✓ todas alineadas');

// ── 3. Electron coincide con decisiones-runtime.md ──────────────────────────
console.log('3. Electron coincide con docs/decisiones-runtime.md:');
const electronDeclarado = todas['electron'];
if (electronDeclarado === undefined) {
  fallo('electron no figura en package.json');
} else if (!decisiones.includes(`**${electronDeclarado}**`)) {
  fallo(
    `electron ${electronDeclarado} no aparece congelado en decisiones-runtime.md. ` +
      'Si se actualizó, hay que registrar el cambio allí y en la bitácora (ADR-002).',
  );
} else {
  console.log(`  ✓ Electron ${electronDeclarado}`);
}

// ── 4. Novedades en el registro (informativo, no falla) ─────────────────────
console.log('4. Novedades en npm (revisión de cadencia ADR-002, no bloquea):');
for (const nombre of ['electron', 'typescript', 'react', 'better-sqlite3']) {
  const congelada = todas[nombre];
  if (congelada === undefined) continue;
  try {
    const ultima = execSync(`npm view ${nombre} version`, { encoding: 'utf8' }).trim();
    console.log(
      ultima === congelada
        ? `  · ${nombre}: ${congelada} (al día)`
        : `  · ${nombre}: congelada ${congelada}, última ${ultima}`,
    );
  } catch {
    console.log(`  · ${nombre}: sin acceso al registro (sin red, no pasa nada)`);
  }
}

if (errores > 0) {
  console.error(`\nFALLO: ${errores} violación(es) del congelado de T-A-01.`);
  process.exit(1);
}
console.log('\nOK: el congelado de versiones se respeta.');
