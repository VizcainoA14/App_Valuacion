import { _electron as electron, type ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const raizApp = join(import.meta.dirname, '..', '..');

// Los terminales integrados de VS Code exportan ELECTRON_RUN_AS_NODE=1, lo que
// convierte el binario de Electron en un Node pelado y rompe el lanzamiento.
export function entornoLimpio(extra: Record<string, string> = {}): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  delete env['ELECTRON_RUN_AS_NODE'];
  return { ...env, ...extra };
}

export interface OpcionesLanzamiento {
  readonly argumentos?: readonly string[];
  readonly env?: Record<string, string>;
}

/**
 * Lanza el ejecutable empaquetado (PROBAR_PAQUETE=1, lo que CI prueba tras `pack`)
 * o el resultado de `electron-vite build`.
 */
export function lanzarApp(opciones: OpcionesLanzamiento = {}): Promise<ElectronApplication> {
  const env = entornoLimpio(opciones.env);
  const argumentos = [...(opciones.argumentos ?? [])];

  // Instalación aislada por test. Sin esto, dos pruebas comparten el `userData` del
  // paquete y el bloqueo de instancia única (T-B-06) hace que la segunda muera al
  // arrancar — un proceso colgado de una ejecución anterior basta para romper la suite.
  if (!argumentos.some((a) => a.startsWith('--user-data='))) {
    argumentos.push(`--user-data=${mkdtempSync(join(tmpdir(), 'valuacion-e2e-auto-'))}`);
  }

  if (process.env['PROBAR_PAQUETE'] === '1') {
    const exe =
      process.platform === 'win32'
        ? join(raizApp, 'dist', 'win-unpacked', 'ValuacionActivos.exe')
        : join(raizApp, 'dist', 'linux-unpacked', 'ValuacionActivos');
    if (!existsSync(exe)) throw new Error(`No existe el paquete: ${exe}. Ejecuta npm run pack.`);
    return electron.launch({ executablePath: exe, args: argumentos, env });
  }
  return electron.launch({ args: [join(raizApp, 'out', 'main', 'index.js'), ...argumentos], env });
}
