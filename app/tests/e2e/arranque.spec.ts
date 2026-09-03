/**
 * E2E del hito A: la aplicación arranca, la ventana abre y SQLite responde por el
 * camino real renderer → preload → main → better-sqlite3.
 */
import { test, expect } from '@playwright/test';
import { lanzarApp } from './_lanzar';

test('la app arranca, abre ventana y consulta SQLite', async () => {
  const app = await lanzarApp();
  const ventana = await app.firstWindow();

  await expect(ventana).toHaveTitle('Valuación de Activos');
  await expect(ventana.getByRole('heading', { name: 'Entidades' })).toBeVisible();

  // Criterio de T-A-03: SELECT 1 contra SQLite, por el IPC real.
  const estado = await ventana.evaluate(() =>
    (globalThis as unknown as { api: { invocar: (c: string) => Promise<{ ok: boolean; valor?: { baseDatos: { conectada: boolean; versionSqlite: string }; versionEsquema: number } }> } }).api.invocar('app:obtenerEstado'),
  );
  expect(estado.ok).toBe(true);
  expect(estado.valor?.baseDatos.conectada).toBe(true);
  expect(estado.valor?.versionEsquema).toBeGreaterThan(0);

  await app.close();
});

test('el renderer está aislado: sin Node y solo window.api (T-A-07, conductual)', async () => {
  const app = await lanzarApp();
  const ventana = await app.firstWindow();

  const aislamiento = await ventana.evaluate(() => ({
    tieneRequire: typeof (globalThis as { require?: unknown }).require !== 'undefined',
    tieneProcess: typeof (globalThis as { process?: unknown }).process !== 'undefined',
    tieneApi: typeof (globalThis as { api?: unknown }).api !== 'undefined',
  }));

  expect(aislamiento.tieneRequire).toBe(false); // nodeIntegration: false
  expect(aislamiento.tieneProcess).toBe(false); // sandbox activo
  expect(aislamiento.tieneApi).toBe(true); // contextBridge expone la única puerta

  await app.close();
});

test('window.api expone exactamente invocar y suscribir (T-B-08, plan 2.3 §9)', async () => {
  const app = await lanzarApp();
  const ventana = await app.firstWindow();

  const claves = await ventana.evaluate(() =>
    Object.keys((globalThis as unknown as { api: Record<string, unknown> }).api).sort(),
  );
  expect(claves).toEqual(['invocar', 'suscribir']);

  // Un canal fuera del contrato se rechaza en el preload, sin llegar al main.
  const rechazo = await ventana.evaluate(() =>
    (globalThis as unknown as { api: { invocar: (c: string) => Promise<unknown> } }).api.invocar(
      'db:query',
    ),
  );
  expect(rechazo).toMatchObject({ ok: false, error: { codigo: 'CANAL_NO_PERMITIDO' } });

  await app.close();
});
