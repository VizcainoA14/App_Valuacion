/** T-B-11 — el proceso de demostración se carga, se recorre y se borra sin dejar rastro. */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, PROCESO_PRUEBA, valor } from './pruebas';
import type { ConexionSqlite } from '../../infraestructura/db/conexion';

function totalFilas(sqlite: ConexionSqlite): Record<string, number> {
  const tablas = (sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'bien_fts%'`).all() as { name: string }[]).map((t) => t.name);
  return Object.fromEntries(tablas.map((t) => [t, (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n]));
}

describe('demo:cargar', () => {
  it('crea el proceso ficticio completo marcado como demostración', async () => {
    const { registro, sqlite } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    expect(demo.esDemostracion).toBe(true);
    expect(demo.razonSocial).toContain('DEMOSTRACIÓN');
    expect(demo).toMatchObject({ fechaCorte: '2025-06-30', estado: 'EN_CURSO' });

    expect(valor(await registro.invocar('sede:listar', { procesoId: demo.id }))).toHaveLength(2);
    expect(valor(await registro.invocar('servicio:listar', { procesoId: demo.id }))).toHaveLength(8);
    expect(valor(await registro.invocar('clase:listar', { procesoId: demo.id }))).toHaveLength(6);

    const bienes = sqlite.prepare(`SELECT COUNT(*) AS n FROM bien WHERE proceso_id = ? AND estado_registro = 'ACTIVO'`).get(demo.id) as { n: number };
    expect(bienes.n).toBe(50);
    const hojas = sqlite.prepare(`SELECT COUNT(*) AS n FROM hoja_vida WHERE bien_id IN (SELECT id FROM bien WHERE proceso_id = ?)`).get(demo.id) as { n: number };
    expect(hojas.n).toBe(50);
    const codigos = sqlite.prepare(`SELECT codigo_institucional FROM bien WHERE proceso_id = ? ORDER BY placa LIMIT 1`).get(demo.id) as { codigo_institucional: string };
    expect(codigos.codigo_institucional).toBe('HDM01MON001'); // RN-01-02 con la convención de la demo
    // Sin calcular: es lo primero que hace quien la usa, como en un proceso real.
    expect(valor(await registro.invocar('corte:actual', { procesoId: demo.id }))).toBeNull();

    // La configuración está lista: se puede calcular de inmediato.
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: demo.id }));
    expect(v.lista).toBe(true);
    const r = valor(await registro.invocar('calculo:ejecutar', { procesoId: demo.id }));
    expect(r.resumen.bienesConsiderados).toBe(50);
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
    const real = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA }));
    const antes = totalFilas(sqlite);

    const demo = valor(await registro.invocar('demo:cargar', undefined));
    expect(totalFilas(sqlite)['bien']).toBe(50);
    // Calculado, con una baja registrada y finalizado: el borrado se lo lleva todo igual.
    valor(await registro.invocar('calculo:ejecutar', { procesoId: demo.id }));
    const bien = valor(await registro.invocar('bien:listar', { procesoId: demo.id, tamano: 1 })).filas[0];
    valor(await registro.invocar('baja:registrar', { bienId: bien?.id ?? '', fecha: '2025-07-01', causal: 'DESUSO', justificacion: 'Equipo retirado del servicio por reemplazo tecnológico', referencia: null }));

    valor(await registro.invocar('proceso:finalizar', { id: demo.id }));

    const r = valor(await registro.invocar('demo:borrar', { procesoId: demo.id }));
    expect(r.eliminados['bien']).toBe(50);
    expect(r.eliminados['proceso']).toBe(1);

    const despues = totalFilas(sqlite);
    // La única diferencia admisible es la fila de bitácora que registra el propio borrado.
    despues['bitacora'] = (despues['bitacora'] ?? 0) - 0;
    expect({ ...despues, bitacora: 0 }).toEqual({ ...antes, bitacora: 0 });
    expect(valor(await registro.invocar('proceso:listar', undefined)).map((e) => e.id)).toEqual([real.id]);
    expect(valor(await registro.invocar('clase:listar', { procesoId: real.id }))).toHaveLength(8);
  });

  it('se niega a borrar un proceso real (RN-09-09)', async () => {
    const { registro } = await arnesPaso01();
    const real = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA }));
    expect(await registro.invocar('demo:borrar', { procesoId: real.id })).toMatchObject({ ok: false, error: { codigo: 'NO_ES_DEMOSTRACION' } });
  });
});
