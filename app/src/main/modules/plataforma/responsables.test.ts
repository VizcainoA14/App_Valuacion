/** T-B-07 — catálogo de responsables: CRUD sin borrado, sin login, con bitácora. */
import { describe, expect, it, vi } from 'vitest';
import { abrirBaseDePrueba, sembrarMinimo } from '../../infraestructura/db/pruebas/semilla';
import { crearBitacora } from '../../infraestructura/bitacora/registrador';
import { crearRegistroIpc, type RegistroIpc } from '../../ipc/registroIpc';
import { registrarCanalesPlataforma } from './index';
import type { ConexionSqlite } from '../../infraestructura/db/conexion';
import { dialogosNulos, RUTA_PLANTILLAS } from '../../ipc/pruebas/dialogos';

async function preparar(): Promise<{ registro: RegistroIpc; sqlite: ConexionSqlite; entidadId: string }> {
  const { sqlite, db } = await abrirBaseDePrueba();
  const ids = sembrarMinimo(db);
  const registro = crearRegistroIpc({
    receptor: { handle: () => undefined },
    registro: { ruta: '', error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    contexto: {
      sqlite,
      db,
      bitacora: crearBitacora(sqlite, 'pc/u', () => 'T'),
      ahoraIso: () => '2026-09-02T10:00:00.000Z',
      rutaDatos: '', rutaPlantillas: RUTA_PLANTILLAS,
      dialogos: dialogosNulos(),
    },
  });
  registrarCanalesPlataforma(registro);
  return { registro, sqlite, entidadId: ids.entidad };
}

const perito = {
  nombreCompleto: 'Pedro Perito',
  documentoIdentidad: '79000000',
  perfil: 'PERITO' as const,
  cargo: 'Avaluador',
  registroRaa: 'AVAL-12345',
};

function bitacoraDe(sqlite: ConexionSqlite, registroId: string) {
  return sqlite
    .prepare('SELECT accion, campo, valor_anterior, valor_nuevo, justificacion FROM bitacora WHERE registro_id = ? ORDER BY rowid')
    .all(registroId) as Record<string, unknown>[];
}

describe('responsable:crear', () => {
  it('crea, marca externo al perito y deja rastro en bitácora', async () => {
    const { registro, sqlite, entidadId } = await preparar();
    const r = await registro.invocar('responsable:crear', { entidadId, ...perito });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ perfil: 'PERITO', esExterno: true, activo: true, registroRaa: 'AVAL-12345' });
    expect(bitacoraDe(sqlite, r.valor.id)).toEqual([
      { accion: 'CREAR', campo: null, valor_anterior: null, valor_nuevo: 'Pedro Perito (PERITO)', justificacion: null },
    ]);
  });

  it('un perito sin registro R.A.A se rechaza (ANEXO_B §7.2)', async () => {
    const { registro, entidadId } = await preparar();
    const r = await registro.invocar('responsable:crear', { entidadId, ...perito, registroRaa: '' });
    expect(r).toMatchObject({ ok: false, error: { tipo: 'REGLA_NEGOCIO', codigo: 'PERITO_SIN_RAA', campo: 'registroRaa' } });
  });

  it('no admite dos personas con el mismo documento en la entidad', async () => {
    const { registro, entidadId } = await preparar();
    await registro.invocar('responsable:crear', { entidadId, ...perito });
    const r = await registro.invocar('responsable:crear', { entidadId, ...perito, nombreCompleto: 'Otro' });
    expect(r).toMatchObject({ ok: false, error: { codigo: 'RESPONSABLE_DUPLICADO' } });
  });

  it('valida la entrada: perfil fuera del catálogo', async () => {
    const { registro, entidadId } = await preparar();
    const r = await registro.invocar('responsable:crear', { entidadId, ...perito, perfil: 'ADMIN' });
    expect(r).toMatchObject({ ok: false, error: { tipo: 'VALIDACION', campo: 'perfil' } });
  });
});

describe('responsable:actualizar y desactivar', () => {
  it('actualizar registra una fila de bitácora por campo cambiado', async () => {
    const { registro, sqlite, entidadId } = await preparar();
    const creado = await registro.invocar('responsable:crear', { entidadId, ...perito });
    if (!creado.ok) throw new Error('no creó');
    const r = await registro.invocar('responsable:actualizar', {
      id: creado.valor.id,
      cambios: { cargo: 'Avaluador senior', tarjetaProfesional: 'TP-1' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.cargo).toBe('Avaluador senior');
    expect(bitacoraDe(sqlite, creado.valor.id).slice(1)).toEqual([
      { accion: 'ACTUALIZAR', campo: 'cargo', valor_anterior: 'Avaluador', valor_nuevo: 'Avaluador senior', justificacion: null },
      { accion: 'ACTUALIZAR', campo: 'tarjetaProfesional', valor_anterior: null, valor_nuevo: 'TP-1', justificacion: null },
    ]);
  });

  it('quitar el R.A.A a un perito se rechaza', async () => {
    const { registro, entidadId } = await preparar();
    const creado = await registro.invocar('responsable:crear', { entidadId, ...perito });
    if (!creado.ok) throw new Error('no creó');
    const r = await registro.invocar('responsable:actualizar', { id: creado.valor.id, cambios: { registroRaa: null } });
    expect(r).toMatchObject({ ok: false, error: { codigo: 'PERITO_SIN_RAA' } });
  });

  it('desactivar no borra: desaparece del listado activo, sigue en el completo y en bitácora', async () => {
    const { registro, sqlite, entidadId } = await preparar();
    const creado = await registro.invocar('responsable:crear', { entidadId, ...perito });
    if (!creado.ok) throw new Error('no creó');

    const r = await registro.invocar('responsable:desactivar', { id: creado.valor.id, justificacion: 'Terminó el contrato' });
    expect(r.ok).toBe(true);

    const activos = await registro.invocar('responsable:listar', { entidadId });
    const todos = await registro.invocar('responsable:listar', { entidadId, incluirInactivos: true });
    // La semilla ya trae un coordinador activo.
    expect(activos.ok && activos.valor.map((x) => x.perfil)).toEqual(['COORDINADOR']);
    expect(todos.ok && todos.valor.some((x) => x.id === creado.valor.id && !x.activo)).toBe(true);
    expect(bitacoraDe(sqlite, creado.valor.id).at(-1)).toMatchObject({ campo: 'activo', valor_nuevo: 'false', justificacion: 'Terminó el contrato' });
  });

  it('la justificación de desactivar es obligatoria en el contrato', async () => {
    const { registro, entidadId } = await preparar();
    const creado = await registro.invocar('responsable:crear', { entidadId, ...perito });
    if (!creado.ok) throw new Error('no creó');
    const r = await registro.invocar('responsable:desactivar', { id: creado.valor.id, justificacion: '' });
    expect(r).toMatchObject({ ok: false, error: { tipo: 'VALIDACION', campo: 'justificacion' } });
  });
});
