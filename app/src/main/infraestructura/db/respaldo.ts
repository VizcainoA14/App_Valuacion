/**
 * Respaldos (T-B-03, plan 2.4 §8; riesgo RG-11).
 * Siempre con la API `backup()` de SQLite —consistente con WAL activo— y nunca
 * copiando el archivo. Un respaldo no verificado no cuenta como respaldo.
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ErrorInfraestructura } from '../../../compartido/errores';
import type { ConexionSqlite } from './conexion';

export interface RespaldoVerificado {
  readonly ruta: string;
  readonly bytes: number;
}

/** Verifica que un archivo SQLite abre y pasa `PRAGMA integrity_check`. */
export function verificarIntegridad(rutaArchivo: string): boolean {
  let copia: Database.Database | undefined;
  try {
    copia = new Database(rutaArchivo, { readonly: true, fileMustExist: true });
    return copia.pragma('integrity_check', { simple: true }) === 'ok';
  } catch {
    return false;
  } finally {
    copia?.close();
  }
}

/** Copia consistente + verificación. Si la copia no pasa la comprobación, se borra y se lanza. */
export async function crearRespaldoVerificado(
  db: ConexionSqlite,
  rutaDestino: string,
): Promise<RespaldoVerificado> {
  mkdirSync(dirname(rutaDestino), { recursive: true });
  if (existsSync(rutaDestino)) unlinkSync(rutaDestino);

  await db.backup(rutaDestino);

  if (!verificarIntegridad(rutaDestino)) {
    unlinkSync(rutaDestino);
    throw new ErrorInfraestructura(
      'RESPALDO_CORRUPTO',
      `El respaldo generado en ${rutaDestino} no pasó la verificación de integridad y se descartó.`,
    );
  }
  return { ruta: rutaDestino, bytes: statSync(rutaDestino).size };
}

/** `valuacion-<motivo>-<AAAAMMDD-HHMMSS>.db` dentro del directorio de respaldos. */
export function rutaRespaldo(directorio: string, motivo: string, marcaIso: string): string {
  const marca = marcaIso.replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return join(directorio, `valuacion-${motivo}-${marca}.db`);
}
