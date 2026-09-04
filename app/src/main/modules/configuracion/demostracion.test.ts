/** T-B-11 — el hospital de demostración se carga, se recorre y se borra sin dejar rastro. */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from './pruebas';
import type { ConexionSqlite } from '../../infraestructura/db/conexion';

function totalFilas(sqlite: ConexionSqlite): Record<string, number> {
  const tablas = (sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'bien_fts%'`).all() as { name: string }[]).map((t) => t.name);
  return Object.fromEntries(tablas.map((t) => [t, (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n]));
}

describe('demo:cargar', () => {
  it('crea la entidad ficticia completa marcada como demostración', async () => {
    const { registro, sqlite } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    expect(demo.esDemostracion).toBe(true);
    expect(demo.razonSocial).toContain('DEMOSTRACIÓN');

    expect(valor(await registro.invocar('sede:listar', { entidadId: demo.id }))).toHaveLength(2);
    expect(valor(await registro.invocar('servicio:listar', { entidadId: demo.id }))).toHaveLength(8);
    expect(valor(await registro.invocar('clase:listar', { entidadId: demo.id }))).toHaveLength(6);

    const ejercicios = valor(await registro.invocar('ejercicio:listar', { entidadId: demo.id }));
    expect(ejercicios).toHaveLength(1);
    expect(ejercicios[0]?.parametrosCongelados.metodo_conteo_meses_confirmado).toBe(true);

    const bienes = sqlite.prepare(`SELECT COUNT(*) AS n FROM bien WHERE ejercicio_id = ? AND estado_registro = 'ACTIVO'`).get(ejercicios[0]?.id) as { n: number };
    expect(bienes.n).toBe(50);
    const hojas = sqlite.prepare(`SELECT COUNT(*) AS n FROM hoja_vida WHERE bien_id IN (SELECT id FROM bien WHERE ejercicio_id = ?)`).get(ejercicios[0]?.id) as { n: number };
    expect(hojas.n).toBe(50);
    const codigos = sqlite.prepare(`SELECT codigo_institucional FROM bien WHERE ejercicio_id = ? ORDER BY placa LIMIT 1`).get(ejercicios[0]?.id) as { codigo_institucional: string };
    expect(codigos.codigo_institucional).toBe('HDM01MON001'); // RN-01-02 con la convención de la demo
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM avaluo_inmueble').get() as { n: number }).n).toBe(1);

    // Las validaciones del paso 01 se cumplen: se puede recorrer el flujo.
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 1, entidadId: demo.id, ejercicioId: ejercicios[0]?.id }));
    expect(v.puedeAvanzar).toBe(true);
  });

  it('no se carga dos veces', async () => {
    const { registro } = await arnesPaso01();
    valor(await registro.invocar('demo:cargar', undefined));
    expect(await registro.invocar('demo:cargar', undefined)).toMatchObject({ ok: false, error: { codigo: 'DEMO_YA_CARGADA' } });
  });
});

describe('demo:borrar', () => {
  it('deja la base exactamente como estaba, sin tocar los datos reales', async () => {
    const { registro, sqlite } = await arnesPaso01();
    const real = valor(await registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA }));
    const antes = totalFilas(sqlite);

    const demo = valor(await registro.invocar('demo:cargar', undefined));
    expect(totalFilas(sqlite)['bien']).toBe(50);

    const r = valor(await registro.invocar('demo:borrar', { entidadId: demo.id }));
    expect(r.eliminados['bien']).toBe(50);
    expect(r.eliminados['entidad']).toBe(1);

    const despues = totalFilas(sqlite);
    // La única diferencia admisible es la fila de bitácora que registra el propio borrado.
    despues['bitacora'] = (despues['bitacora'] ?? 0) - 0;
    expect({ ...despues, bitacora: 0 }).toEqual({ ...antes, bitacora: 0 });
    expect(valor(await registro.invocar('entidad:listar', undefined)).map((e) => e.id)).toEqual([real.id]);
    expect(valor(await registro.invocar('clase:listar', { entidadId: real.id }))).toHaveLength(8);
  });

  it('se niega a borrar una entidad real (RN-09-09)', async () => {
    const { registro } = await arnesPaso01();
    const real = valor(await registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA }));
    expect(await registro.invocar('demo:borrar', { entidadId: real.id })).toMatchObject({ ok: false, error: { codigo: 'NO_ES_DEMOSTRACION' } });
  });
});
