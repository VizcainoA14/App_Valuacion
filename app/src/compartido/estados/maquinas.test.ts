/** Toda transición no declarada es rechazada. */
import { describe, expect, it } from 'vitest';
import { MAQUINAS_DE_ESTADO, MAQUINA_BIEN, MAQUINA_PROCESO, estadosDe, esTerminal, puedeTransitar, validarTransicion } from './maquinas';
import { ESTADO_BIEN, ESTADO_PROCESO } from '../enums/estados';
import { ErrorReglaNegocio } from '../errores';

describe('coherencia con el catálogo', () => {
  it('la máquina del bien cubre exactamente los valores de ESTADO_BIEN', () => {
    expect([...estadosDe(MAQUINA_BIEN)].sort()).toEqual([...ESTADO_BIEN.valores].sort());
    for (const destinos of Object.values(MAQUINA_BIEN.transiciones)) {
      for (const d of destinos) expect(ESTADO_BIEN.es(d)).toBe(true);
    }
    expect(ESTADO_BIEN.es(MAQUINA_BIEN.inicial)).toBe(true);
  });

  it('hay dos máquinas: la del bien (ADR-028) y la del proceso (ADR-029)', () => {
    expect(MAQUINAS_DE_ESTADO).toEqual([MAQUINA_BIEN, MAQUINA_PROCESO]);
  });

  it('la máquina del proceso cubre exactamente los valores de ESTADO_PROCESO', () => {
    expect([...estadosDe(MAQUINA_PROCESO)].sort()).toEqual([...ESTADO_PROCESO.valores].sort());
  });
});

describe('Bien.estado_registro (ADR-028)', () => {
  it('todo bien nace ACTIVO', () => {
    expect(MAQUINA_BIEN.inicial).toBe('ACTIVO');
  });

  it('un barrido lo pierde y otro lo recupera', () => {
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'NO_ENCONTRADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'NO_ENCONTRADO', 'ACTIVO')).toBe(true);
  });

  it('la baja se registra desde activo o no encontrado, y se puede anular', () => {
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'DADO_DE_BAJA')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'NO_ENCONTRADO', 'DADO_DE_BAJA')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'DADO_DE_BAJA', 'ACTIVO')).toBe(true);
  });

  it('un bien dado de baja no reaparece como no encontrado, y no hay estado terminal', () => {
    expect(puedeTransitar(MAQUINA_BIEN, 'DADO_DE_BAJA', 'NO_ENCONTRADO')).toBe(false);
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'ACTIVO')).toBe(false);
    for (const e of estadosDe(MAQUINA_BIEN)) expect(esTerminal(MAQUINA_BIEN, e)).toBe(false);
  });
});

describe('Proceso.estado (ADR-029)', () => {
  it('nace EN_CURSO, se finaliza y no se reabre', () => {
    expect(MAQUINA_PROCESO.inicial).toBe('EN_CURSO');
    expect(puedeTransitar(MAQUINA_PROCESO, 'EN_CURSO', 'FINALIZADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_PROCESO, 'FINALIZADO', 'EN_CURSO')).toBe(false);
    expect(esTerminal(MAQUINA_PROCESO, 'FINALIZADO')).toBe(true);
    expect(esTerminal(MAQUINA_PROCESO, 'EN_CURSO')).toBe(false);
  });
});

describe('validarTransicion', () => {
  it('lanza ErrorReglaNegocio con las transiciones permitidas en el detalle', () => {
    expect(() => validarTransicion(MAQUINA_BIEN, 'DADO_DE_BAJA', 'NO_ENCONTRADO')).toThrow(ErrorReglaNegocio);
    try {
      validarTransicion(MAQUINA_BIEN, 'DADO_DE_BAJA', 'NO_ENCONTRADO');
    } catch (e) {
      const dto = (e as ErrorReglaNegocio).aDto();
      expect(dto.codigo).toBe('TRANSICION_NO_PERMITIDA');
      expect(dto.campo).toBe('estado_registro');
      expect(dto.detalle).toContain('ACTIVO');
    }
    expect(() => validarTransicion(MAQUINA_BIEN, 'ACTIVO', 'DADO_DE_BAJA')).not.toThrow();
  });
});
