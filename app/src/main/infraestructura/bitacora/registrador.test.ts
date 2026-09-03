/** T-B-09 — bitácora con justificación obligatoria en los 8 campos sensibles. */
import { describe, expect, it } from 'vitest';
import { abrirBaseDePrueba } from '../db/pruebas/semilla';
import { crearBitacora, esCampoSensible } from './registrador';
import { ErrorValidacion } from '../../../compartido/errores';

async function preparar() {
  const { sqlite } = await abrirBaseDePrueba();
  const bitacora = crearBitacora(sqlite, 'PC-HOSPITAL/contabilidad', () => '2026-09-02T10:00:00.000Z');
  const filas = () =>
    sqlite
      .prepare('SELECT entidad_afectada, registro_id, accion, campo, valor_anterior, valor_nuevo, justificacion, origen, fecha FROM bitacora ORDER BY rowid')
      .all() as Record<string, unknown>[];
  return { sqlite, bitacora, filas };
}

describe('registrar', () => {
  it('escribe quién, cuándo, desde dónde y qué', async () => {
    const { bitacora, filas } = await preparar();
    bitacora.registrar({ entidadAfectada: 'responsable', registroId: 'r1', accion: 'CREAR', valorNuevo: 'Ana (CONTADOR)' });
    expect(filas()).toEqual([
      {
        entidad_afectada: 'responsable',
        registro_id: 'r1',
        accion: 'CREAR',
        campo: null,
        valor_anterior: null,
        valor_nuevo: 'Ana (CONTADOR)',
        justificacion: null,
        origen: 'PC-HOSPITAL/contabilidad',
        fecha: '2026-09-02T10:00:00.000Z',
      },
    ]);
  });
});

describe('registrarCambios', () => {
  const contexto = { entidadAfectada: 'hoja_vida', registroId: 'h1' };

  it('una fila por campo que cambió, ninguna por los que no', async () => {
    const { bitacora, filas } = await preparar();
    const n = bitacora.registrarCambios(
      contexto,
      { proveedor: 'A', numeroFactura: '1', fabricante: 'F' },
      { proveedor: 'B', numeroFactura: '1', fabricante: null },
    );
    expect(n).toBe(2);
    expect(filas().map((f) => [f.campo, f.valor_anterior, f.valor_nuevo])).toEqual([
      ['proveedor', 'A', 'B'],
      ['fabricante', 'F', null],
    ]);
  });

  it('cambiar costo_adquisicion sin justificación se rechaza y no escribe nada', async () => {
    const { bitacora, filas } = await preparar();
    expect(() =>
      bitacora.registrarCambios(contexto, { costo_adquisicion: 100, proveedor: 'A' }, { costo_adquisicion: 200, proveedor: 'B' }),
    ).toThrow(ErrorValidacion);
    expect(filas()).toHaveLength(0);
  });

  it('con justificación, el cambio sensible queda con ella', async () => {
    const { bitacora, filas } = await preparar();
    bitacora.registrarCambios(
      { ...contexto, justificacion: 'Factura corregida por el proveedor' },
      { costo_adquisicion: 100 },
      { costo_adquisicion: 200 },
    );
    expect(filas()[0]).toMatchObject({ campo: 'costo_adquisicion', valor_anterior: '100', valor_nuevo: '200', justificacion: 'Factura corregida por el proveedor' });
  });

  it('los 8 campos sensibles de ANEXO_B §7.1', () => {
    for (const c of ['costo_adquisicion', 'fecha_adquisicion', 'clase_activo_id', 'valor_avaluo_final', 'vida_util_tecnica_override', 'deterioro', 'causal_baja', 'fecha_corte']) {
      expect(esCampoSensible(c)).toBe(true);
    }
    expect(esCampoSensible('proveedor')).toBe(false);
  });
});
