/**
 * Ruta del directorio de datos y bloqueo de unidades de red (T-B-06, RG-10, ADR-016).
 *
 * Precedencia (plan 4.3 §6): `--datos=<ruta>` → `config.json` → `userData`.
 * SQLite se corrompe con el bloqueo de archivos por red y aquí se custodia
 * evidencia contable: si la ruta es de red, la aplicación NO abre la base.
 */
import { isAbsolute, resolve } from 'node:path';
import type { ConfigInstalacion } from './configInstalacion';

export type OrigenRutaDatos = 'argumento' | 'config' | 'userData';

export interface RutaDatos {
  readonly ruta: string;
  readonly origen: OrigenRutaDatos;
}

export const MENSAJE_BLOQUEO_RED =
  'La base de datos no puede residir en una unidad de red. SQLite se corrompe con el bloqueo de ' +
  'archivos por red, y este sistema custodia evidencia contable. Use una ruta local y configure un ' +
  'respaldo automático hacia la carpeta institucional (respaldos.rutaExterna en config.json).';

export function leerArgumento(argv: readonly string[], nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const arg = argv.find((a) => a.startsWith(prefijo));
  return arg === undefined ? undefined : arg.slice(prefijo.length);
}

export function resolverRutaDatos(
  argv: readonly string[],
  config: ConfigInstalacion,
  userData: string,
): RutaDatos {
  const porArgumento = leerArgumento(argv, 'datos');
  if (porArgumento !== undefined && porArgumento !== '') {
    return { ruta: resolve(porArgumento), origen: 'argumento' };
  }
  if (config.rutaDatos !== null) return { ruta: resolve(config.rutaDatos), origen: 'config' };
  return { ruta: userData, origen: 'userData' };
}

/** `\\servidor\recurso\...` o `//servidor/recurso/...`. Determinista, sin consultar al sistema. */
export function esRutaUnc(ruta: string): boolean {
  return /^(\\\\|\/\/)[^\\/]+[\\/]/.test(ruta);
}

/** `X:\...` → `X`; otras rutas → null. */
export function letraUnidad(ruta: string): string | null {
  const m = /^([A-Za-z]):[\\/]/.exec(ruta);
  return m?.[1] === undefined ? null : m[1].toUpperCase();
}

export type TipoUnidad = 'red' | 'local' | 'desconocido';

/** Win32_LogicalDisk.DriveType: 3 = disco local, 4 = unidad de red, 2 = extraíble, 5 = CD. */
export function interpretarTipoUnidadWindows(salida: string): TipoUnidad {
  const valor = salida.trim();
  if (valor === '4') return 'red';
  if (/^[2356]$/.test(valor)) return 'local';
  return 'desconocido';
}

/** Tipos de sistema de archivos de red en Linux/macOS (salida de `df -P -T` / `stat -f`). */
export function interpretarTipoSistemaArchivos(tipo: string): TipoUnidad {
  const t = tipo.trim().toLowerCase();
  if (t === '') return 'desconocido';
  return /^(nfs|nfs4|cifs|smb|smbfs|smb2|smb3|afp|afpfs|fuse\.sshfs|webdav|davfs|ncpfs|9p)$/.test(t)
    ? 'red'
    : 'local';
}

/** Ejecuta un comando y devuelve su salida estándar. Se inyecta para poder probar sin sistema. */
export type Ejecutor = (comando: string, argumentos: readonly string[]) => Promise<string>;

/**
 * Verdadero si la ruta está en una unidad de red. UNC se detecta sin consultar nada;
 * las unidades mapeadas se consultan al sistema (PowerShell en Windows, `df` en el resto).
 * Si la consulta falla se devuelve `false`: la detección no debe impedir arrancar por
 * un fallo del sistema, pero el evento se registra por el llamador.
 */
export async function esUnidadDeRed(
  ruta: string,
  plataforma: NodeJS.Platform,
  ejecutar: Ejecutor,
): Promise<{ esRed: boolean; tipo: TipoUnidad; detalle: string }> {
  if (esRutaUnc(ruta)) return { esRed: true, tipo: 'red', detalle: 'ruta UNC' };
  if (!isAbsolute(ruta)) return { esRed: false, tipo: 'desconocido', detalle: 'ruta relativa' };

  try {
    if (plataforma === 'win32') {
      const letra = letraUnidad(ruta);
      if (letra === null) return { esRed: false, tipo: 'desconocido', detalle: 'sin letra de unidad' };
      const salida = await ejecutar('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${letra}:'").DriveType`,
      ]);
      const tipo = interpretarTipoUnidadWindows(salida);
      return { esRed: tipo === 'red', tipo, detalle: `unidad ${letra}: DriveType=${salida.trim()}` };
    }
    const salida = await ejecutar('df', ['-P', '-T', ruta]);
    const ultimaLinea = salida.trim().split('\n').pop() ?? '';
    const tipoFs = ultimaLinea.split(/\s+/)[1] ?? '';
    const tipo = interpretarTipoSistemaArchivos(tipoFs);
    return { esRed: tipo === 'red', tipo, detalle: `sistema de archivos ${tipoFs || 'desconocido'}` };
  } catch (e) {
    return {
      esRed: false,
      tipo: 'desconocido',
      detalle: `no se pudo consultar el tipo de unidad: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
