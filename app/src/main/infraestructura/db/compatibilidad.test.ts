/**
 * Una base de otra versión no se abre a ciegas. `user_version` solo cuenta
 * migraciones: una base de desarrollo anterior a ADR-029 tiene el mismo número
 * y otras tablas, y abrirla dejaba la aplicación cerrada sin decir nada.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBaseDePrueba } from './pruebas/semilla';
import { abrirSqlite, faltantesDelEsquema, prepararBaseDatos } from './index';

const ahora = (): string => '2026-09-25T10:00:00.000Z';

describe('compatibilidad de la base con la aplicación', () => {
  it('una base migrada por esta versión no tiene faltantes', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    expect(faltantesDelEsquema(sqlite)).toEqual([]);
  });

  it('una base con el mismo número de versión y otras tablas se rechaza, y queda cerrada', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'valuacion-compat-'));
    try {
      const ruta = join(dir, 'valuacion.db');
      const vieja = abrirSqlite(ruta);
      vieja.exec('CREATE TABLE entidad (id TEXT PRIMARY KEY)');
      vieja.pragma('user_version = 3');
      vieja.close();

      await expect(prepararBaseDatos(ruta, join(dir, 'respaldos'), ahora)).rejects.toMatchObject({ codigo: 'ESQUEMA_INCOMPATIBLE' });
      // Cerrada: se puede volver a abrir en exclusiva sin error de bloqueo.
      const otra = abrirSqlite(ruta);
      expect(() => otra.exec('BEGIN EXCLUSIVE; ROLLBACK;')).not.toThrow();
      otra.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('una base más nueva que la aplicación se rechaza con su propio código', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'valuacion-compat-'));
    try {
      const ruta = join(dir, 'valuacion.db');
      const nueva = abrirSqlite(ruta);
      nueva.pragma('user_version = 99');
      nueva.close();
      await expect(prepararBaseDatos(ruta, join(dir, 'respaldos'), ahora)).rejects.toMatchObject({ codigo: 'ESQUEMA_MAS_NUEVO' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
