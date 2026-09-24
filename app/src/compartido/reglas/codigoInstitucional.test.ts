/** RN-01-02 — composición del código institucional. */
import { describe, expect, it } from 'vitest';
import { componerCodigo, validarSegmentos, CONVENCION_GENERICA, LONGITUD_CONSECUTIVO_GENERICA } from './codigoInstitucional';

describe('componerCodigo', () => {
  it('reproduce el ejemplo de /especificacion/teoria: HSV · 01 · AGM · 01 → HSV01AGM01', () => {
    const codigo = componerCodigo(
      [{ tipo: 'PREFIJO_ENTIDAD', valor: 'HSV' }, { tipo: 'CODIGO_SEDE' }, { tipo: 'ABREVIATURA_TIPO' }, { tipo: 'CONSECUTIVO' }],
      2,
      { codigoSede: '01', abreviatura: 'AGM', consecutivo: 1 },
    );
    expect(codigo).toBe('HSV01AGM01');
  });

  it('rellena el consecutivo con ceros y admite separadores', () => {
    expect(componerCodigo(CONVENCION_GENERICA, LONGITUD_CONSECUTIVO_GENERICA, { codigoSede: '01', abreviatura: 'mon', consecutivo: 7 })).toBe('01-MON-0007');
  });

  it('validarSegmentos exige exactamente un CONSECUTIVO', () => {
    expect(validarSegmentos([{ tipo: 'CODIGO_SEDE' }])).toContain('CONSECUTIVO');
    expect(validarSegmentos([{ tipo: 'CONSECUTIVO' }, { tipo: 'CONSECUTIVO' }])).toContain('Solo puede');
    expect(validarSegmentos(CONVENCION_GENERICA)).toBeNull();
  });
});
