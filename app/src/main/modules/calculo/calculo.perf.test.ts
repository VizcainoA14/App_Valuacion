/**
 * T-D-06 — presupuesto del cálculo masivo (`RNF-01`).
 *
 * Calcular un corte es la operación más pesada del producto: si tarda minutos,
 * el hospital deja de recalcular y trabaja con cifras viejas, que es justo lo
 * que la aplicación existe para evitar. Se mide sobre 20.000 bienes,
 * el tamaño de una E.S.E de segundo nivel.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { sembrarBienes } from '../inventario/pruebas/sembrarCarga';

const BIENES = 20_000;
/** Todo el corte en menos de 10 s: el usuario espera, pero no se va a tomar un café. */
const PRESUPUESTO_MS = 10_000;

describe('cálculo de un corte completo (RNF-01)', () => {
  it(`calcula ${BIENES.toLocaleString('es-CO')} bienes dentro del presupuesto`, async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    sembrarBienes(a.sqlite, demo.id, { bienes: BIENES });
    const calcular = () => a.registro.invocar('calculo:ejecutar', { procesoId: demo.id, fechaCorte: '2025-06-30', descripcion: null });

    const t0 = performance.now();
    const r = valor(await calcular());
    const ms = performance.now() - t0;

    console.log(
      `  ${r.resumen.bienesConsiderados.toLocaleString('es-CO')} bienes calculados en ${ms.toFixed(0)} ms ` +
        `(${r.resumen.conObsolescencia.toLocaleString('es-CO')} obsolescencias, ${r.resumen.conDepreciacion.toLocaleString('es-CO')} depreciaciones)`,
    );

    expect(r.resumen.bienesConsiderados).toBeGreaterThanOrEqual(BIENES);
    // La siembra reparte tenencias y clases como un hospital real, así que no
    // todos se deprecian: los de comodato y las clases no depreciables quedan
    // fuera por RN-02-04 y §3.4. Lo que se mide aquí es que el grueso entra.
    expect(r.resumen.conDepreciacion).toBeGreaterThan(BIENES / 3);
    expect(r.resumen.conObsolescencia).toBeGreaterThan(r.resumen.conDepreciacion);
    expect(ms).toBeLessThan(PRESUPUESTO_MS);

    // Un segundo corte, con el primero ya en la base, no puede ser más caro.
    const t1 = performance.now();
    valor(await calcular());
    const msRecalculo = performance.now() - t1;
    console.log(`  segundo corte en ${msRecalculo.toFixed(0)} ms`);
    expect(msRecalculo).toBeLessThan(PRESUPUESTO_MS);
  });
});
