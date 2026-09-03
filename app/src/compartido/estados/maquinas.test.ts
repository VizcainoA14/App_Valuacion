/** T-B-05 — toda transición no declarada es rechazada. */
import { describe, expect, it } from 'vitest';
import {
  MAQUINAS_DE_ESTADO,
  MAQUINA_BIEN,
  MAQUINA_EJERCICIO,
  MAQUINA_PROPUESTA_BAJA,
  MAQUINA_ACTO_ADMINISTRATIVO,
  estadosDe,
  esTerminal,
  puedeTransitar,
  validarTransicion,
  type MaquinaEstado,
} from './maquinas';
import { ESTADO_REGISTRO } from '../enums/catalogos';
import type { Catalogo } from '../enums/definirCatalogo';
import {
  ESTADO_EJERCICIO,
  ESTADO_PROPUESTA_BAJA,
  ESTADO_ACTO_ADMINISTRATIVO,
} from '../enums/estados';
import { ErrorReglaNegocio } from '../errores';

const casos: [MaquinaEstado<string>, Catalogo<string>][] = [
  [MAQUINA_EJERCICIO, ESTADO_EJERCICIO],
  [MAQUINA_BIEN, ESTADO_REGISTRO],
  [MAQUINA_PROPUESTA_BAJA, ESTADO_PROPUESTA_BAJA],
  [MAQUINA_ACTO_ADMINISTRATIVO, ESTADO_ACTO_ADMINISTRATIVO],
];

describe('coherencia con los catálogos', () => {
  it.each(casos)('$nombre cubre exactamente los valores de su enum', (maquina, catalogo) => {
    expect([...estadosDe(maquina)].sort()).toEqual([...catalogo.valores].sort());
    for (const destinos of Object.values(maquina.transiciones)) {
      for (const d of destinos) expect(catalogo.es(d)).toBe(true);
    }
    expect(catalogo.es(maquina.inicial)).toBe(true);
  });

  it('hay cuatro máquinas (ANEXO_B §6) y toda máquina tiene al menos un estado terminal', () => {
    expect(MAQUINAS_DE_ESTADO).toHaveLength(4);
    for (const m of MAQUINAS_DE_ESTADO) {
      expect(estadosDe(m).some((e) => esTerminal(m, e))).toBe(true);
    }
  });
});

describe('Bien.estado_registro (ANEXO_B §6.2, CT-06)', () => {
  it('declara las transiciones de la tabla del anexo', () => {
    expect(puedeTransitar(MAQUINA_BIEN, 'BORRADOR', 'VALIDADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'BORRADOR', 'INCOMPLETO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'VALIDADO', 'ACTIVO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'VALIDADO', 'INCOMPLETO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'INCOMPLETO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'INCOMPLETO', 'VALIDADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'INCOMPLETO', 'ACTIVO')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'PROPUESTO_BAJA')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'PROPUESTO_BAJA', 'DADO_DE_BAJA')).toBe(true);
  });

  it('incluye la vuelta atrás del Comité (RN-09-04)', () => {
    expect(puedeTransitar(MAQUINA_BIEN, 'PROPUESTO_BAJA', 'ACTIVO')).toBe(true);
  });

  it('DADO_DE_BAJA es terminal (RN-09-09) y no hay saltos', () => {
    expect(esTerminal(MAQUINA_BIEN, 'DADO_DE_BAJA')).toBe(true);
    expect(puedeTransitar(MAQUINA_BIEN, 'BORRADOR', 'ACTIVO')).toBe(false);
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'DADO_DE_BAJA')).toBe(false);
    expect(puedeTransitar(MAQUINA_BIEN, 'DADO_DE_BAJA', 'ACTIVO')).toBe(false);
    expect(puedeTransitar(MAQUINA_BIEN, 'ACTIVO', 'ACTIVO')).toBe(false);
  });
});

describe('Ejercicio, PropuestaBaja y ActoAdministrativo', () => {
  it('el ejercicio es lineal y CERRADO es terminal', () => {
    expect(puedeTransitar(MAQUINA_EJERCICIO, 'ABIERTO', 'EN_LEVANTAMIENTO')).toBe(true);
    expect(puedeTransitar(MAQUINA_EJERCICIO, 'ABIERTO', 'EN_CALCULO')).toBe(false);
    expect(puedeTransitar(MAQUINA_EJERCICIO, 'EN_APROBACION', 'CERRADO')).toBe(true);
    expect(esTerminal(MAQUINA_EJERCICIO, 'CERRADO')).toBe(true);
  });

  it('la propuesta solo se rechaza en revisión', () => {
    expect(puedeTransitar(MAQUINA_PROPUESTA_BAJA, 'EN_REVISION', 'RECHAZADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_PROPUESTA_BAJA, 'PROPUESTO', 'RECHAZADO')).toBe(false);
    expect(puedeTransitar(MAQUINA_PROPUESTA_BAJA, 'APROBADO_COMITE', 'RECHAZADO')).toBe(false);
    expect(esTerminal(MAQUINA_PROPUESTA_BAJA, 'RECHAZADO')).toBe(true);
  });

  it('el acto firmado solo puede publicarse', () => {
    expect(puedeTransitar(MAQUINA_ACTO_ADMINISTRATIVO, 'FIRMADO', 'PUBLICADO')).toBe(true);
    expect(puedeTransitar(MAQUINA_ACTO_ADMINISTRATIVO, 'FIRMADO', 'PROYECTADO')).toBe(false);
    expect(puedeTransitar(MAQUINA_ACTO_ADMINISTRATIVO, 'PROYECTADO', 'FIRMADO')).toBe(false);
  });
});

describe('validarTransicion', () => {
  it('lanza ErrorReglaNegocio con las transiciones permitidas en el detalle', () => {
    expect(() => validarTransicion(MAQUINA_BIEN, 'ACTIVO', 'DADO_DE_BAJA')).toThrow(
      ErrorReglaNegocio,
    );
    try {
      validarTransicion(MAQUINA_BIEN, 'ACTIVO', 'DADO_DE_BAJA');
    } catch (e) {
      const dto = (e as ErrorReglaNegocio).aDto();
      expect(dto.codigo).toBe('TRANSICION_NO_PERMITIDA');
      expect(dto.campo).toBe('estado_registro');
      expect(dto.detalle).toContain('PROPUESTO_BAJA');
    }
    expect(() => validarTransicion(MAQUINA_BIEN, 'ACTIVO', 'PROPUESTO_BAJA')).not.toThrow();
  });
});
