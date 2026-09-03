/**
 * T-C-07 — Presupuesto de la carga masiva. Un hospital de segundo nivel trae
 * varios miles de bienes en una sola PL-03; si la importación tarda minutos, la
 * aplicación es inservible el día que más importa.
 *
 * Mide el ESCRITOR (`insertarLote` + `marcarIncompletos`), que es donde está el
 * coste real: leer el .xlsx lo hace ExcelJS y no es código nuestro.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../../configuracion/pruebas';
import { bienRepo, type BienParaInsertar } from '../repositorio/bien.repo';

const BIENES = 10_000;
/** 10.000 altas en menos de 2 s: 5.000 filas/segundo sobre SQLite local. */
const PRESUPUESTO_MS = 2_000;

describe('carga masiva de inventario (RNF-01)', () => {
  it(`inserta ${BIENES.toLocaleString('es-CO')} bienes dentro del presupuesto`, async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const ejercicio = valor(await a.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    if (ejercicio === undefined) throw new Error('sin ejercicio');
    const referencia = bienRepo.listar(a.sqlite, ejercicio.id, {}, { columna: 'codigoInstitucional', ascendente: true }, 0, 1).filas[0];
    if (referencia === undefined) throw new Error('la demostración no trajo bienes');
    const base = valor(await a.registro.invocar('bien:porId', { id: referencia.id }));
    if (base === null) throw new Error('sin bien de referencia');

    const ahora = a.ctx.ahoraIso();
    const nuevos: BienParaInsertar[] = Array.from({ length: BIENES }, (_, i) => ({
      id: `perf-${String(i).padStart(6, '0')}-0000-0000-000000000000`,
      ejercicioId: ejercicio.id,
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
      creadoEn: ahora,
      actualizadoEn: ahora,
    }));

    const t0 = performance.now();
    a.sqlite.transaction(() => {
      bienRepo.insertarLote(a.sqlite, nuevos);
      bienRepo.marcarIncompletos(
        a.sqlite,
        nuevos.map((b) => b.id),
        ahora,
      );
    })();
    const ms = performance.now() - t0;

    console.log(`  ${BIENES.toLocaleString('es-CO')} bienes importados en ${ms.toFixed(0)} ms (${Math.round(BIENES / (ms / 1000)).toLocaleString('es-CO')} filas/s)`);
    expect(ms).toBeLessThan(PRESUPUESTO_MS);

    const total = bienRepo.listar(a.sqlite, ejercicio.id, { estadoRegistro: 'INCOMPLETO' }, { columna: 'codigoInstitucional', ascendente: true }, 0, 1).total;
    expect(total).toBeGreaterThanOrEqual(BIENES);
  });
});
