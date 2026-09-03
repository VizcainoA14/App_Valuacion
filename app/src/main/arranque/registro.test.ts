/** T-B-06 — registro técnico con rotación de 14 días (plan 4.3 §5). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearRegistro, interpretarNivel, rotarRegistros } from './registro';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-logs-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const ahora = () => new Date('2026-09-02T14:05:00.000Z');

describe('crearRegistro', () => {
  it('escribe en app-AAAA-MM-DD.log con nivel, marca y datos', () => {
    const registro = crearRegistro(dir, 'info', ahora);
    registro.info('arranque', { version: '0.1.0' });
    registro.debug('esto no se escribe en nivel info');
    registro.error('falló algo');

    expect(registro.ruta).toBe(join(dir, 'app-2026-09-02.log'));
    const lineas = readFileSync(registro.ruta, 'utf8').trim().split('\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toBe('2026-09-02T14:05:00.000Z INFO  arranque {"version":"0.1.0"}');
    expect(lineas[1]).toBe('2026-09-02T14:05:00.000Z ERROR falló algo');
  });

  it('en nivel debug escribe todo', () => {
    const registro = crearRegistro(dir, 'debug', ahora);
    registro.debug('detalle');
    expect(readFileSync(registro.ruta, 'utf8')).toContain('DEBUG detalle');
  });

  it('interpretarNivel cae a info ante valores raros', () => {
    expect(interpretarNivel('debug')).toBe('debug');
    expect(interpretarNivel('verbose')).toBe('info');
    expect(interpretarNivel(undefined)).toBe('info');
  });
});

describe('rotación', () => {
  it('borra los registros con más de 14 días y conserva el resto', () => {
    for (const f of ['2026-08-01', '2026-08-18', '2026-08-19', '2026-09-01']) {
      writeFileSync(join(dir, `app-${f}.log`), '');
    }
    writeFileSync(join(dir, 'otro.txt'), '');

    const borrados = rotarRegistros(dir, ahora());

    expect(borrados.sort()).toEqual(['app-2026-08-01.log', 'app-2026-08-18.log']);
    expect(existsSync(join(dir, 'app-2026-08-19.log'))).toBe(true);
    expect(existsSync(join(dir, 'app-2026-09-01.log'))).toBe(true);
    expect(existsSync(join(dir, 'otro.txt'))).toBe(true);
  });
});
