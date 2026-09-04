/**
 * `npm run dev:aislado` — desarrollo sobre una instalación propia y **efímera**,
 * separada de la app instalada.
 *
 * Por qué existe: Electron deriva `userData` de `productName`, y ese nombre es el
 * mismo en desarrollo y en el instalador. Sin este arranque, `npm run dev` abre
 * `%APPDATA%/Valuación de Activos` — **la base real del hospital** — y le aplica
 * las migraciones de la rama en la que se esté trabajando. Después el instalador,
 * más viejo, puede no poder abrirla.
 *
 * Cada ejecución empieza en blanco. **La limpieza es al abrir, no al cerrar**: si
 * se hiciera al cerrar, un cierre brusco —terminal matada, cuelgue, el proceso que
 * queda colgado— se la saltaría, y la siguiente ejecución arrancaría con restos
 * justo cuando se la cree limpia. Borrando al abrir, la garantía no depende de
 * cómo terminó la vez anterior; de paso, los registros de la sesión anterior
 * siguen ahí para mirarlos.
 *
 *   npm run dev:aislado                        → app/.datos-dev, en blanco
 *   npm run dev:aislado -- --conservar         → mantiene lo de la vez anterior
 *   npm run dev:aislado -- caso-b              → app/.datos-dev/caso-b, en blanco
 *   npm run dev:aislado -- --conservar caso-b  → ese escenario, sin borrar
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizApp = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Todo lo que este script pueda borrar vive aquí dentro. Nada fuera. */
const RAIZ_AISLADA = resolve(join(raizApp, '.datos-dev'));

const argumentos = process.argv.slice(2);
const conservar = argumentos.includes('--conservar');
const escenario = argumentos.find((a) => !a.startsWith('--'));

/**
 * El nombre del escenario es **un solo segmento**, no una ruta. Este script borra
 * directorios enteros: aceptar `..` o una ruta absoluta convertiría una errata en
 * un `rm -rf` sobre cualquier carpeta del equipo.
 */
if (escenario !== undefined && !/^[A-Za-z0-9._-]+$/.test(escenario)) {
  console.error(`\n  Nombre de escenario inválido: "${escenario}"`);
  console.error('  Use solo letras, dígitos, punto, guion o guion bajo (sin rutas ni "..").\n');
  process.exit(1);
}

const destino = escenario === undefined ? RAIZ_AISLADA : join(RAIZ_AISLADA, escenario);

// Cinturón sobre tirantes: aunque la validación de arriba ya lo garantiza, no se
// borra nada que no esté bajo `.datos-dev`.
if (destino !== RAIZ_AISLADA && !destino.startsWith(RAIZ_AISLADA + sep)) {
  console.error(`\n  Ruta fuera del área aislada, se cancela: ${destino}\n`);
  process.exit(1);
}

const habia = existsSync(destino) && readdirSync(destino).length > 0;

if (habia && !conservar) {
  try {
    // `maxRetries` porque en Windows un archivo recién liberado puede seguir
    // bloqueado unos milisegundos.
    rmSync(destino, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (e) {
    console.error(`\n  No se pudo limpiar ${destino}`);
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    console.error('\n  Suele ser un proceso de una ejecución anterior que sigue vivo y mantiene');
    console.error('  los archivos abiertos. Cierre la ventana de la app, o termine el "electron.exe"');
    console.error('  que haya quedado colgado, y vuelva a intentarlo.\n');
    process.exit(1);
  }
}

// `app.setPath('userData', …)` exige que el directorio exista; si no, Electron lanza.
mkdirSync(destino, { recursive: true });

const estado = conservar ? (habia ? 'conservando los datos anteriores' : 'nueva') : 'en blanco';
console.log(`\n  Instalación aislada (${estado}): ${destino}`);
if (!conservar) console.log('  Al cerrar, estos datos quedan aquí; el próximo arranque los borra.');
console.log('  La base de la app instalada NO se toca.\n');

/**
 * `ELECTRON_RUN_AS_NODE` convierte el binario de Electron en un Node pelado, y
 * entonces `import { BrowserWindow } from 'electron'` falla al arrancar. Algunas
 * herramientas y contenedores la dejan puesta en el entorno; aquí estorba siempre.
 */
const entorno = { ...process.env };
delete entorno['ELECTRON_RUN_AS_NODE'];

// El primer `--` lo consume el CLI de electron-vite; lo que sigue llega a Electron
// como argumento del proceso principal y lo lee `leerArgumento(process.argv, …)`.
const hijo = spawn(
  'npx',
  ['electron-vite', 'dev', '--', `--user-data=${destino}`],
  { cwd: raizApp, stdio: 'inherit', shell: process.platform === 'win32', env: entorno },
);

hijo.on('exit', (codigo, senal) => {
  process.exit(senal !== null ? 1 : (codigo ?? 0));
});
