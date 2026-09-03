/** T-B-06 — respaldo diario rotativo (plan 2.4 §8). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBaseDePrueba } from '../infraestructura/db/pruebas/semilla';
import { verificarIntegridad } from '../infraestructura/db/respaldo';
import { nombreRespaldoDiario, respaldoDiario } from './respaldoDiario';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-diario-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('respaldoDiario', () => {
  it('crea el respaldo del día una sola vez y lo verifica', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    const destino = join(dir, 'respaldos');

    const primero = await respaldoDiario(sqlite, destino, '2026-09-02');
    expect(primero.creado).toBe(true);
    expect(primero.ruta).toBe(join(destino, 'valuacion-diario-20260902.db'));
    expect(verificarIntegridad(primero.ruta)).toBe(true);

    const segundo = await respaldoDiario(sqlite, destino, '2026-09-02');
    expect(segundo.creado).toBe(false);
    sqlite.close();
  });

  it('conserva solo los últimos 10 diarios', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    const destino = join(dir, 'respaldos');
    mkdirSync(destino, { recursive: true });
    for (let d = 1; d <= 12; d++) {
      writeFileSync(join(destino, nombreRespaldoDiario(`2026-08-${String(d).padStart(2, '0')}`)), '');
    }
    writeFileSync(join(destino, 'valuacion-pre-migracion-v1-a-v2-20260801-000000.db'), '');

    const r = await respaldoDiario(sqlite, destino, '2026-09-02');

    expect(r.creado).toBe(true);
    expect(r.eliminados).toEqual([
      'valuacion-diario-20260801.db',
      'valuacion-diario-20260802.db',
      'valuacion-diario-20260803.db',
    ]);
    const diarios = readdirSync(destino).filter((a) => a.startsWith('valuacion-diario-'));
    expect(diarios).toHaveLength(10);
    expect(existsSync(join(destino, 'valuacion-diario-20260902.db'))).toBe(true);
    // Los respaldos de migración no entran en la rotación diaria (retención permanente).
    expect(existsSync(join(destino, 'valuacion-pre-migracion-v1-a-v2-20260801-000000.db'))).toBe(true);
    sqlite.close();
  });
});
