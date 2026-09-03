/** T-B-06 — ruta de datos y detección de unidad de red (RG-10). */
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  esRutaUnc,
  letraUnidad,
  interpretarTipoUnidadWindows,
  interpretarTipoSistemaArchivos,
  esUnidadDeRed,
  resolverRutaDatos,
  leerArgumento,
} from './rutaDatos';
import { CONFIG_POR_DEFECTO } from './configInstalacion';

describe('esRutaUnc', () => {
  it('reconoce rutas UNC en ambas grafías', () => {
    expect(esRutaUnc('\\\\servidor\\compartida\\datos')).toBe(true);
    expect(esRutaUnc('//servidor/compartida/datos')).toBe(true);
  });

  it('no confunde rutas locales', () => {
    expect(esRutaUnc('C:\\Users\\hospital\\AppData\\Roaming\\valuacion')).toBe(false);
    expect(esRutaUnc('/home/hospital/valuacion')).toBe(false);
    expect(esRutaUnc('\\solo-una-barra')).toBe(false);
  });
});

describe('interpretación del sistema', () => {
  it('letra de unidad', () => {
    expect(letraUnidad('D:\\datos\\valuacion')).toBe('D');
    expect(letraUnidad('c:/datos')).toBe('C');
    expect(letraUnidad('\\\\srv\\x')).toBeNull();
    expect(letraUnidad('/home/x')).toBeNull();
  });

  it('DriveType de Windows: 4 es red', () => {
    expect(interpretarTipoUnidadWindows('4\r\n')).toBe('red');
    expect(interpretarTipoUnidadWindows('3')).toBe('local');
    expect(interpretarTipoUnidadWindows('')).toBe('desconocido');
    expect(interpretarTipoUnidadWindows('error')).toBe('desconocido');
  });

  it('sistemas de archivos de red en Linux/macOS', () => {
    expect(interpretarTipoSistemaArchivos('cifs')).toBe('red');
    expect(interpretarTipoSistemaArchivos('NFS4')).toBe('red');
    expect(interpretarTipoSistemaArchivos('ext4')).toBe('local');
    expect(interpretarTipoSistemaArchivos('apfs')).toBe('local');
    expect(interpretarTipoSistemaArchivos('')).toBe('desconocido');
  });
});

describe('esUnidadDeRed', () => {
  const nuncaLlamar = async (): Promise<string> => {
    throw new Error('no debería consultar al sistema');
  };

  it('una UNC es red sin consultar al sistema', async () => {
    const r = await esUnidadDeRed('\\\\servidor\\datos', 'win32', nuncaLlamar);
    expect(r).toMatchObject({ esRed: true, tipo: 'red' });
  });

  it('en Windows consulta el DriveType de la letra', async () => {
    const llamadas: string[][] = [];
    const ejecutar = async (cmd: string, args: readonly string[]): Promise<string> => {
      llamadas.push([cmd, ...args]);
      return '4\r\n';
    };
    const r = await esUnidadDeRed('Z:\\valuacion', 'win32', ejecutar);
    expect(r.esRed).toBe(true);
    expect(llamadas[0]?.[0]).toBe('powershell');
    expect(llamadas[0]?.join(' ')).toContain("DeviceID='Z:'");

    const local = await esUnidadDeRed('C:\\valuacion', 'win32', async () => '3');
    expect(local.esRed).toBe(false);
  });

  it('en Linux lee el tipo de sistema de archivos de df', async () => {
    const salida = 'Filesystem     Type 1024-blocks Used Available Capacity Mounted on\n//srv/datos    cifs   100 10 90 10% /mnt/datos\n';
    const r = await esUnidadDeRed('/mnt/datos', 'linux', async () => salida);
    expect(r).toMatchObject({ esRed: true, tipo: 'red' });
  });

  it('si la consulta falla, no bloquea pero lo dice', async () => {
    const r = await esUnidadDeRed('C:\\valuacion', 'win32', nuncaLlamar);
    expect(r.esRed).toBe(false);
    expect(r.tipo).toBe('desconocido');
    expect(r.detalle).toContain('no se pudo consultar');
  });
});

describe('resolverRutaDatos (precedencia plan 4.3 §6)', () => {
  it('argumento > config > userData', () => {
    const userData = 'C:\\Users\\x\\AppData\\Roaming\\valuacion';
    const conConfig = { ...CONFIG_POR_DEFECTO, rutaDatos: 'D:\\datos' };

    expect(resolverRutaDatos(['--datos=E:\\otro'], conConfig, userData)).toEqual({
      ruta: resolve('E:\\otro'),
      origen: 'argumento',
    });
    expect(resolverRutaDatos([], conConfig, userData)).toEqual({ ruta: resolve('D:\\datos'), origen: 'config' });
    expect(resolverRutaDatos([], CONFIG_POR_DEFECTO, userData)).toEqual({ ruta: userData, origen: 'userData' });
    expect(resolverRutaDatos(['--datos='], CONFIG_POR_DEFECTO, userData).origen).toBe('userData');
  });

  it('leerArgumento', () => {
    expect(leerArgumento(['app', '--log=debug'], 'log')).toBe('debug');
    expect(leerArgumento(['app'], 'log')).toBeUndefined();
  });
});
