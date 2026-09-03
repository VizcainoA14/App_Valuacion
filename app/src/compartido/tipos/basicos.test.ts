import { describe, expect, it } from 'vitest';
import {
  esFechaIso,
  comoFechaIso,
  esUuid,
  comoUuid,
  esCentavos,
  comoCentavos,
  esMarcaTiempo,
  esBisiesto,
  diasDelMes,
} from './basicos';

describe('FechaIso', () => {
  it('acepta fechas civiles reales', () => {
    expect(esFechaIso('2025-06-30')).toBe(true);
    expect(esFechaIso('2024-02-29')).toBe(true); // bisiesto
    expect(esFechaIso('2000-02-29')).toBe(true); // divisible por 400
  });

  it('rechaza formato o calendario inválidos', () => {
    expect(esFechaIso('2023-02-29')).toBe(false); // no bisiesto
    expect(esFechaIso('1900-02-29')).toBe(false); // divisible por 100, no por 400
    expect(esFechaIso('2024-04-31')).toBe(false);
    expect(esFechaIso('2024-13-01')).toBe(false);
    expect(esFechaIso('2024-00-10')).toBe(false);
    expect(esFechaIso('30/06/2025')).toBe(false);
    expect(esFechaIso('2025-6-30')).toBe(false);
    expect(esFechaIso('2025-06-30T00:00:00Z')).toBe(false);
    expect(esFechaIso(20250630)).toBe(false);
  });

  it('comoFechaIso lanza TypeError ante una fecha inválida', () => {
    expect(() => comoFechaIso('2025-02-30')).toThrow(TypeError);
    expect(comoFechaIso('2025-06-30')).toBe('2025-06-30');
  });

  it('bisiestos y días del mes', () => {
    expect(esBisiesto(2024)).toBe(true);
    expect(esBisiesto(2100)).toBe(false);
    expect(diasDelMes(2024, 2)).toBe(29);
    expect(diasDelMes(2025, 2)).toBe(28);
    expect(diasDelMes(2025, 4)).toBe(30);
    expect(diasDelMes(2025, 12)).toBe(31);
  });
});

describe('Uuid', () => {
  it('acepta v4 y v7 en minúsculas; normaliza mayúsculas', () => {
    expect(esUuid('0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b')).toBe(true);
    expect(esUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(comoUuid('0190A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B')).toBe(
      '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    );
  });

  it('rechaza lo que no es UUID', () => {
    expect(esUuid('')).toBe(false);
    expect(esUuid('no-es-uuid')).toBe(false);
    expect(esUuid('0190a1b2c3d47e5f8a9b0c1d2e3f4a5b')).toBe(false);
    expect(() => comoUuid('x')).toThrow(TypeError);
  });
});

describe('Centavos', () => {
  it('solo admite enteros seguros', () => {
    expect(esCentavos(0)).toBe(true);
    expect(esCentavos(-150)).toBe(true);
    expect(esCentavos(2373928000)).toBe(true);
    expect(esCentavos(1.5)).toBe(false);
    expect(esCentavos(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(esCentavos(Number.NaN)).toBe(false);
    expect(esCentavos('100')).toBe(false);
    expect(() => comoCentavos(0.1)).toThrow(TypeError);
  });

  it('normaliza el cero negativo: no existe -0 centavos', () => {
    expect(Object.is(comoCentavos(-0), 0)).toBe(true);
  });
});

describe('MarcaTiempo', () => {
  it('exige ISO 8601 en UTC con Z', () => {
    expect(esMarcaTiempo('2026-09-02T14:03:00.000Z')).toBe(true);
    expect(esMarcaTiempo('2026-09-02T14:03:00Z')).toBe(true);
    expect(esMarcaTiempo('2026-09-02T14:03:00-05:00')).toBe(false);
    expect(esMarcaTiempo('2026-09-02')).toBe(false);
  });
});
