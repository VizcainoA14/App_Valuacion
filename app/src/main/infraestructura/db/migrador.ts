/**
 * Migrador propio (T-B-03, plan 2.4 §7).
 *
 * - Migraciones numeradas, solo hacia adelante, nunca editadas tras publicarse.
 * - La versión vive en `PRAGMA user_version` = número de migraciones aplicadas.
 * - Cada migración se aplica en su propia transacción junto con el cambio de versión.
 * - Si la base es MÁS NUEVA que la aplicación, se rechaza abrirla y se explica.
 * - Antes de migrar una base con datos se espera el gancho de respaldo (RG-11).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorInfraestructura } from '../../../compartido/errores';
import type { ConexionSqlite } from './conexion';

export interface Migracion {
  /** Nombre de archivo, p. ej. `0000_esquema_inicial.sql`. */
  readonly nombre: string;
  readonly sql: string;
}

export interface ResultadoMigracion {
  readonly desde: number;
  readonly hasta: number;
  readonly aplicadas: readonly string[];
}

export interface OpcionesMigracion {
  /** Se espera una vez, antes de la primera migración pendiente, si la base ya tenía versión > 0. */
  readonly antesDeMigrar?: (desde: number, hasta: number) => void | Promise<void>;
}

const PATRON_ARCHIVO = /^(\d{4})_.+\.sql$/;

/** Ordena por el prefijo numérico y exige que sea consecutivo desde 0000. */
export function ordenarMigraciones(migraciones: readonly Migracion[]): Migracion[] {
  const ordenadas = [...migraciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
  ordenadas.forEach((m, i) => {
    const partes = PATRON_ARCHIVO.exec(m.nombre);
    if (partes === null || Number(partes[1]) !== i) {
      throw new ErrorInfraestructura(
        'MIGRACION_MAL_NUMERADA',
        `La migración "${m.nombre}" rompe la secuencia: se esperaba el prefijo ${String(i).padStart(4, '0')}.`,
      );
    }
  });
  return ordenadas;
}

/** Para scripts y CI: lee los .sql del directorio (drizzle-kit deja `meta/` al lado; se ignora). */
export function cargarMigracionesDesdeDisco(directorio: string): Migracion[] {
  const archivos = readdirSync(directorio).filter((a) => PATRON_ARCHIVO.test(a));
  return ordenarMigraciones(
    archivos.map((nombre) => ({ nombre, sql: readFileSync(join(directorio, nombre), 'utf8') })),
  );
}

export function versionEsquema(db: ConexionSqlite): number {
  return db.pragma('user_version', { simple: true }) as number;
}

export async function migrar(
  db: ConexionSqlite,
  migraciones: readonly Migracion[],
  opciones: OpcionesMigracion = {},
): Promise<ResultadoMigracion> {
  const ordenadas = ordenarMigraciones(migraciones);
  const desde = versionEsquema(db);
  const hasta = ordenadas.length;

  if (desde > hasta) {
    throw new ErrorInfraestructura(
      'ESQUEMA_MAS_NUEVO',
      `La base de datos está en la versión ${desde} y esta aplicación solo conoce hasta la ${hasta}. ` +
        'Se instaló una versión anterior de la aplicación: actualícela antes de abrir esta base.',
    );
  }

  const pendientes = ordenadas.slice(desde);
  if (pendientes.length === 0) return { desde, hasta, aplicadas: [] };

  if (desde > 0) await opciones.antesDeMigrar?.(desde, hasta);

  const aplicadas: string[] = [];
  pendientes.forEach((migracion, i) => {
    const version = desde + i + 1;
    db.transaction(() => {
      db.exec(migracion.sql);
      db.pragma(`user_version = ${version}`);
    })();
    aplicadas.push(migracion.nombre);
  });

  return { desde, hasta, aplicadas };
}
