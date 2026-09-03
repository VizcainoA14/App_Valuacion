/**
 * T-C-02 — el listado filtra y ordena EN EL MAIN. El presupuesto de rendimiento
 * con 20.000 bienes vive en `listado.perf.test.ts` (`npm run test:rendimiento`).
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { sembrarBienes } from './pruebas/sembrarCarga';

async function conInventario(bienes: number) {
  const arnes = await arnesPaso01();
  const demo = valor(await arnes.registro.invocar('demo:cargar', undefined));
  const ejercicio = valor(await arnes.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
  if (ejercicio === undefined) throw new Error('sin ejercicio');
  const siembra = bienes > 0 ? sembrarBienes(arnes.sqlite, ejercicio.id, { bienes }) : null;
  return { ...arnes, entidadId: demo.id, ejercicioId: ejercicio.id, siembra };
}

describe('bien:listar', () => {
  it('pagina y devuelve el total del filtro completo, no el de la página', async () => {
    const { registro, ejercicioId } = await conInventario(0);
    const p = valor(await registro.invocar('bien:listar', { ejercicioId, tamano: 10 }));
    expect(p.filas).toHaveLength(10);
    expect(p.total).toBe(50); // los 50 bienes del hospital de demostración
    expect(p.pagina).toBe(0);
    const segunda = valor(await registro.invocar('bien:listar', { ejercicioId, tamano: 10, pagina: 4 }));
    expect(segunda.filas).toHaveLength(10);
    expect(segunda.filas[0]?.id).not.toBe(p.filas[0]?.id);
  });

  it('ordena por la columna pedida, en ambos sentidos', async () => {
    const { registro, ejercicioId } = await conInventario(0);
    const asc = valor(await registro.invocar('bien:listar', { ejercicioId, orden: { columna: 'placa', ascendente: true }, tamano: 50 }));
    const desc = valor(await registro.invocar('bien:listar', { ejercicioId, orden: { columna: 'placa', ascendente: false }, tamano: 50 }));
    expect(asc.filas[0]?.placa).toBe('DEMO-0001');
    expect(desc.filas[0]?.placa).toBe('DEMO-0050');
    const porCosto = valor(await registro.invocar('bien:listar', { ejercicioId, orden: { columna: 'costoAdquisicion', ascendente: false }, tamano: 3 }));
    expect(porCosto.filas[0]?.costoAdquisicion).toBeGreaterThan(porCosto.filas[2]?.costoAdquisicion ?? 0);
  });

  it('filtra por texto (FTS con prefijos), por catálogo y por ausencia de hoja de vida', async () => {
    const { registro, ejercicioId, sqlite } = await conInventario(0);
    const porTexto = valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { texto: 'moni sig' } }));
    expect(porTexto.total).toBeGreaterThan(0);
    expect(porTexto.filas.every((f) => f.descripcionFuncional.toLowerCase().includes('monitor'))).toBe(true);

    const porPlaca = valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { texto: 'DEMO-0007' } }));
    expect(porPlaca.total).toBe(1);

    const inservibles = valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { estadoActual: 'INSERVIBLE' } }));
    expect(inservibles.total).toBeGreaterThan(0);
    expect(inservibles.filas.every((f) => f.estadoActual === 'INSERVIBLE')).toBe(true);

    // La demostración crea hoja de vida para los 50; al quitar una, el filtro la encuentra.
    expect(valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { sinHojaVida: true } })).total).toBe(0);
    const uno = valor(await registro.invocar('bien:listar', { ejercicioId, tamano: 1 })).filas[0];
    sqlite.prepare('DELETE FROM hoja_vida WHERE bien_id = ?').run(uno?.id);
    const sinHoja = valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { sinHojaVida: true } }));
    expect(sinHoja.total).toBe(1);
    expect(sinHoja.filas[0]?.tieneHojaVida).toBe(false);
  });

  it('un texto con comillas o asteriscos no rompe la consulta (P-2: nada se interpola)', async () => {
    const { registro, ejercicioId } = await conInventario(0);
    for (const texto of ['"; DROP TABLE bien; --', '***', 'a"b*c']) {
      const r = await registro.invocar('bien:listar', { ejercicioId, filtros: { texto } });
      expect(r.ok, texto).toBe(true);
    }
    expect(valor(await registro.invocar('bien:listar', { ejercicioId })).total).toBe(50);
  });

  it('idsDelFiltro devuelve TODO lo que cumple, no solo la página visible', async () => {
    const { registro, ejercicioId } = await conInventario(0);
    const pagina = valor(await registro.invocar('bien:listar', { ejercicioId, filtros: { condicionTenencia: 'PROPIO' }, tamano: 5 }));
    const ids = valor(await registro.invocar('bien:idsDelFiltro', { ejercicioId, filtros: { condicionTenencia: 'PROPIO' } }));
    expect(pagina.filas).toHaveLength(5);
    expect(ids).toHaveLength(pagina.total);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('bien:cobertura (RF-02-08)', () => {
  it('cuenta servicios recorridos por bienes o por acta de custodia', async () => {
    const { registro, entidadId, ejercicioId } = await conInventario(0);
    const c = valor(await registro.invocar('bien:cobertura', { entidadId, ejercicioId }));
    expect(c.serviciosActivos).toBe(8);
    expect(c.serviciosRecorridos).toBe(8);
    expect(c.totalBienes).toBe(50);
    expect(c.servicios.every((s) => s.recorrido)).toBe(true);
  });
});
