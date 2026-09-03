/**
 * Helpers de columna que hacen legible el tipo físico (plan 2.4 §2):
 *   *_cent  INTEGER  centavos          *_x10k  INTEGER  ×10.000 (4 decimales)
 *   fecha   TEXT     AAAA-MM-DD        *_en    TEXT     ISO 8601 UTC
 *   bool    INTEGER  0/1 + CHECK       enum    TEXT     + CHECK IN (catálogo)
 *
 * Los CHECK de enums se generan desde MOD-00: un valor nuevo en el catálogo
 * exige una migración, nunca aparece en la base sin pasar por aquí.
 *
 * NOTA: drizzle-kit no resuelve los alias de tsconfig; por eso los esquemas
 * importan de `compartido` con rutas relativas.
 */
import { sql, type SQL } from 'drizzle-orm';
import { text, integer, check, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Catalogo } from '../../../../compartido/enums/definirCatalogo';

export const uuidPk = () => text('id').primaryKey();
export const uuid = (nombre: string) => text(nombre);
export const texto = (nombre: string) => text(nombre);
export const entero = (nombre: string) => integer(nombre);
/** Dinero: entero de centavos. El sufijo `_cent` va en la columna, no en la propiedad. */
export const centavos = (nombre: string) => integer(`${nombre}_cent`);
/** Índices, factores, áreas, años con decimales: entero ×10.000. */
export const x10k = (nombre: string) => integer(`${nombre}_x10k`);
export const fecha = (nombre: string) => text(nombre);
export const marcaTiempo = (nombre: string) => text(nombre);
export const booleano = (nombre: string) => integer(nombre, { mode: 'boolean' });
export const json = (nombre: string) => text(nombre);

export function enumCatalogo<V extends string>(nombre: string, catalogo: Catalogo<V>) {
  return text(nombre, { enum: catalogo.valores as unknown as readonly [V, ...V[]] });
}

/** Marca de tiempo UTC generada por SQLite al insertar. */
export const AHORA_UTC = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const creadoEn = () => marcaTiempo('creado_en').notNull().default(AHORA_UTC);
export const actualizadoEn = () => marcaTiempo('actualizado_en').notNull().default(AHORA_UTC);

function literales(valores: readonly string[]): SQL {
  return sql.raw(valores.map((v) => `'${v}'`).join(', '));
}

/** `CHECK (col IN ('A','B',…))` con los valores literales del catálogo. */
export function chkCatalogo(nombre: string, columna: AnySQLiteColumn, catalogo: Catalogo<string>) {
  return check(nombre, sql`${columna} IN (${literales(catalogo.valores)})`);
}

/** SQLite no tiene booleano: `CHECK (col IN (0, 1))`. */
export function chkBooleano(nombre: string, columna: AnySQLiteColumn) {
  return check(nombre, sql`${columna} IN (0, 1)`);
}

export function chkNoNegativo(nombre: string, columna: AnySQLiteColumn) {
  return check(nombre, sql`${columna} >= 0`);
}
