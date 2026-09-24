/** T-B-03 — respaldo verificado y restauración (RG-11). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { abrirBaseDePrueba, sembrarMinimo } from './pruebas/semilla';
import { crearRespaldoVerificado, verificarIntegridad, rutaRespaldo } from './respaldo';
import { versionEsquema } from './migrador';
import { prepararBaseDatos } from './index';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-respaldo-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('crearRespaldoVerificado', () => {
  it('copia consistente que abre, pasa integrity_check y conserva los datos', async () => {
    const { sqlite, db } = await abrirBaseDePrueba(join(dir, 'origen.db'));
    const ids = sembrarMinimo(db);

    const destino = join(dir, 'respaldos', 'copia.db');
    const r = await crearRespaldoVerificado(sqlite, destino);
    expect(r.ruta).toBe(destino);
    expect(r.bytes).toBeGreaterThan(0);

    // Restauración: la copia se abre sola y contiene lo mismo.
    const copia = new Database(destino, { readonly: true });
    const fila = copia.prepare('SELECT razon_social FROM proceso WHERE id = ?').get(ids.proceso) as {
      razon_social: string;
    };
    expect(fila.razon_social).toBe('E.S.E Hospital de Prueba');
    expect(copia.pragma('user_version', { simple: true })).toBe(versionEsquema(sqlite));
    copia.close();
    sqlite.close();
  });

  it('verificarIntegridad es falso para un archivo que no es SQLite', () => {
    const basura = join(dir, 'basura.db');
    writeFileSync(basura, 'esto no es una base de datos');
    expect(verificarIntegridad(basura)).toBe(false);
    expect(verificarIntegridad(join(dir, 'no-existe.db'))).toBe(false);
  });

  it('nombra el respaldo con motivo y marca de tiempo compacta', () => {
    expect(rutaRespaldo('/r', 'pre-migracion', '2026-09-02T14:03:07.123Z')).toBe(
      join('/r', 'valuacion-pre-migracion-20260902-140307.db'),
    );
  });
});

describe('prepararBaseDatos', () => {
  it('respalda antes de migrar una base con versión anterior', async () => {
    const ruta = join(dir, 'app.db');
    // Base "de la versión anterior": solo la primera migración.
    const vieja = new Database(ruta);
    const { MIGRACIONES } = await import('./migraciones');
    const { migrar } = await import('./migrador');
    await migrar(vieja, MIGRACIONES.slice(0, 1));
    vieja.close();

    const dirRespaldos = join(dir, 'respaldos');
    const abierta = await prepararBaseDatos(ruta, dirRespaldos, () => '2026-09-02T10:00:00.000Z');
    try {
      expect(abierta.migracion.desde).toBe(1);
      expect(abierta.migracion.hasta).toBe(MIGRACIONES.length);
      const esperado = join(
        dirRespaldos,
        `valuacion-pre-migracion-v1-a-v${MIGRACIONES.length}-20260902-100000.db`,
      );
      expect(existsSync(esperado)).toBe(true);
      expect(verificarIntegridad(esperado)).toBe(true);
    } finally {
      abierta.sqlite.close();
    }
  });

  it('no respalda una base nueva', async () => {
    const dirRespaldos = join(dir, 'respaldos');
    const abierta = await prepararBaseDatos(join(dir, 'nueva.db'), dirRespaldos, () => 'x');
    expect(abierta.migracion.desde).toBe(0);
    expect(existsSync(dirRespaldos)).toBe(false);
    abierta.sqlite.close();
  });
});
