/**
 * T-D-06 — presupuesto del cálculo masivo (`RNF-01`).
 *
 * El cálculo del ejercicio completo es la operación más pesada del producto: si
 * tarda minutos, el hospital deja de recalcular y trabaja con cifras viejas, que
 * es justo lo que la aplicación existe para evitar. Se mide sobre 20.000 bienes,
 * el tamaño de una E.S.E de segundo nivel.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { sembrarBienes } from '../inventario/pruebas/sembrarCarga';

const BIENES = 20_000;
/** Todo el ejercicio en menos de 10 s: el usuario espera, pero no se va a tomar un café. */
const PRESUPUESTO_MS = 10_000;

describe('cálculo del ejercicio completo (RNF-01)', () => {
  it(`calcula ${BIENES.toLocaleString('es-CO')} bienes dentro del presupuesto`, async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const ejercicio = valor(await a.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    if (ejercicio === undefined) throw new Error('sin ejercicio');

    // El método de conteo tiene que estar confirmado por acta o el motor se niega.
    const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: demo.id }));
    if (!p.metodo_conteo_meses_confirmado) {
      valor(await a.registro.invocar('parametros:actualizar', { entidadId: demo.id, cambios: { ...p, metodo_conteo_meses_confirmado: true }, justificacion: 'Prueba de rendimiento' }));
    }
    sembrarBienes(a.sqlite, ejercicio.id, { bienes: BIENES });

    const t0 = performance.now();
    const r = valor(await a.registro.invocar('calculo:ejecutar', { entidadId: demo.id, ejercicioId: ejercicio.id }));
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

    // Recalcular sobre lo ya calculado no puede ser más caro que la primera vez.
    const t1 = performance.now();
    valor(await a.registro.invocar('calculo:ejecutar', { entidadId: demo.id, ejercicioId: ejercicio.id }));
    const msRecalculo = performance.now() - t1;
    console.log(`  recálculo en ${msRecalculo.toFixed(0)} ms`);
    expect(msRecalculo).toBeLessThan(PRESUPUESTO_MS);
  });
});
