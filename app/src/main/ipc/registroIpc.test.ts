/** T-B-08 — cadena de middleware y cobertura del contrato. */
import { describe, expect, it, vi } from 'vitest';
import { CANALES } from '../../compartido/ipc/contrato';
import { abrirBaseDePrueba, sembrarMinimo } from '../infraestructura/db/pruebas/semilla';
import { crearBitacora } from '../infraestructura/bitacora/registrador';
import { crearRegistroIpc, type ContextoIpc, type ReceptorIpc, type RegistroIpc } from './registroIpc';
import { registrarTodosLosHandlers } from './registrarHandlers';
import { GestorTareas } from './tareas';
import type { Registro } from '../arranque/registro';
import { dialogosNulos, RUTA_PLANTILLAS } from './pruebas/dialogos';

const registroSilencioso: Registro = { ruta: '', error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

async function preparar(): Promise<{ registro: RegistroIpc; ctx: ContextoIpc; receptor: ReceptorIpc & { canales: string[] } }> {
  const { sqlite, db } = await abrirBaseDePrueba();
  const ctx: ContextoIpc = {
    sqlite,
    db,
    bitacora: crearBitacora(sqlite, 'equipo/usuario', () => '2026-09-02T10:00:00.000Z'),
    ahoraIso: () => '2026-09-02T10:00:00.000Z',
    rutaDatos: '', rutaPlantillas: RUTA_PLANTILLAS,
    dialogos: dialogosNulos(),
  };
  const receptor = {
    canales: [] as string[],
    handle(canal: string) {
      this.canales.push(canal);
    },
  };
  const registro = crearRegistroIpc({ receptor, contexto: ctx, registro: registroSilencioso });
  return { registro, ctx, receptor };
}

describe('cobertura del contrato (plan 2.3 §9)', () => {
  it('todo canal del contrato tiene manejador y ninguno sobra', async () => {
    const { registro, receptor } = await preparar();
    registrarTodosLosHandlers(registro, {
      versionApp: '0.1.0',
      tareas: new GestorTareas(),
      versiones: { electron: 'e', chrome: 'c', node: 'n' },
    });
    expect([...registro.canalesRegistrados()].sort()).toEqual([...CANALES].sort());
    expect([...receptor.canales].sort()).toEqual([...CANALES].sort());
  });

  it('rechaza registrar un canal fuera del contrato o dos veces', async () => {
    const { registro } = await preparar();
    expect(() => registro.registrar('db:query' as never, () => ({}) as never)).toThrow(/no está en el contrato/);
    registro.registrar('tarea:cancelar', () => ({ cancelada: false }));
    expect(() => registro.registrar('tarea:cancelar', () => ({ cancelada: false }))).toThrow(/ya tiene manejador/);
  });
});

describe('cadena de middleware', () => {
  it('1 · un canal sin manejador devuelve error de infraestructura, nunca lanza', async () => {
    const { registro } = await preparar();
    const r = await registro.invocar('tarea:cancelar', { tareaId: 'x' });
    expect(r).toMatchObject({ ok: false, error: { tipo: 'INFRAESTRUCTURA', codigo: 'CANAL_DESCONOCIDO' } });
  });

  it('2 · la entrada inválida produce ErrorValidacion con el campo', async () => {
    const { registro } = await preparar();
    registro.registrar('tarea:cancelar', () => ({ cancelada: true }));
    const r = await registro.invocar('tarea:cancelar', { tareaId: 'no-es-uuid' });
    expect(r).toMatchObject({
      ok: false,
      error: { tipo: 'VALIDACION', codigo: 'ENTRADA_INVALIDA', campo: 'tareaId' },
    });
  });

  it('6/7 · un canal que muta corre en transacción: si el caso de uso falla, la bitácora no queda', async () => {
    const { registro, ctx } = await preparar();
    registro.registrar('responsable:desactivar', (_e, c) => {
      c.bitacora.registrar({ entidadAfectada: 'x', registroId: 'y', accion: 'ACTUALIZAR' });
      throw new Error('se cae después de escribir bitácora');
    });
    const r = await registro.invocar('responsable:desactivar', {
      id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      justificacion: 'prueba de reversión',
    });
    expect(r.ok).toBe(false);
    const filas = ctx.sqlite.prepare('SELECT COUNT(*) AS n FROM bitacora').get() as { n: number };
    expect(filas.n).toBe(0);
  });

  it('6 · un manejador asíncrono en un canal que muta se rechaza', async () => {
    const { registro } = await preparar();
    registro.registrar('responsable:desactivar', async () => ({}) as never);
    const r = await registro.invocar('responsable:desactivar', {
      id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      justificacion: 'x',
    });
    expect(r).toMatchObject({ ok: false, error: { codigo: 'MANEJADOR_ASINCRONO' } });
  });

  it('9 · los errores de SQLite se traducen: el código de la regla viaja como codigo, sin traza', async () => {
    const { registro, ctx } = await preparar();
    const ids = sembrarMinimo(ctx.db);
    registro.registrar('responsable:desactivar', (_e, c) => {
      c.sqlite.prepare('DELETE FROM ejercicio WHERE id = ?').run(ids.ejercicio);
      c.sqlite
        .prepare(
          `INSERT INTO entidad (id, razon_social, nit, municipio, departamento, nivel_complejidad, nombre_gerente, direccion)
           VALUES ('z', 'X', '9', 'M', 'D', 'IV', 'G', 'Dir')`,
        )
        .run();
      return {} as never;
    });
    const r = await registro.invocar('responsable:desactivar', {
      id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      justificacion: 'x',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('INTEGRIDAD');
      expect(r.error.codigo).toBe('VALOR_FUERA_DE_CATALOGO');
      expect(JSON.stringify(r.error)).not.toContain('    at ');
    }
  });

  it('9 · el mensaje de un trigger INT-nn se convierte en su código', async () => {
    const { registro, ctx } = await preparar();
    const ids = sembrarMinimo(ctx.db);
    ctx.sqlite
      .prepare(
        `INSERT INTO bien (id, ejercicio_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id, sede_id, servicio_id, estado_actual, condicion_tenencia, fecha_toma, funcionario_conteo)
         VALUES ('b1', ?, 'C', 'P', 'D', ?, ?, ?, 'BUENO', 'PROPIO', '2025-05-01', 'F')`,
      )
      .run(ids.ejercicio, ids.clase, ids.sede, ids.servicio);
    registro.registrar('responsable:desactivar', (_e, c) => {
      c.sqlite.prepare(`DELETE FROM bien WHERE id = 'b1'`).run();
      return {} as never;
    });
    const r = await registro.invocar('responsable:desactivar', {
      id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
      justificacion: 'x',
    });
    expect(r).toMatchObject({ ok: false, error: { tipo: 'INTEGRIDAD', codigo: 'INT-03' } });
  });

  it('8 · una lectura devuelve el valor en el sobre', async () => {
    const { registro } = await preparar();
    registrarTodosLosHandlers(registro, {
      versionApp: '0.1.0',
      tareas: new GestorTareas(),
      versiones: { electron: '44.1.1', chrome: '152', node: '24' },
    });
    const r = await registro.invocar('app:obtenerEstado', undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.baseDatos.conectada).toBe(true);
      expect(r.valor.versionEsquema).toBeGreaterThan(0);
    }
  });
});
