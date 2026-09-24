/**
 * T-C-02 — Presupuesto de rendimiento con 20.000 bienes (`RNF-01`, `RNF-02`:
 * listar 200 con filtros en < 50 ms).
 *
 * Vive aparte y sin paralelismo (`npm run test:rendimiento`) porque una medición
 * que compite por CPU con el resto de la suite no mide lo que dice medir. Y mide
 * el REPOSITORIO, que es donde el plan fija el presupuesto: pasar por el arnés de
 * IPC añadiría el coste de la instrumentación del propio test, no el de la app.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { sembrarBienes } from './pruebas/sembrarCarga';
import { bienRepo } from './repositorio/bien.repo';
import type { FiltrosBien, OrdenBien } from '../../../compartido/dtos/inventario';

const PRESUPUESTO_MS = 50;
const POR_CODIGO: OrdenBien = { columna: 'codigoInstitucional', ascendente: true };

async function conInventario(bienes: number) {
  const arnes = await arnesPaso01();
  const demo = valor(await arnes.registro.invocar('demo:cargar', undefined));
  const siembra = sembrarBienes(arnes.sqlite, demo.id, { bienes });
  return { ...arnes, procesoId: demo.id, siembra };
}

describe('rendimiento con 20.000 bienes (RNF-01, RNF-02)', () => {
  it('lista 200 filas con cualquier filtro y orden dentro del presupuesto', async () => {
    const { sqlite, procesoId, siembra } = await conInventario(20_000);
    expect(siembra.bienes).toBe(20_000);
    expect(bienRepo.listar(sqlite, procesoId, {}, POR_CODIGO, 0, 1).total).toBe(20_050);

    /** Mediana de 5 ejecuciones: descarta el ruido de una medición suelta. */
    const medir = (filtros: FiltrosBien, orden: OrdenBien): number => {
      const tiempos: number[] = [];
      for (let i = 0; i < 6; i++) {
        const t0 = performance.now();
        const p = bienRepo.listar(sqlite, procesoId, filtros, orden, 0, 200);
        const ms = performance.now() - t0;
        expect(p.filas.length).toBeLessThanOrEqual(200);
        if (i > 0) tiempos.push(ms); // la primera compila el SQL; luego entra la caché de sentencias
      }
      return tiempos.sort((a, b) => a - b)[Math.floor(tiempos.length / 2)] ?? Number.POSITIVE_INFINITY;
    };

    const casos: [string, FiltrosBien, OrdenBien][] = [
      ['sin filtro', {}, POR_CODIGO],
      ['texto (FTS)', { texto: 'monitor' }, POR_CODIGO],
      ['catálogo', { estadoActual: 'BUENO', condicionTenencia: 'PROPIO' }, POR_CODIGO],
      ['orden por costo', {}, { columna: 'costoAdquisicion', ascendente: false }],
      ['página 50', {}, POR_CODIGO],
    ];
    for (const [nombre, filtros, orden] of casos) {
      const ms = medir(filtros, orden);
      expect(ms, `${nombre}: ${ms.toFixed(1)} ms`).toBeLessThan(PRESUPUESTO_MS);
    }
  });

  it('el cuadro de cobertura de 8 servicios se resuelve en menos de 50 ms', async () => {
    const { sqlite, procesoId } = await conInventario(20_000);
    bienRepo.cobertura(sqlite, procesoId);
    const t0 = performance.now();
    const c = bienRepo.cobertura(sqlite, procesoId);
    const ms = performance.now() - t0;
    expect(c.totalBienes).toBe(20_050);
    expect(ms, `${ms.toFixed(1)} ms`).toBeLessThan(PRESUPUESTO_MS);
  });

  it('seleccionar todo el filtro sobre 20.000 bienes no supera medio segundo', async () => {
    const { sqlite, procesoId } = await conInventario(20_000);
    const t0 = performance.now();
    const ids = bienRepo.idsDelFiltro(sqlite, procesoId, {});
    const ms = performance.now() - t0;
    expect(ids).toHaveLength(20_050);
    expect(ms, `${ms.toFixed(1)} ms`).toBeLessThan(500);
  });
});
