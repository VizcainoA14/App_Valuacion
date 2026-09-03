import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as esquema from './esquema';

export type ConexionSqlite = Database.Database;
export type BaseDatos = BetterSQLite3Database<typeof esquema>;

/**
 * Abre SQLite con los PRAGMA de plan 2.4 §1. `foreign_keys = ON` va en CADA
 * conexión: SQLite lo desactiva por defecto y las FK declaradas no se aplican.
 */
export function abrirSqlite(rutaArchivo: string): ConexionSqlite {
  const db = new Database(rutaArchivo);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  return db;
}

/** Drizzle sobre la conexión: CRUD tipado. El SQL crítico se escribe a mano (ADR-005). */
export function crearBaseDatos(sqlite: ConexionSqlite): BaseDatos {
  return drizzle(sqlite, { schema: esquema });
}

/** Compatibilidad con el esqueleto del hito A. */
export function abrirBaseDatos(rutaArchivo: string): ConexionSqlite {
  return abrirSqlite(rutaArchivo);
}

/** Criterio de T-A-03: la app instalada ejecuta SELECT 1 contra SQLite. */
export function probarConexion(db: ConexionSqlite): { conectada: boolean; versionSqlite: string } {
  const uno = db.prepare('SELECT 1 AS uno').get() as { uno: number };
  const fila = db.prepare('SELECT sqlite_version() AS version').get() as { version: string };
  return { conectada: uno.uno === 1, versionSqlite: fila.version };
}
