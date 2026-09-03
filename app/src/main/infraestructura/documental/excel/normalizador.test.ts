/** TR-02 — normalización ANEXO_C §9 / ANEXO_A §3.2–3.4: nunca adivinar, siempre reportar. */
import { describe, expect, it } from 'vitest';
import { normalizar, esNulo } from './normalizador';

const op = { formatoFecha: 'DD/MM/AAAA' as const };

describe('nulos especiales (ANEXO_A §3.4)', () => {
  it.each(['', '  ', '-', 'N/A', 'NO REGISTRA', 'nt', null, undefined])('%s → nulo, no cero', (v) => {
    expect(esNulo(v)).toBe(true);
    expect(normalizar(v, 'moneda', op)).toEqual({ ok: true, valor: null });
  });
});

describe('fechas (ANEXO_C §9.1)', () => {
  it('ISO se acepta tal cual, sin nota', () => {
    expect(normalizar('2025-06-30', 'fecha', op)).toEqual({ ok: true, valor: '2025-06-30' });
  });
  it('DD/MM/AAAA se interpreta según el formato regional y se reporta', () => {
    const r = normalizar('30/06/2025', 'fecha', op);
    expect(r).toMatchObject({ ok: true, valor: '2025-06-30', nota: { regla: expect.stringContaining('DD/MM/AAAA') } });
    const mmdd = normalizar('06/30/2025', 'fecha', { formatoFecha: 'MM/DD/AAAA' });
    expect(mmdd).toMatchObject({ ok: true, valor: '2025-06-30' });
  });
  it('una fecha inexistente o irreconocible se rechaza, no se corrige', () => {
    expect(normalizar('31/02/2025', 'fecha', op)).toMatchObject({ ok: false, motivo: expect.stringContaining('inexistente') });
    expect(normalizar('junio 30 2025', 'fecha', op)).toMatchObject({ ok: false });
  });
  it('celdas de fecha de Excel y números seriales', () => {
    expect(normalizar(new Date(Date.UTC(2018, 3, 27)), 'fecha', op)).toMatchObject({ ok: true, valor: '2018-04-27' });
    expect(normalizar(45838, 'fecha', op)).toMatchObject({ ok: true, valor: '2025-06-30', nota: { regla: expect.stringContaining('serial') } });
  });
});

describe('moneda (ANEXO_C §9.2)', () => {
  it('sin símbolos ni separadores de miles', () => {
    expect(normalizar('$ 1.788.720', 'moneda', op)).toMatchObject({ ok: true, valor: '1788720' });
    expect(normalizar('1,788,720.50', 'moneda', op)).toMatchObject({ ok: true, valor: '1788720.50' });
    expect(normalizar('1.788.720,50', 'moneda', op)).toMatchObject({ ok: true, valor: '1788720.50' });
    expect(normalizar('23739280', 'moneda', op)).toEqual({ ok: true, valor: '23739280' });
    expect(normalizar(23739280, 'moneda', op)).toEqual({ ok: true, valor: '23739280' });
  });
  it('rechaza negativos en costos y basura', () => {
    expect(normalizar('-100', 'moneda', { ...op, noNegativo: true })).toMatchObject({ ok: false });
    expect(normalizar('mil pesos', 'moneda', op)).toMatchObject({ ok: false });
  });
});

describe('sí/no, listas, números', () => {
  it('SI/NO en cualquier grafía', () => {
    expect(normalizar('SI', 'si_no', op)).toEqual({ ok: true, valor: true });
    expect(normalizar('sí', 'si_no', op)).toEqual({ ok: true, valor: true });
    expect(normalizar('No', 'si_no', op)).toEqual({ ok: true, valor: false });
    expect(normalizar('quizás', 'si_no', op)).toMatchObject({ ok: false });
  });
  it('lista: unifica mayúsculas y devuelve el valor canónico del catálogo con nota', () => {
    const r = normalizar('ASISTENCIAL', 'lista', { ...op, catalogo: ['asistencial', 'administrativo', 'apoyo'] });
    expect(r).toMatchObject({ ok: true, valor: 'asistencial', nota: { regla: expect.stringContaining('mayúsculas') } });
    expect(normalizar('clinico', 'lista', { ...op, catalogo: ['asistencial'] })).toMatchObject({ ok: false });
  });
  it('entero y número con coma decimal reportada', () => {
    expect(normalizar('180', 'entero', op)).toEqual({ ok: true, valor: 180 });
    expect(normalizar('10.5', 'entero', op)).toMatchObject({ ok: false });
    expect(normalizar('10,38', 'numero', op)).toMatchObject({ ok: true, valor: 10.38, nota: { regla: expect.stringContaining('coma') } });
  });
});
