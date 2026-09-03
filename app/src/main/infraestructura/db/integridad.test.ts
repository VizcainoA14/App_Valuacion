/**
 * T-B-04 — INT-01 … INT-10 y máquinas de estado, violadas POR SQL DIRECTO.
 * No se pasa por ningún caso de uso: la prueba es que ni un script, ni una
 * migración, ni una herramienta externa pueden saltarse las reglas.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBaseDePrueba, sembrarMinimo, crearBien, type IdsSemilla } from './pruebas/semilla';
import { nuevoId } from './identificadores';
import type { ConexionSqlite } from './conexion';
import { generarSql, RUTA_MIGRACION } from '../../../../scripts/generar-triggers';
import { comoCentavos } from '../../../compartido/tipos/basicos';
import { restarCentavos } from '../../../compartido/motor/dinero';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

async function base() {
  const { sqlite, db } = await abrirBaseDePrueba();
  const ids = sembrarMinimo(db);
  return { sqlite, db, ids };
}

function insertarHojaVida(sqlite: ConexionSqlite, bienId: string, fechaAdquisicion: string | null) {
  return sqlite
    .prepare(
      `INSERT INTO hoja_vida (id, bien_id, estado_operativo, forma_adquisicion, fecha_adquisicion, costo_adquisicion_cent)
       VALUES (?, ?, 'OPERATIVO', 'COMPRA', ?, 2373928000)`,
    )
    .run(nuevoId(), bienId, fechaAdquisicion);
}

function insertarCalculoDepreciacion(
  sqlite: ConexionSqlite,
  ids: IdsSemilla,
  bienId: string,
  acumuladaCent: number,
  baseCent = 2373928000,
) {
  const saldo = restarCentavos(comoCentavos(baseCent), comoCentavos(acumuladaCent));
  return sqlite
    .prepare(
      `INSERT INTO calculo_depreciacion (id, ejercicio_id, bien_id, fecha_corte, valor_adquisicion_cent,
         saldo_final_ajustado_cent, base_depreciable_cent, fecha_inicio_depreciacion, vida_util_meses,
         depreciacion_mensual_x10k, meses_transcurridos_x10k, metodo_conteo_aplicado,
         depreciacion_acumulada_cent, saldo_por_depreciar_cent, valor_neto_libros_cent,
         entrada_hash, parametros_hash, calculado_en)
       VALUES (?, ?, ?, '2025-06-30', ?, ?, ?, '2018-04-27', 180, 1318848889, 861109, 'dias_exactos',
         ?, ?, ?, 'h', 'p', '2026-09-02T00:00:00.000Z')`,
    )
    .run(nuevoId(), ids.ejercicio, bienId, baseCent, baseCent, baseCent, acumuladaCent, saldo, saldo);
}

function insertarActaComite(sqlite: ConexionSqlite, ids: IdsSemilla): string {
  const id = nuevoId();
  sqlite
    .prepare(
      `INSERT INTO acta_comite (id, ejercicio_id, numero_acta, fecha, lugar, asistentes_json, quorum_valido, orden_del_dia, decisiones, estado_firma)
       VALUES (?, ?, '001', '2025-07-15', 'Sala de juntas', '[]', 1, 'Bajas', 'Aprobadas', 'FIRMADA')`,
    )
    .run(id, ids.ejercicio);
  return id;
}

function actualizarEstado(sqlite: ConexionSqlite, tabla: string, columna: string, id: string, estado: string) {
  sqlite.prepare(`UPDATE ${tabla} SET ${columna} = ? WHERE id = ?`).run(estado, id);
}

function cerrarEjercicio(sqlite: ConexionSqlite, ejercicioId: string) {
  for (const e of ['EN_LEVANTAMIENTO', 'EN_CONCILIACION', 'EN_CALCULO', 'EN_VALUACION', 'EN_APROBACION', 'CERRADO']) {
    actualizarEstado(sqlite, 'ejercicio', 'estado', ejercicioId, e);
  }
}

describe('INT-01 · código institucional y placa únicos por ejercicio', () => {
  it('rechaza una placa repetida y un código repetido', async () => {
    const { db, ids } = await base();
    crearBien(db, ids, { placa: 'PL-1', codigoInstitucional: 'C-1' });
    expect(() => crearBien(db, ids, { placa: 'PL-1', codigoInstitucional: 'C-2' })).toThrow(/UNIQUE/);
    expect(() => crearBien(db, ids, { placa: 'PL-2', codigoInstitucional: 'C-1' })).toThrow(/UNIQUE/);
  });
});

describe('INT-02 · un bien no cambia de ejercicio', () => {
  it('rechaza el UPDATE de ejercicio_id', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const otro = nuevoId();
    sqlite
      .prepare(
        `INSERT INTO ejercicio (id, entidad_id, nombre, fecha_corte, parametros_congelados_json, creado_por_responsable_id)
         VALUES (?, ?, 'Otro', '2026-06-30', '{}', ?)`,
      )
      .run(otro, ids.entidad, ids.responsable);
    expect(() => sqlite.prepare('UPDATE bien SET ejercicio_id = ? WHERE id = ?').run(otro, bienId)).toThrow(/INT-02/);
  });
});

describe('INT-03 · un bien no se elimina', () => {
  it('rechaza DELETE sobre bien', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    expect(() => sqlite.prepare('DELETE FROM bien WHERE id = ?').run(bienId)).toThrow(/INT-03/);
  });

  it('permite borrar los bienes del hospital de demostración (T-B-11)', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    sqlite.prepare('UPDATE entidad SET es_demostracion = 1 WHERE id = ?').run(ids.entidad);
    expect(sqlite.prepare('DELETE FROM bien WHERE id = ?').run(bienId).changes).toBe(1);
  });
});

describe('INT-04 · fecha_adquisicion ≤ fecha_corte', () => {
  it('rechaza una adquisición posterior al corte, acepta el mismo día y NULL', async () => {
    const { sqlite, db, ids } = await base();
    const b1 = crearBien(db, ids);
    const b2 = crearBien(db, ids);
    const b3 = crearBien(db, ids);
    expect(() => insertarHojaVida(sqlite, b1, '2025-07-01')).toThrow(/INT-04/);
    expect(() => insertarHojaVida(sqlite, b2, '2025-06-30')).not.toThrow();
    expect(() => insertarHojaVida(sqlite, b3, null)).not.toThrow();
  });

  it('rechaza mover la fecha de corte por debajo de una adquisición existente', async () => {
    const { sqlite, db, ids } = await base();
    insertarHojaVida(sqlite, crearBien(db, ids), '2024-03-01');
    expect(() =>
      sqlite.prepare('UPDATE ejercicio SET fecha_corte = ? WHERE id = ?').run('2023-12-31', ids.ejercicio),
    ).toThrow(/INT-04/);
    expect(() =>
      sqlite.prepare('UPDATE ejercicio SET fecha_corte = ? WHERE id = ?').run('2024-12-31', ids.ejercicio),
    ).not.toThrow();
  });
});

describe('INT-05 · depreciación acumulada ≤ base depreciable', () => {
  it('rechaza superar la base', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    expect(() => insertarCalculoDepreciacion(sqlite, ids, bienId, 2373928001)).toThrow(/CHECK/);
    expect(() => insertarCalculoDepreciacion(sqlite, ids, bienId, 2373928000)).not.toThrow();
  });
});

describe('INT-06 · valor_avaluo_final ≥ 0', () => {
  it('rechaza un avalúo negativo', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const insertar = (valor: number) =>
      sqlite
        .prepare(
          `INSERT INTO valuacion_mueble (id, ejercicio_id, bien_id, metodo_valuacion, valor_avaluo_final_cent,
             diferencia_vs_libros_cent, tipo_ajuste, justificacion_tecnica, especialista_id, fecha_valuacion)
           VALUES (?, ?, ?, 'VALOR_CERO', ?, 0, 'SIN_CAMBIO', 'Chatarra', ?, '2025-07-01T00:00:00.000Z')`,
        )
        .run(nuevoId(), ids.ejercicio, bienId, valor, ids.responsable);
    expect(() => insertar(-1)).toThrow(/CHECK/);
    expect(() => insertar(0)).not.toThrow();
  });
});

describe('INT-07 · baja EJECUTADO exige acta del Comité', () => {
  it('rechaza ejecutar sin acta y lo permite con acta', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const propuesta = nuevoId();
    sqlite
      .prepare(
        `INSERT INTO propuesta_baja (id, ejercicio_id, bien_id, causal, justificacion_tecnica, especialista_id, fecha_propuesta)
         VALUES (?, ?, ?, 'OBSOLESCENCIA', 'Equipo sin repuestos', ?, '2025-07-01')`,
      )
      .run(propuesta, ids.ejercicio, bienId, ids.responsable);
    for (const e of ['EN_REVISION', 'APROBADO_COMITE', 'RESOLUCION_EMITIDA']) {
      actualizarEstado(sqlite, 'propuesta_baja', 'estado_aprobacion', propuesta, e);
    }
    expect(() => actualizarEstado(sqlite, 'propuesta_baja', 'estado_aprobacion', propuesta, 'EJECUTADO')).toThrow(/INT-07/);

    const acta = insertarActaComite(sqlite, ids);
    sqlite.prepare('UPDATE propuesta_baja SET acta_comite_id = ? WHERE id = ?').run(acta, propuesta);
    expect(() => actualizarEstado(sqlite, 'propuesta_baja', 'estado_aprobacion', propuesta, 'EJECUTADO')).not.toThrow();
  });
});

describe('INT-08 · acto firmado exige acta; RN-10-07 · firmado es inmutable', () => {
  function crearActo(sqlite: ConexionSqlite, ids: IdsSemilla): string {
    const id = nuevoId();
    sqlite
      .prepare(
        `INSERT INTO acto_administrativo (id, ejercicio_id, tipo_resolucion, epigrafe)
         VALUES (?, ?, 'BAJA', 'Por la cual se ordena la baja de bienes')`,
      )
      .run(id, ids.ejercicio);
    actualizarEstado(sqlite, 'acto_administrativo', 'estado', id, 'EN_REVISION_JURIDICA');
    actualizarEstado(sqlite, 'acto_administrativo', 'estado', id, 'APROBADO_COMITE');
    return id;
  }

  it('rechaza firmar sin acta', async () => {
    const { sqlite, ids } = await base();
    const acto = crearActo(sqlite, ids);
    expect(() => actualizarEstado(sqlite, 'acto_administrativo', 'estado', acto, 'FIRMADO')).toThrow(/INT-08/);
  });

  it('firmado con acta queda congelado: solo puede publicarse', async () => {
    const { sqlite, ids } = await base();
    const acto = crearActo(sqlite, ids);
    const acta = insertarActaComite(sqlite, ids);
    sqlite
      .prepare(`UPDATE acto_administrativo SET estado = 'FIRMADO', acta_comite_id = ?, inmutable = 1, fecha_firma = 'f' WHERE id = ?`)
      .run(acta, acto);

    expect(() => sqlite.prepare(`UPDATE acto_administrativo SET epigrafe = 'Otro' WHERE id = ?`).run(acto)).toThrow(/RN-10-07/);
    expect(() => sqlite.prepare(`UPDATE acto_administrativo SET inmutable = 0 WHERE id = ?`).run(acto)).toThrow(/RN-10-07/);
    expect(() => actualizarEstado(sqlite, 'acto_administrativo', 'estado', acto, 'PROYECTADO')).toThrow(/transici/);
    expect(() => actualizarEstado(sqlite, 'acto_administrativo', 'estado', acto, 'PUBLICADO')).not.toThrow();
  });
});

describe('INT-09 · un ejercicio CERRADO rechaza toda escritura', () => {
  it('bloquea INSERT, UPDATE y DELETE directos e indirectos, y el propio ejercicio', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    insertarHojaVida(sqlite, bienId, '2024-01-15');
    cerrarEjercicio(sqlite, ids.ejercicio);

    // tabla directa
    expect(() => crearBien(db, ids)).toThrow(/INT-09/);
    expect(() => sqlite.prepare(`UPDATE bien SET marca = 'X' WHERE id = ?`).run(bienId)).toThrow(/INT-09/);
    // tabla indirecta (vía bien)
    expect(() => sqlite.prepare('DELETE FROM hoja_vida WHERE bien_id = ?').run(bienId)).toThrow(/INT-09/);
    expect(() => sqlite.prepare(`UPDATE hoja_vida SET proveedor = 'X' WHERE bien_id = ?`).run(bienId)).toThrow(/INT-09/);
    // el ejercicio mismo: ni renombrar, ni reabrir, ni borrar
    expect(() => sqlite.prepare(`UPDATE ejercicio SET nombre = 'X' WHERE id = ?`).run(ids.ejercicio)).toThrow(/INT-09/);
    expect(() => actualizarEstado(sqlite, 'ejercicio', 'estado', ids.ejercicio, 'ABIERTO')).toThrow(/INT-09/);
    expect(() => sqlite.prepare('DELETE FROM ejercicio WHERE id = ?').run(ids.ejercicio)).toThrow(/INT-09/);
  });

  it('la bitácora de un ejercicio cerrado solo admite EXPORTAR', async () => {
    const { sqlite, ids } = await base();
    cerrarEjercicio(sqlite, ids.ejercicio);
    const insertar = (accion: string) =>
      sqlite
        .prepare(
          `INSERT INTO bitacora (id, ejercicio_id, entidad_afectada, registro_id, accion, fecha, origen)
           VALUES (?, ?, 'ejercicio', ?, ?, 'f', 'equipo/usuario')`,
        )
        .run(nuevoId(), ids.ejercicio, ids.ejercicio, accion);
    expect(() => insertar('EXPORTAR')).not.toThrow();
    expect(() => insertar('ACTUALIZAR')).toThrow(/INT-09/);
  });

  it('las tablas de configuración siguen editables tras el cierre', async () => {
    const { sqlite, ids } = await base();
    cerrarEjercicio(sqlite, ids.ejercicio);
    expect(() => sqlite.prepare(`UPDATE entidad SET telefono = '1' WHERE id = ?`).run(ids.entidad)).not.toThrow();
  });
});

describe('INT-10 · clase no depreciable sin cálculo de depreciación', () => {
  it('rechaza el cálculo para un terreno', async () => {
    const { sqlite, db, ids } = await base();
    const terreno = crearBien(db, ids, { claseActivoId: ids.claseNoDepreciable });
    expect(() => insertarCalculoDepreciacion(sqlite, ids, terreno, 0)).toThrow(/INT-10/);
  });
});

describe('máquinas de estado en la base (T-B-05)', () => {
  it('todo bien nace en BORRADOR y solo transita por las rutas declaradas', async () => {
    const { sqlite, db, ids } = await base();
    expect(() => crearBien(db, ids, { estadoRegistro: 'ACTIVO' })).toThrow(/nace en BORRADOR/);
    const bienId = crearBien(db, ids);
    expect(() => actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'ACTIVO')).toThrow(/transici/);
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'VALIDADO');
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'ACTIVO');
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'PROPUESTO_BAJA');
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'ACTIVO'); // RN-09-04
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'PROPUESTO_BAJA');
    actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'DADO_DE_BAJA');
    expect(() => actualizarEstado(sqlite, 'bien', 'estado_registro', bienId, 'ACTIVO')).toThrow(/transici/);
  });

  it('el ejercicio no salta pasos', async () => {
    const { sqlite, ids } = await base();
    expect(() => actualizarEstado(sqlite, 'ejercicio', 'estado', ids.ejercicio, 'EN_CALCULO')).toThrow(/transici/);
  });
});

describe('RNF-07 · campos sensibles con justificación, también por SQL directo', () => {
  it('rechaza una fila de bitácora que cambia costo_adquisicion sin justificación', async () => {
    const { sqlite } = await base();
    const insertar = (campo: string, justificacion: string | null) =>
      sqlite
        .prepare(
          `INSERT INTO bitacora (id, entidad_afectada, registro_id, accion, campo, valor_anterior, valor_nuevo, fecha, origen, justificacion)
           VALUES (?, 'hoja_vida', 'h', 'ACTUALIZAR', ?, '1', '2', 'f', 'pc/u', ?)`,
        )
        .run(nuevoId(), campo, justificacion);
    expect(() => insertar('costo_adquisicion', null)).toThrow(/RNF-07/);
    expect(() => insertar('costo_adquisicion', '   ')).toThrow(/RNF-07/);
    expect(() => insertar('costo_adquisicion', 'Factura corregida')).not.toThrow();
    expect(() => insertar('proveedor', null)).not.toThrow();
  });
});

describe('la migración de triggers está sincronizada con el generador', () => {
  it('0002_triggers_integridad.sql es exactamente lo que produce scripts/generar-triggers.ts', () => {
    const enDisco = readFileSync(join(raiz, RUTA_MIGRACION), 'utf8');
    expect(enDisco).toBe(generarSql());
  });
});
