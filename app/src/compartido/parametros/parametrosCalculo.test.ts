/** ANEXO_B §2.5 — parámetros de cálculo: defaults, serialización y umbrales. */
import { describe, expect, it } from 'vitest';
import semilla from '../../../recursos/semillas/parametros_defecto.json';
import {
  PARAMETROS_POR_DEFECTO,
  CLAVES_PARAMETRO,
  parametrosDesdeFilas,
  serializarParametro,
  validarUmbrales,
  EsquemaParametrosCalculo,
} from './parametrosCalculo';

describe('valores por defecto', () => {
  it('son los de ANEXO_B §2.5 (dias_exactos sugerido, NO confirmado)', () => {
    expect(PARAMETROS_POR_DEFECTO.metodo_conteo_meses).toBe('dias_exactos');
    expect(PARAMETROS_POR_DEFECTO.metodo_conteo_meses_confirmado).toBe(false);
    expect(PARAMETROS_POR_DEFECTO.base_comparacion_avaluo).toBe('valor_neto_libros');
    expect(PARAMETROS_POR_DEFECTO.umbral_semaforo_verde).toBe(0.5);
    expect(PARAMETROS_POR_DEFECTO.umbral_semaforo_amarillo).toBe(0.8);
    expect(PARAMETROS_POR_DEFECTO.umbral_semaforo_naranja).toBe(0.99);
    expect(PARAMETROS_POR_DEFECTO.vigencia_avaluo_meses).toBe(12);
    expect(PARAMETROS_POR_DEFECTO.moneda).toBe('COP');
    expect(CLAVES_PARAMETRO).toHaveLength(17);
  });

  it('la semilla JSON y el código son la misma fuente', () => {
    expect(EsquemaParametrosCalculo.parse(semilla.parametros)).toEqual(PARAMETROS_POR_DEFECTO);
  });
});

describe('serialización clave/valor', () => {
  it('sobrevive el viaje de ida y vuelta', () => {
    const filas = CLAVES_PARAMETRO.map((clave) => ({ clave, valor: serializarParametro(clave, PARAMETROS_POR_DEFECTO[clave]) }));
    expect(parametrosDesdeFilas(filas)).toEqual(PARAMETROS_POR_DEFECTO);
    expect(serializarParametro('deprecia_mes_adquisicion', true)).toBe('true');
    expect(serializarParametro('umbral_semaforo_verde', 0.5)).toBe('0.5');
  });

  it('lo que falta en la base toma el valor por defecto', () => {
    const p = parametrosDesdeFilas([{ clave: 'metodo_conteo_meses', valor: 'mes_completo' }, { clave: 'desconocida', valor: 'x' }]);
    expect(p.metodo_conteo_meses).toBe('mes_completo');
    expect(p.valor_residual_pct).toBe(0);
  });
});

describe('validarUmbrales (RN-01-05)', () => {
  it('exige verde ≤ amarillo ≤ naranja < 1', () => {
    expect(validarUmbrales(PARAMETROS_POR_DEFECTO)).toBeNull();
    expect(validarUmbrales({ ...PARAMETROS_POR_DEFECTO, umbral_semaforo_verde: 0.9 })).toContain('verde');
    expect(validarUmbrales({ ...PARAMETROS_POR_DEFECTO, umbral_semaforo_naranja: 1 })).toContain('naranja');
  });
});
