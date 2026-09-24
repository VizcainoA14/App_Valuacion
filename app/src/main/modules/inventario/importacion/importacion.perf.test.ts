/**
 * T-C-07 — Presupuesto de la carga masiva. Un hospital de segundo nivel trae
 * varios miles de bienes en una sola PL-03; si la importación tarda minutos, la
 * aplicación es inservible el día que más importa.
 *
 * Mide el ESCRITOR del barrido (altas y actualizaciones), que es donde está el
 * coste real: leer el .xlsx lo hace ExcelJS y no es código nuestro.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../../configuracion/pruebas';
import { bienRepo, type BienDelBarrido } from '../repositorio/bien.repo';

const BIENES = 10_000;
/** 10.000 altas en menos de 2 s: 5.000 filas/segundo sobre SQLite local. */
const PRESUPUESTO_MS = 2_000;

describe('carga masiva de inventario (RNF-01)', () => {
  it(`da de alta y luego actualiza ${BIENES.toLocaleString('es-CO')} bienes dentro del presupuesto`, async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const referencia = bienRepo.listar(a.sqlite, demo.id, {}, { columna: 'codigoInstitucional', ascendente: true }, 0, 1).filas[0];
    if (referencia === undefined) throw new Error('la demostración no trajo bienes');
    const base = valor(await a.registro.invocar('bien:porId', { id: referencia.id }));
    if (base === null) throw new Error('sin bien de referencia');

    const ahora = a.ctx.ahoraIso();
    const nuevos: (BienDelBarrido & { id: string })[] = Array.from({ length: BIENES }, (_, i) => ({
      id: `perf-${String(i).padStart(6, '0')}-0000-0000-000000000000`,
      codigoInstitucional: `PERF-${String(i).padStart(6, '0')}`,
      placa: `P${String(i).padStart(9, '0')}`,
      descripcionFuncional: 'MONITOR DE SIGNOS VITALES',
      claseActivoId: base.claseActivoId,
      marca: 'MARCA',
      modelo: 'MOD-1',
      serie: `SN-${i}`,
      sedeId: base.sedeId,
      servicioId: base.servicioId,
      cantidad: 1,
      estadoActual: 'BUENO',
      condicionTenencia: 'PROPIO',
      responsableCustodia: 'CUSTODIO',
      fechaToma: base.fechaToma,
      funcionarioConteo: 'TECNICO 1',
      observaciones: null,
    }));

    const barrido = (id: string): void =>
      bienRepo.insertarBarrido(a.sqlite, { id, procesoId: demo.id, fecha: '2025-05-15', archivo: 'perf.xlsx', archivoConservado: 'perf.xlsx', hashSha256: 'h', nuevos: BIENES, actualizados: 0, noEncontrados: 0, servicios: 1, ahora });

    const t0 = performance.now();
    a.sqlite.transaction(() => {
      barrido('barrido-perf-1');
      for (const b of nuevos) bienRepo.insertar(a.sqlite, { ...b, procesoId: demo.id, barridoId: 'barrido-perf-1', ahora });
    })();
    const ms = performance.now() - t0;
    console.log(`  ${BIENES.toLocaleString('es-CO')} altas en ${ms.toFixed(0)} ms (${Math.round(BIENES / (ms / 1000)).toLocaleString('es-CO')} filas/s)`);
    expect(ms).toBeLessThan(PRESUPUESTO_MS);

    // El segundo barrido encuentra los mismos bienes: todo es actualización.
    const t1 = performance.now();
    a.sqlite.transaction(() => {
      barrido('barrido-perf-2');
      for (const b of nuevos) bienRepo.actualizarDesdeBarrido(a.sqlite, { ...b, estadoActual: 'REGULAR', barridoId: 'barrido-perf-2', ahora });
    })();
    const msActualizar = performance.now() - t1;
    console.log(`  ${BIENES.toLocaleString('es-CO')} actualizaciones en ${msActualizar.toFixed(0)} ms`);
    expect(msActualizar).toBeLessThan(PRESUPUESTO_MS);

    const total = bienRepo.listar(a.sqlite, demo.id, { estadoActual: 'REGULAR' }, { columna: 'codigoInstitucional', ascendente: true }, 0, 1).total;
    expect(total).toBeGreaterThanOrEqual(BIENES);
  });
});
