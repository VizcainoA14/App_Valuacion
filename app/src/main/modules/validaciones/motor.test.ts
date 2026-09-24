/** Motor de validaciones declarativo: la revisión de la configuración de la entidad (ADR-028). */
import { describe, expect, it } from 'vitest';
import { VALIDACIONES } from '../../../compartido/reglas/validaciones';
import { arnesPaso01, PROCESO_PRUEBA, valor } from '../configuracion/pruebas';
import { codigosSinPredicado } from './motor';

describe('catálogo declarativo', () => {
  it('declara solo la revisión de la configuración, con códigos únicos', () => {
    // Las del paso 01 que no dependen de un ejercicio ni de un documento externo.
    expect(VALIDACIONES.map((v) => v.codigo)).toEqual(['VAL-01-01', 'VAL-01-02', 'VAL-01-03', 'VAL-01-04', 'VAL-01-05', 'VAL-01-09', 'VAL-01-10']);
    expect(VALIDACIONES.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(5);
  });

  it('todo código declarado tiene predicado registrado', async () => {
    await arnesPaso01(); // registra los handlers y, con ellos, los predicados
    expect(codigosSinPredicado()).toEqual([]);
  });
});

describe('validaciones:evaluar', () => {
  it('una entidad recién creada sin sedes ni servicios no está lista, y dice por qué', async () => {
    const { registro } = await arnesPaso01();
    const entidad = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, precargarSemillas: false }));
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: entidad.id }));
    expect(v.lista).toBe(false);
    const porCodigo = Object.fromEntries(v.resultados.map((r) => [r.codigo, r]));
    expect(porCodigo['VAL-01-02']).toMatchObject({ cumple: false, detalle: 'No hay sedes activas' });
    expect(porCodigo['VAL-01-03']?.cumple).toBe(false);
  });

  it('la demostración está lista para calcular: no depende de actas ni de fechas de corte', async () => {
    const { registro } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: demo.id }));
    expect(v.lista).toBe(true);
    expect(v.bloqueantesPendientes).toBe(0);
  });
});
