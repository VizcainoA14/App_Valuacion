/**
 * T-B-02 — Fechas: ANEXO_C §3.3 (tres métodos de conteo) y aritmética sin Date.
 * Los valores esperados vienen de /especificacion/teoria v2.1; no se cambian sin bitácora (RG-01).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { comoFechaIso, type FechaIso } from '../tipos/basicos';
import { METODO_CONTEO_MESES } from '../enums/parametros';
import {
  aDiaJuliano,
  desdeDiaJuliano,
  diferenciaEnDias,
  sumarDias,
  primerDiaMesSiguiente,
  ultimoDiaDelMes,
  compararFechas,
  contarMeses,
  descomponer,
  componer,
} from './fechas';
import { Decimal, aCentavos, decimal } from './dinero';

const f = comoFechaIso;

describe('día juliano', () => {
  it('2000-01-01 es el JDN 2451545 (valor de referencia astronómico)', () => {
    expect(aDiaJuliano(f('2000-01-01'))).toBe(2451545);
  });

  it('desdeDiaJuliano invierte aDiaJuliano', () => {
    expect(desdeDiaJuliano(2451545)).toBe('2000-01-01');
    expect(desdeDiaJuliano(aDiaJuliano(f('2024-02-29')))).toBe('2024-02-29');
  });

  it('descomponer / componer', () => {
    expect(descomponer(f('2025-06-30'))).toEqual({ anio: 2025, mes: 6, dia: 30 });
    expect(componer(2025, 6, 30)).toBe('2025-06-30');
    expect(() => componer(2025, 2, 30)).toThrow(TypeError);
  });
});

describe('diferenciaEnDias', () => {
  it('ANEXO_C §3.3: entre 2018-04-27 y 2025-06-30 hay 2.621 días', () => {
    expect(diferenciaEnDias(f('2018-04-27'), f('2025-06-30'))).toBe(2621);
  });

  it('es signada y cruza bisiestos correctamente', () => {
    expect(diferenciaEnDias(f('2025-06-30'), f('2018-04-27'))).toBe(-2621);
    expect(diferenciaEnDias(f('2024-02-28'), f('2024-03-01'))).toBe(2);
    expect(diferenciaEnDias(f('2023-02-28'), f('2023-03-01'))).toBe(1);
    expect(diferenciaEnDias(f('2025-06-30'), f('2025-06-30'))).toBe(0);
  });
});

describe('sumarDias, primerDiaMesSiguiente, ultimoDiaDelMes, compararFechas', () => {
  it('suma días respetando el calendario', () => {
    expect(sumarDias(f('2024-02-28'), 1)).toBe('2024-02-29');
    expect(sumarDias(f('2023-02-28'), 1)).toBe('2023-03-01');
    expect(sumarDias(f('2025-12-31'), 1)).toBe('2026-01-01');
    expect(sumarDias(f('2025-01-01'), -1)).toBe('2024-12-31');
    expect(() => sumarDias(f('2025-01-01'), 1.5)).toThrow(TypeError);
  });

  it('primer día del mes siguiente (ANEXO_C §3.2)', () => {
    expect(primerDiaMesSiguiente(f('2025-06-15'))).toBe('2025-07-01');
    expect(primerDiaMesSiguiente(f('2025-12-15'))).toBe('2026-01-01');
    expect(primerDiaMesSiguiente(f('2024-02-29'))).toBe('2024-03-01');
  });

  it('último día del mes', () => {
    expect(ultimoDiaDelMes(f('2024-02-10'))).toBe('2024-02-29');
    expect(ultimoDiaDelMes(f('2025-04-10'))).toBe('2025-04-30');
  });

  it('compara lexicográficamente', () => {
    expect(compararFechas(f('2025-06-30'), f('2025-07-01'))).toBe(-1);
    expect(compararFechas(f('2025-06-30'), f('2025-06-30'))).toBe(0);
    expect(compararFechas(f('2026-01-01'), f('2025-12-31'))).toBe(1);
  });
});

describe('contarMeses — ANEXO_C §3.3, caso real corregido (CT-01)', () => {
  const inicio = f('2018-04-27');
  const corte = f('2025-06-30');

  it('mes_completo → 86', () => {
    expect(contarMeses(inicio, corte, 'mes_completo').toString()).toBe('86');
  });

  it('dias_exactos → 86,1109', () => {
    expect(contarMeses(inicio, corte, 'dias_exactos').toDecimalPlaces(4).toString()).toBe('86.1109');
  });

  it('fraccion_anual → 86,1109 (equivalente a B)', () => {
    expect(contarMeses(inicio, corte, 'fraccion_anual').toDecimalPlaces(4).toString()).toBe(
      '86.1109',
    );
  });

  it('mes_completo descuenta el mes si el día de corte es anterior al de inicio', () => {
    expect(contarMeses(inicio, f('2025-06-26'), 'mes_completo').toString()).toBe('85');
    expect(contarMeses(inicio, f('2025-06-27'), 'mes_completo').toString()).toBe('86');
  });

  it('bien adquirido en la fecha de corte → 0 meses (ANEXO_C §3.4)', () => {
    expect(contarMeses(corte, corte, 'mes_completo').toString()).toBe('0');
    expect(contarMeses(corte, corte, 'dias_exactos').toString()).toBe('0');
  });

  it('corte anterior al inicio → negativo, sin lanzar (el llamador lo trata como error de datos)', () => {
    expect(contarMeses(corte, inicio, 'mes_completo').isNegative()).toBe(true);
    expect(contarMeses(corte, inicio, 'dias_exactos').isNegative()).toBe(true);
  });

  it('reproduce la tabla comparativa de ANEXO_C §3.3 con la depreciación lineal', () => {
    // costo 23.739.280 · vida útil 180 meses · residual 0 %
    const mensual = decimal('23739280').div(180); // 131.884,888… sin redondear (RED-01)
    expect(mensual.toDecimalPlaces(2).toString()).toBe('131884.89');

    const acumulada = (metodo: 'mes_completo' | 'dias_exactos' | 'fraccion_anual'): number =>
      aCentavos(mensual.mul(contarMeses(inicio, corte, metodo)));

    expect(acumulada('mes_completo')).toBe(1134210044); // 11.342.100,44
    expect(acumulada('dias_exactos')).toBe(1135672423); // 11.356.724,23
    expect(acumulada('fraccion_anual')).toBe(1135672423);
    // Diferencia entre métodos: $14.623,79 (no los $180.000 que afirmaba el anexo antes de C-02)
    expect(acumulada('dias_exactos') - acumulada('mes_completo')).toBe(1462379);
  });
});

describe('propiedades (fast-check)', () => {
  const jdnMin = aDiaJuliano(f('1900-01-01'));
  const jdnMax = aDiaJuliano(f('2100-12-31'));
  const fecha = fc.integer({ min: jdnMin, max: jdnMax }).map(desdeDiaJuliano);

  it('JDN es una biyección sobre las fechas civiles', () => {
    fc.assert(fc.property(fecha, (d: FechaIso) => desdeDiaJuliano(aDiaJuliano(d)) === d));
  });

  it('diferenciaEnDias(a, sumarDias(a, n)) === n', () => {
    fc.assert(
      fc.property(fecha, fc.integer({ min: -20000, max: 20000 }), (a, n) => {
        return diferenciaEnDias(a, sumarDias(a, n)) === n;
      }),
    );
  });

  it('dias_exactos y fraccion_anual coinciden siempre', () => {
    fc.assert(
      fc.property(fecha, fecha, (a, b) =>
        contarMeses(a, b, 'dias_exactos').eq(contarMeses(a, b, 'fraccion_anual')),
      ),
    );
  });

  it('mes_completo nunca supera a dias_exactos en más de un mes ni queda más de un mes por debajo', () => {
    fc.assert(
      fc.property(fecha, fecha, (a, b) => {
        if (compararFechas(a, b) === 1) return true;
        const entero = contarMeses(a, b, 'mes_completo');
        const exacto = contarMeses(a, b, 'dias_exactos');
        return exacto.minus(entero).abs().lte(new Decimal(1.05));
      }),
    );
  });

  it('todo método del catálogo devuelve un Decimal finito', () => {
    fc.assert(
      fc.property(fecha, fecha, fc.constantFrom(...METODO_CONTEO_MESES.valores), (a, b, m) =>
        contarMeses(a, b, m).isFinite(),
      ),
    );
  });
});
