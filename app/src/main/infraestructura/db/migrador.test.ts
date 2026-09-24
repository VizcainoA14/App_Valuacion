/** T-B-03 — migración desde vacío y desde la versión anterior. */
import { describe, expect, it, vi } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirSqlite } from './conexion';
import { cargarMigracionesDesdeDisco, migrar, ordenarMigraciones, versionEsquema } from './migrador';
import { MIGRACIONES } from './migraciones';
import { ErrorInfraestructura } from '../../../compartido/errores';

const dirMigraciones = join(dirname(fileURLToPath(import.meta.url)), 'migraciones');

function tablas(db: ReturnType<typeof abrirSqlite>): string[] {
  return (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'bien_fts%' ORDER BY name`,
      )
      .all() as { name: string }[]
  ).map((f) => f.name);
}

describe('migrar desde una base vacía', () => {
  it('aplica todas las migraciones y deja user_version = total', async () => {
    const db = abrirSqlite(':memory:');
    const resultado = await migrar(db, MIGRACIONES);

    expect(resultado.desde).toBe(0);
    expect(resultado.hasta).toBe(MIGRACIONES.length);
    expect(resultado.aplicadas).toEqual(MIGRACIONES.map((m) => m.nombre));
    expect(versionEsquema(db)).toBe(MIGRACIONES.length);
  });

  it('crea las 18 tablas del modelo de ADR-028 y la tabla FTS', async () => {
    const db = abrirSqlite(':memory:');
    await migrar(db, MIGRACIONES);
    expect(tablas(db)).toHaveLength(18);
    const fts = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bien_fts'`)
      .get();
    expect(fts).toBeDefined();
  });

  it('las claves foráneas están activas en la conexión', () => {
    const db = abrirSqlite(':memory:');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('una segunda ejecución no aplica nada ni llama al gancho de respaldo', async () => {
    const db = abrirSqlite(':memory:');
    await migrar(db, MIGRACIONES);
    const gancho = vi.fn();
    const segunda = await migrar(db, MIGRACIONES, { antesDeMigrar: gancho });
    expect(segunda.aplicadas).toEqual([]);
    expect(gancho).not.toHaveBeenCalled();
  });
});

describe('migrar desde la versión anterior', () => {
  it('aplica solo las pendientes y antes espera el respaldo', async () => {
    const db = abrirSqlite(':memory:');
    await migrar(db, MIGRACIONES.slice(0, 1));
    expect(versionEsquema(db)).toBe(1);

    const orden: string[] = [];
    const gancho = vi.fn(async (desde: number, hasta: number) => {
      orden.push(`respaldo ${desde}→${hasta}`);
      await Promise.resolve();
    });
    const resultado = await migrar(db, MIGRACIONES, { antesDeMigrar: gancho });

    expect(gancho).toHaveBeenCalledWith(1, MIGRACIONES.length);
    expect(orden).toEqual([`respaldo 1→${MIGRACIONES.length}`]);
    expect(resultado.desde).toBe(1);
    expect(resultado.aplicadas).toEqual(MIGRACIONES.slice(1).map((m) => m.nombre));
    expect(versionEsquema(db)).toBe(MIGRACIONES.length);
  });

  it('se niega a abrir una base más nueva que la aplicación', async () => {
    const db = abrirSqlite(':memory:');
    db.pragma('user_version = 99');
    await expect(migrar(db, MIGRACIONES)).rejects.toMatchObject({
      codigo: 'ESQUEMA_MAS_NUEVO',
    });
    await expect(migrar(db, MIGRACIONES)).rejects.toBeInstanceOf(ErrorInfraestructura);
  });

  it('una migración que falla no cambia la versión', async () => {
    const db = abrirSqlite(':memory:');
    const siguiente = String(MIGRACIONES.length).padStart(4, '0');
    const rota = [...MIGRACIONES, { nombre: `${siguiente}_rota.sql`, sql: 'CREATE TABLE x (' }];
    await expect(migrar(db, rota)).rejects.toThrow();
    expect(versionEsquema(db)).toBe(MIGRACIONES.length);
  });
});

describe('ordenación y carga', () => {
  it('rechaza una numeración con huecos', () => {
    expect(() =>
      ordenarMigraciones([
        { nombre: '0000_a.sql', sql: '' },
        { nombre: '0002_b.sql', sql: '' },
      ]),
    ).toThrow(ErrorInfraestructura);
  });

  it('las migraciones incrustadas coinciden con las del disco', () => {
    const disco = cargarMigracionesDesdeDisco(dirMigraciones);
    expect(disco.map((m) => m.nombre)).toEqual(MIGRACIONES.map((m) => m.nombre));
    disco.forEach((m, i) => expect(m.sql).toBe(MIGRACIONES[i]?.sql));
  });
});
