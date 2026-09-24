/**
 * Casos de `RN-09-03` y `RN-09-05`, con los valores tomados de `/especificacion/teoria` paso 09.
 * Como el resto del motor: ningún valor esperado se ajusta al código (`RG-01`).
 */
import { describe, expect, it } from 'vitest';
import { comoCentavos, type Centavos } from '../tipos/basicos';
import { calcularEfectoContableBaja, evaluarReparacion } from './baja';

const pesos = (v: number): Centavos => comoCentavos(Math.round(v * 100));

describe('RN-09-03 · criterio económico de inservible', () => {
  const umbralPct = 50;

  it('por encima del umbral procede la baja; por debajo se recomienda reparar', () => {
    const caro = evaluarReparacion({ costoReparacionEstimado: pesos(6_000_000), valorReposicion: pesos(10_000_000), umbralPct });
    if (caro.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(caro.valor.relacion.toFixed(4)).toBe('0.6000');
    expect(caro.valor.procedeBaja).toBe(true);
    expect(caro.valor.recomendacion).toContain('procede la baja');

    const barato = evaluarReparacion({ costoReparacionEstimado: pesos(2_000_000), valorReposicion: pesos(10_000_000), umbralPct });
    if (barato.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(barato.valor.procedeBaja).toBe(false);
    expect(barato.valor.recomendacion).toContain('se recomienda reparar');
  });

  it('la frontera es `≥`: exactamente el umbral ya justifica la baja', () => {
    const r = evaluarReparacion({ costoReparacionEstimado: pesos(5_000_000), valorReposicion: pesos(10_000_000), umbralPct });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.relacion.toFixed(4)).toBe('0.5000');
    expect(r.valor.procedeBaja).toBe(true);
  });

  it('el umbral es parametrizable por entidad', () => {
    const entrada = { costoReparacionEstimado: pesos(6_000_000), valorReposicion: pesos(10_000_000) };
    expect(evaluarReparacion({ ...entrada, umbralPct: 70 }).estado === 'CALCULADO' && (evaluarReparacion({ ...entrada, umbralPct: 70 }) as { valor: { procedeBaja: boolean } }).valor.procedeBaja).toBe(false);
    expect(evaluarReparacion({ ...entrada, umbralPct: 30 }).estado === 'CALCULADO' && (evaluarReparacion({ ...entrada, umbralPct: 30 }) as { valor: { procedeBaja: boolean } }).valor.procedeBaja).toBe(true);
  });

  it('sin cotización no hay evaluación: NO_CALCULABLE, no un cero que parezca barato', () => {
    expect(evaluarReparacion({ costoReparacionEstimado: null, valorReposicion: pesos(10_000_000), umbralPct }).estado).toBe('NO_CALCULABLE');
    expect(evaluarReparacion({ costoReparacionEstimado: pesos(1), valorReposicion: null, umbralPct }).estado).toBe('NO_CALCULABLE');
    expect(evaluarReparacion({ costoReparacionEstimado: pesos(1), valorReposicion: comoCentavos(0), umbralPct }).estado).toBe('NO_CALCULABLE');
  });

  it('una reparación en cero es un dato válido: cuesta cero repararlo, luego no procede la baja', () => {
    const r = evaluarReparacion({ costoReparacionEstimado: comoCentavos(0), valorReposicion: pesos(10_000_000), umbralPct });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.procedeBaja).toBe(false);
  });
});

describe('RN-09-05 · efecto contable de la baja', () => {
  it('el valor neto se reconoce como pérdida', () => {
    const r = calcularEfectoContableBaja({
      valorBruto: pesos(23_739_280),
      depreciacionAsociada: pesos(11_356_724.23),
      deterioroAsociado: comoCentavos(0),
      valorSalvamento: comoCentavos(0),
    });
    expect(r.valorNeto).toBe(pesos(12_382_555.77));
    expect(r.perdidaReconocida).toBe(pesos(12_382_555.77));
  });

  it('el deterioro ya reconocido también se debita y reduce el valor neto', () => {
    const r = calcularEfectoContableBaja({
      valorBruto: pesos(10_000_000),
      depreciacionAsociada: pesos(6_000_000),
      deterioroAsociado: pesos(1_000_000),
      valorSalvamento: comoCentavos(0),
    });
    expect(r.valorNeto).toBe(pesos(3_000_000));
  });

  it('el valor de salvamento reduce la pérdida, y nunca la vuelve negativa', () => {
    const conSalvamento = calcularEfectoContableBaja({
      valorBruto: pesos(10_000_000),
      depreciacionAsociada: pesos(8_000_000),
      deterioroAsociado: comoCentavos(0),
      valorSalvamento: pesos(500_000),
    });
    expect(conSalvamento.valorNeto).toBe(pesos(2_000_000));
    expect(conSalvamento.perdidaReconocida).toBe(pesos(1_500_000));

    const salvamentoMayor = calcularEfectoContableBaja({
      valorBruto: pesos(10_000_000),
      depreciacionAsociada: pesos(9_800_000),
      deterioroAsociado: comoCentavos(0),
      valorSalvamento: pesos(500_000),
    });
    expect(salvamentoMayor.perdidaReconocida).toBe(0);
  });

  it('un bien totalmente depreciado se da de baja sin pérdida', () => {
    const r = calcularEfectoContableBaja({
      valorBruto: pesos(5_000_000),
      depreciacionAsociada: pesos(5_000_000),
      deterioroAsociado: comoCentavos(0),
      valorSalvamento: comoCentavos(0),
    });
    expect(r.valorNeto).toBe(0);
    expect(r.perdidaReconocida).toBe(0);
  });
});
