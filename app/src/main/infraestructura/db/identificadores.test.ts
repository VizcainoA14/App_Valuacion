import { describe, expect, it } from 'vitest';
import { esUuid } from '../../../compartido/tipos/basicos';
import { nuevoId } from './identificadores';

describe('nuevoId (UUID v7)', () => {
  it('produce UUID válidos de versión 7 y variante RFC', () => {
    const id = nuevoId();
    expect(esUuid(id)).toBe(true);
    expect(id.charAt(14)).toBe('7');
    expect(['8', '9', 'a', 'b']).toContain(id.charAt(19));
  });

  it('es ordenable por tiempo: un id posterior es lexicográficamente mayor', () => {
    const a = nuevoId(1_700_000_000_000);
    const b = nuevoId(1_700_000_000_001);
    expect(a < b).toBe(true);
    expect(a.slice(0, 13)).not.toBe(nuevoId(1_800_000_000_000).slice(0, 13));
  });

  it('no repite en 10.000 generaciones', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) ids.add(nuevoId());
    expect(ids.size).toBe(10_000);
  });
});
