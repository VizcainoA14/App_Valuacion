/**
 * T-B-02 — Dinero: RED-01 … RED-06 (ANEXO_C §8) y ADR-006.
 * Ningún valor esperado se cambia sin entrada en la bitácora (RG-01).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { comoCentavos, type Centavos } from '../tipos/basicos';
import {
  Decimal,
  decimal,
  redondear,
  pesos,
  aCentavos,
  aX10k,
  desdeX10k,
  sumarCentavos,
  restarCentavos,
  negarCentavos,
  compararCentavos,
  centavosDesdeTexto,
} from './dinero';

describe('conversión pesos ↔ centavos', () => {
  it('pesos() divide por 100 sin pérdida', () => {
    expect(pesos(comoCentavos(123456)).toString()).toBe('1234.56');
    expect(pesos(comoCentavos(-5)).toString()).toBe('-0.05');
    expect(pesos(comoCentavos(2373928000)).toString()).toBe('23739280');
  });

  it('aCentavos() redondea a 2 decimales con desempate hacia arriba (RED-04, RED-06)', () => {
    expect(aCentavos('1234.564')).toBe(123456);
    expect(aCentavos('1234.565')).toBe(123457);
    expect(aCentavos('1234.5650000001')).toBe(123457);
    expect(aCentavos('0.005')).toBe(1);
    expect(aCentavos('0.004999999')).toBe(0);
    expect(aCentavos(100)).toBe(10000);
  });

  it('en negativos el desempate se aleja de cero (ROUND_HALF_UP, plan 2.6 §7)', () => {
    expect(aCentavos('-0.005')).toBe(-1);
    expect(aCentavos('-0.004')).toBe(0);
  });

  it('no acepta infinito ni NaN', () => {
    expect(() => aCentavos(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => aCentavos('abc')).toThrow();
  });
});

describe('índices y factores ×10.000 (RED-03)', () => {
  it('conserva 4 decimales con desempate hacia arriba', () => {
    // ANEXO_C §2.3 (corregido): 10,3491 / 15 = 0,68994 → 0,6899
    expect(aX10k(decimal('10.3491').div(15))).toBe(6899);
    expect(aX10k('0.68995')).toBe(6900);
    expect(aX10k('1.25')).toBe(12500); // > 1 es válido: RN-05-02 no trunca
    expect(desdeX10k(aX10k('0.6899')).toString()).toBe('0.6899');
  });
});

describe('redondear (RED-06)', () => {
  it('al más cercano, mitad hacia arriba', () => {
    expect(redondear('2.5', 0).toString()).toBe('3');
    expect(redondear('3.5', 0).toString()).toBe('4'); // no es "banker's rounding"
    expect(redondear('2.4999', 0).toString()).toBe('2');
    expect(redondear('131884.888888', 2).toString()).toBe('131884.89');
  });

  it('el clon de Decimal no depende de la configuración global de decimal.js', () => {
    expect(new Decimal(1).div(3).toString()).toBe('0.3333333333333333333333333333333333333333');
  });
});

describe('RED-05: los totales suman detalles ya redondeados', () => {
  it('tres detalles de $0,005 dan $0,03, no $0,02', () => {
    const detalles = ['0.005', '0.005', '0.005'].map(aCentavos);
    expect(sumarCentavos(...detalles)).toBe(3);
    // Sumar a precisión completa y redondear al final daría 2: eso es lo que RED-05 prohíbe.
    expect(aCentavos('0.015')).toBe(2);
  });

  it('operaciones enteras exactas', () => {
    expect(sumarCentavos()).toBe(0);
    expect(sumarCentavos(comoCentavos(1), comoCentavos(2), comoCentavos(3))).toBe(6);
    expect(restarCentavos(comoCentavos(10), comoCentavos(25))).toBe(-15);
    expect(negarCentavos(comoCentavos(7))).toBe(-7);
    expect(compararCentavos(comoCentavos(1), comoCentavos(2))).toBe(-1);
    expect(compararCentavos(comoCentavos(2), comoCentavos(2))).toBe(0);
    expect(compararCentavos(comoCentavos(3), comoCentavos(2))).toBe(1);
  });

  it('rechaza desbordar el rango seguro', () => {
    const casiMaximo = comoCentavos(Number.MAX_SAFE_INTEGER);
    expect(() => sumarCentavos(casiMaximo, comoCentavos(1))).toThrow(TypeError);
  });
});

describe('centavosDesdeTexto', () => {
  it('acepta textos numéricos canónicos', () => {
    expect(centavosDesdeTexto('23739280')).toBe(2373928000);
    expect(centavosDesdeTexto(' 1234.5 ')).toBe(123450);
    expect(centavosDesdeTexto('-0.5')).toBe(-50);
    expect(centavosDesdeTexto('.5')).toBe(50);
  });

  it('devuelve null ante lo que no es un número', () => {
    expect(centavosDesdeTexto('')).toBeNull();
    expect(centavosDesdeTexto('23.739.280,00')).toBeNull();
    expect(centavosDesdeTexto('1e5')).toBeNull();
    expect(centavosDesdeTexto('$100')).toBeNull();
  });
});

describe('propiedades (fast-check)', () => {
  const centavos = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 }).map(comoCentavos);

  it('aCentavos(pesos(c)) === c', () => {
    fc.assert(fc.property(centavos, (c) => aCentavos(pesos(c)) === c));
  });

  it('exactamente medio centavo por encima de k centavos redondea a k+1 (k ≥ 0)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000_000 }), (k) => {
        const mitad = new Decimal(k).div(100).plus('0.005');
        return aCentavos(mitad) === k + 1;
      }),
    );
  });

  it('redondear es idempotente y nunca se aleja más de medio de la última cifra', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 6 }),
        (x, decimales) => {
          const d = new Decimal(x);
          const r = redondear(d, decimales);
          const tolerancia = new Decimal(10).pow(-decimales).div(2);
          return redondear(r, decimales).eq(r) && r.minus(d).abs().lte(tolerancia);
        },
      ),
    );
  });

  it('sumarCentavos coincide con la suma decimal exacta', () => {
    fc.assert(
      fc.property(fc.array(centavos, { maxLength: 50 }), (valores: Centavos[]) => {
        const esperado = valores.reduce((acc, v) => acc.plus(v), new Decimal(0));
        return esperado.eq(sumarCentavos(...valores));
      }),
    );
  });
});
