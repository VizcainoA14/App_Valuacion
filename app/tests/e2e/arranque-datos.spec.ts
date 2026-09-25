/**
 * T-B-06 — arranque con instalación aislada (`--user-data`) y bloqueo de unidad de red (RG-10).
 * Criterio del backlog: apuntar la ruta de datos a una UNC produce el diálogo y NO abre la base.
 */
import { test, expect } from '@playwright/test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

function leerRegistro(userData: string): string {
  const dir = join(userData, 'logs');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((a) => a.endsWith('.log'))
    .map((a) => readFileSync(join(dir, a), 'utf8'))
    .join('\n');
}

test('con --user-data crea la base, la migra, respalda y registra el arranque', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-'));
  try {
    const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
    const ventana = await app.firstWindow();
    await expect(ventana.getByRole('heading', { name: 'Procesos de valuación' })).toBeVisible();
    await app.close();

    expect(existsSync(join(userData, 'valuacion.db'))).toBe(true);
    expect(readdirSync(join(userData, 'respaldos')).some((a) => a.startsWith('valuacion-diario-'))).toBe(true);
    const registro = leerRegistro(userData);
    expect(registro).toContain('arranque');
    expect(registro).toContain('base de datos lista');
    expect(registro).toContain('respaldo diario creado');
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

test('una ruta de datos UNC bloquea el arranque sin abrir la base', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-unc-'));
  try {
    let codigoSalida: number | null = null;
    try {
      const app = await lanzarApp({
        argumentos: [`--user-data=${userData}`, '--datos=\\\\servidor-inexistente\\compartida\\valuacion'],
        env: { VALUACION_SIN_DIALOGO: '1' },
      });
      codigoSalida = await new Promise<number | null>((resolver) => {
        app.process().on('exit', (codigo) => resolver(codigo));
      });
    } catch {
      // El proceso puede terminar antes de completar el enlace con Playwright: la
      // evidencia que importa está en el registro y en la ausencia de la base.
    }

    const registro = leerRegistro(userData);
    expect(registro).toContain('unidad de red');
    expect(registro).not.toContain('base de datos lista');
    expect(existsSync(join(userData, 'valuacion.db'))).toBe(false);
    if (codigoSalida !== null) expect(codigoSalida).toBe(3);
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

/** Una base de una versión anterior, como la que deja instalada una versión de desarrollo. */
function sembrarBaseVieja(userData: string): void {
  const db = new Database(join(userData, 'valuacion.db'));
  db.exec('CREATE TABLE entidad (id TEXT PRIMARY KEY)');
  db.pragma('user_version = 3');
  db.close();
}

test('una base de otra versión no deja la app cerrada en silencio: sale con código y registro', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-vieja-'));
  try {
    sembrarBaseVieja(userData);
    let codigoSalida: number | null = null;
    try {
      const app = await lanzarApp({ argumentos: [`--user-data=${userData}`], env: { VALUACION_SIN_DIALOGO: '1' } });
      codigoSalida = await new Promise<number | null>((resolver) => {
        app.process().on('exit', (codigo) => resolver(codigo));
      });
    } catch {
      // Puede salir antes de que Playwright se enlace; la evidencia está en el registro.
    }
    expect(leerRegistro(userData)).toContain('la base de datos no es de esta aplicación');
    if (codigoSalida !== null) expect(codigoSalida).toBe(4);
    // Sin el consentimiento, la base queda exactamente donde estaba.
    expect(existsSync(join(userData, 'valuacion.db'))).toBe(true);
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

test('con consentimiento, la base de otra versión se aparta (no se borra) y la app abre en blanco', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-apartar-'));
  try {
    sembrarBaseVieja(userData);
    const app = await lanzarApp({ argumentos: [`--user-data=${userData}`], env: { VALUACION_SIN_DIALOGO: '1', VALUACION_APARTAR_BASE: '1' } });
    const ventana = await app.firstWindow();
    await expect(ventana.getByRole('heading', { name: 'Procesos de valuación' })).toBeVisible();
    await app.close();
    expect(readdirSync(userData).some((a) => /^valuacion-incompatible-.+\.db$/.test(a))).toBe(true);
    expect(leerRegistro(userData)).toContain('base incompatible apartada');
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
