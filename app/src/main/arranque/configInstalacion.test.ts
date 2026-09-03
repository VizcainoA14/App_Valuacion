/** T-B-06 — config.json de la instalación (nivel 2, plan 4.3 §3). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONFIG_POR_DEFECTO,
  guardarConfigInstalacion,
  leerConfigInstalacion,
} from './configInstalacion';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-config-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('leerConfigInstalacion', () => {
  it('sin archivo devuelve los valores por defecto del plan', () => {
    const { config, advertencia } = leerConfigInstalacion(join(dir, 'config.json'));
    expect(advertencia).toBeUndefined();
    expect(config).toEqual({
      version: 1,
      rutaDatos: null,
      tema: 'sistema',
      densidad: 'comoda',
      idiomaFecha: 'es-CO',
      respaldos: { diario: true, retencionDias: 30, rutaExterna: null },
      importacion: { formatoFechaRegional: 'DD/MM/AAAA' },
      ultimoEjercicioAbierto: null,
      ventana: { ancho: 1440, alto: 900, maximizada: false },
    });
  });

  it('un archivo parcial conserva los valores por defecto de lo que falta', () => {
    const ruta = join(dir, 'config.json');
    writeFileSync(ruta, JSON.stringify({ rutaDatos: 'D:\\datos', respaldos: { diario: false } }));
    const { config, advertencia } = leerConfigInstalacion(ruta);
    expect(advertencia).toBeUndefined();
    expect(config.rutaDatos).toBe('D:\\datos');
    expect(config.respaldos).toEqual({ diario: false, retencionDias: 30, rutaExterna: null });
    expect(config.tema).toBe('sistema');
  });

  it('JSON roto → valores por defecto con advertencia, nunca un valor inventado a medias', () => {
    const ruta = join(dir, 'config.json');
    writeFileSync(ruta, '{ esto no es json');
    const { config, advertencia } = leerConfigInstalacion(ruta);
    expect(config).toEqual(CONFIG_POR_DEFECTO);
    expect(advertencia).toContain('no es JSON válido');
  });

  it('valores inválidos → valores por defecto con advertencia que nombra el campo', () => {
    const ruta = join(dir, 'config.json');
    writeFileSync(ruta, JSON.stringify({ tema: 'fucsia', ventana: { ancho: 10 } }));
    const { config, advertencia } = leerConfigInstalacion(ruta);
    expect(config).toEqual(CONFIG_POR_DEFECTO);
    expect(advertencia).toContain('tema');
    expect(advertencia).toContain('ventana.ancho');
  });

  it('guardar y leer es idempotente', () => {
    const ruta = join(dir, 'sub', 'config.json');
    const config = { ...CONFIG_POR_DEFECTO, rutaDatos: 'D:\\valuacion', ultimoEjercicioAbierto: 'abc' };
    guardarConfigInstalacion(ruta, config);
    expect(leerConfigInstalacion(ruta).config).toEqual(config);
  });
});
