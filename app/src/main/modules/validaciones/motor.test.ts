/** T-C-01 — motor de validaciones declarativo: definiciones, predicados y evaluación por paso. */
import { describe, expect, it } from 'vitest';
import { VALIDACIONES, VALIDACIONES_PASO_02, VALIDACIONES_PASO_03, VALIDACIONES_PASO_05, VALIDACIONES_PASO_06, VALIDACIONES_PASO_09, validacionesDelPaso } from '../../../compartido/reglas/validaciones';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { codigosSinPredicado } from './motor';
import { nuevoId } from '../../infraestructura/db/identificadores';

describe('catálogo declarativo', () => {
  it('declara las 58 validaciones de los pasos 01, 02, 03, 05, 06 y 09 con códigos únicos', () => {
    // 10 + 9 + 8 + 9 + 10 + 12. Los pasos 04, 07, 08, 10 y 11 son extensiones
    // (ADR-026) y sus validaciones llegan con ellas.
    expect(VALIDACIONES).toHaveLength(58);
    expect(new Set(VALIDACIONES.map((v) => v.codigo)).size).toBe(58);
    expect(VALIDACIONES_PASO_02.map((v) => v.codigo)).toEqual(['VAL-02-01', 'VAL-02-02', 'VAL-02-03', 'VAL-02-04', 'VAL-02-05', 'VAL-02-06', 'VAL-02-07', 'VAL-02-08', 'VAL-02-09']);
    expect(VALIDACIONES_PASO_02.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(5);
    expect(VALIDACIONES_PASO_03.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(4);
    expect(VALIDACIONES_PASO_05.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(5);
    expect(VALIDACIONES_PASO_06.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(6);
    expect(VALIDACIONES_PASO_09.filter((v) => v.severidad === 'BLOQUEANTE')).toHaveLength(7);
    // El paso 04 (conciliación) es extensión: todavía no declara validaciones.
    expect(validacionesDelPaso(4)).toEqual([]);
  });
});

describe('evaluación por paso sobre el hospital de demostración', () => {
  it('todo código declarado tiene predicado registrado', async () => {
    await arnesPaso01(); // registra los handlers y, con ellos, los predicados
    expect(codigosSinPredicado()).toEqual([]);
  });

  it('paso 02: la demostración cubre todos los servicios; avisa de los bienes malos sin foto', async () => {
    const { registro } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const ej = valor(await registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 2, entidadId: demo.id, ejercicioId: ej?.id }));
    expect(v.puedeAvanzar).toBe(true);
    const porCodigo = Object.fromEntries(v.resultados.map((r) => [r.codigo, r]));
    expect(porCodigo['VAL-02-05']?.cumple).toBe(true);
    expect(porCodigo['VAL-02-06']).toMatchObject({ cumple: false, severidad: 'ADVERTENCIA' });
    expect(porCodigo['VAL-02-06']?.detalle).toContain('HDM');
    expect(porCodigo['VAL-02-09']?.cumple).toBe(true);
  });

  it('paso 02: un servicio nuevo sin bienes rompe la cobertura; un acta de custodia la restablece', async () => {
    const { registro, sqlite } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const ej = valor(await registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    const sede = valor(await registro.invocar('sede:listar', { entidadId: demo.id }))[0];
    const nuevo = valor(await registro.invocar('servicio:crear', { sedeId: sede?.id ?? '', codigo: 'NUE', nombre: 'Nuevo', tipo: 'apoyo' }));

    const antes = valor(await registro.invocar('validaciones:evaluar', { paso: 2, entidadId: demo.id, ejercicioId: ej?.id }));
    expect(antes.puedeAvanzar).toBe(false);
    expect(antes.resultados.find((r) => r.codigo === 'VAL-02-05')?.detalle).toContain('NUE');

    sqlite
      .prepare(`INSERT INTO acta_custodia (id, ejercicio_id, servicio_id, responsable, fecha, estado_firma) VALUES (?, ?, ?, 'Jefe', '2025-05-20', 'FIRMADA')`)
      .run(nuevoId(), ej?.id, nuevo.id);
    const despues = valor(await registro.invocar('validaciones:evaluar', { paso: 2, entidadId: demo.id, ejercicioId: ej?.id }));
    expect(despues.puedeAvanzar).toBe(true);
    expect(despues.resultados.find((r) => r.codigo === 'VAL-02-08')?.detalle).toContain('NUE');
  });

  it('paso 03: la demostración cumple las bloqueantes; avisa de mantenimiento y soportes', async () => {
    const { registro, sqlite } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const ej = valor(await registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 3, entidadId: demo.id, ejercicioId: ej?.id }));
    const porCodigo = Object.fromEntries(v.resultados.map((r) => [r.codigo, r]));
    expect(v.puedeAvanzar).toBe(true);
    expect(porCodigo['VAL-03-05']?.cumple).toBe(false);
    expect(porCodigo['VAL-03-08']?.cumple).toBe(false);

    // Quitar el costo a un bien: VAL-03-03 bloquea; un acta de reconocimiento inicial lo resuelve (RN-03-04).
    const bien = sqlite.prepare(`SELECT b.id, b.codigo_institucional AS c FROM bien b WHERE b.ejercicio_id = ? LIMIT 1`).get(ej?.id) as { id: string; c: string };
    sqlite.prepare(`UPDATE hoja_vida SET costo_adquisicion_cent = NULL WHERE bien_id = ?`).run(bien.id);
    const roto = valor(await registro.invocar('validaciones:evaluar', { paso: 3, entidadId: demo.id, ejercicioId: ej?.id }));
    expect(roto.puedeAvanzar).toBe(false);
    expect(roto.resultados.find((r) => r.codigo === 'VAL-03-03')?.detalle).toContain(bien.c);
    sqlite
      .prepare(`INSERT INTO soporte_documental (id, bien_id, tipo_documento, url, hash_sha256, cargado_en) VALUES (?, ?, 'AVALUO_RECONOCIMIENTO_INICIAL', 'x.pdf', 'h', 'f')`)
      .run(nuevoId(), bien.id);
    const resuelto = valor(await registro.invocar('validaciones:evaluar', { paso: 3, entidadId: demo.id, ejercicioId: ej?.id }));
    expect(resuelto.resultados.find((r) => r.codigo === 'VAL-03-03')?.cumple).toBe(true);
  });

  it('sin ejercicio, los pasos 02 y 03 no pueden evaluarse', async () => {
    const { registro } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 2, entidadId: demo.id }));
    expect(v.puedeAvanzar).toBe(false);
    expect(v.resultados.every((r) => r.detalle === null || r.detalle.includes('ejercicio'))).toBe(true);
  });
});
