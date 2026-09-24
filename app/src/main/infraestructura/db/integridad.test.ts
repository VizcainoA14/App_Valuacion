/**
 * Reglas de integridad, máquina de estados e inmutabilidad, violadas POR SQL
 * DIRECTO. No se pasa por ningún caso de uso: la prueba es que ni un script, ni
 * una migración, ni una herramienta externa pueden saltarse las reglas.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBaseDePrueba, sembrarMinimo, crearBien, type IdsSemilla } from './pruebas/semilla';
import { nuevoId } from './identificadores';
import type { ConexionSqlite } from './conexion';
import { generarSql, RUTA_MIGRACION, TABLAS_INMUTABLES } from '../../../../scripts/generar-triggers';
import { comoCentavos } from '../../../compartido/tipos/basicos';
import { restarCentavos } from '../../../compartido/motor/dinero';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

async function base() {
  const { sqlite, db } = await abrirBaseDePrueba();
  const ids = sembrarMinimo(db);
  return { sqlite, db, ids };
}

function crearCorte(sqlite: ConexionSqlite, ids: IdsSemilla, fechaCorte = '2025-06-30'): string {
  const id = nuevoId();
  sqlite.prepare(`INSERT INTO corte (id, proceso_id, fecha_corte, parametros_json) VALUES (?, ?, ?, '{}')`).run(id, ids.proceso, fechaCorte);
  return id;
}

function insertarCalculoDepreciacion(sqlite: ConexionSqlite, corteId: string, bienId: string, acumuladaCent: number, baseCent = 2373928000) {
  const saldo = restarCentavos(comoCentavos(baseCent), comoCentavos(acumuladaCent));
  return sqlite
    .prepare(
      `INSERT INTO calculo_depreciacion (id, corte_id, bien_id, valor_adquisicion_cent,
         saldo_final_ajustado_cent, base_depreciable_cent, fecha_inicio_depreciacion, vida_util_meses,
         depreciacion_mensual_x10k, meses_transcurridos_x10k, metodo_conteo_aplicado,
         depreciacion_acumulada_cent, saldo_por_depreciar_cent, valor_neto_libros_cent)
       VALUES (?, ?, ?, ?, ?, ?, '2018-04-27', 180, 1318848889, 861109, 'dias_exactos', ?, ?, ?)`,
    )
    .run(nuevoId(), corteId, bienId, baseCent, baseCent, baseCent, acumuladaCent, saldo, saldo);
}

function actualizarEstado(sqlite: ConexionSqlite, bienId: string, estado: string) {
  sqlite.prepare('UPDATE bien SET estado_registro = ? WHERE id = ?').run(estado, bienId);
}

describe('INT-01 · código institucional y placa únicos por entidad', () => {
  it('rechaza una placa repetida y un código repetido', async () => {
    const { db, ids } = await base();
    crearBien(db, ids, { placa: 'PL-1', codigoInstitucional: 'C-1' });
    expect(() => crearBien(db, ids, { placa: 'PL-1', codigoInstitucional: 'C-2' })).toThrow(/UNIQUE/);
    expect(() => crearBien(db, ids, { placa: 'PL-2', codigoInstitucional: 'C-1' })).toThrow(/UNIQUE/);
  });
});

describe('INT-02 · un bien no cambia de entidad', () => {
  it('rechaza el UPDATE de proceso_id', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const otra = nuevoId();
    sqlite
      .prepare(
        `INSERT INTO proceso (id, nombre, fecha_corte, razon_social, nit, municipio, departamento, nivel_complejidad, nombre_gerente, direccion)
         VALUES (?, 'Otro', '2025-06-30', 'Otra', '1-1', 'M', 'D', 'I', 'G', 'Dir')`,
      )
      .run(otra);
    expect(() => sqlite.prepare('UPDATE bien SET proceso_id = ? WHERE id = ?').run(otra, bienId)).toThrow(/INT-02/);
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
    sqlite.prepare('UPDATE proceso SET es_demostracion = 1 WHERE id = ?').run(ids.proceso);
    expect(sqlite.prepare('DELETE FROM bien WHERE id = ?').run(bienId).changes).toBe(1);
  });
});

describe('INT-05 · depreciación acumulada ≤ base depreciable', () => {
  it('rechaza superar la base', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const corte = crearCorte(sqlite, ids);
    expect(() => insertarCalculoDepreciacion(sqlite, corte, bienId, 2373928001)).toThrow(/CHECK/);
    expect(() => insertarCalculoDepreciacion(sqlite, corte, bienId, 2373928000)).not.toThrow();
  });
});

describe('INT-10 · clase no depreciable sin cálculo de depreciación', () => {
  it('rechaza el cálculo para un terreno', async () => {
    const { sqlite, db, ids } = await base();
    const terreno = crearBien(db, ids, { claseActivoId: ids.claseNoDepreciable });
    expect(() => insertarCalculoDepreciacion(sqlite, crearCorte(sqlite, ids), terreno, 0)).toThrow(/INT-10/);
  });
});

describe('máquina de estados del bien en la base (ADR-028)', () => {
  it('todo bien nace ACTIVO y solo transita por las rutas declaradas', async () => {
    const { sqlite, db, ids } = await base();
    expect(() => crearBien(db, ids, { estadoRegistro: 'NO_ENCONTRADO' })).toThrow(/nace en ACTIVO/);
    const bienId = crearBien(db, ids);
    actualizarEstado(sqlite, bienId, 'NO_ENCONTRADO');
    actualizarEstado(sqlite, bienId, 'ACTIVO');
    actualizarEstado(sqlite, bienId, 'DADO_DE_BAJA');
    expect(() => actualizarEstado(sqlite, bienId, 'NO_ENCONTRADO')).toThrow(/transici/);
    actualizarEstado(sqlite, bienId, 'ACTIVO'); // anulación de la baja
    expect(() => actualizarEstado(sqlite, bienId, 'BORRADOR')).toThrow(/transici|CHECK/);
  });
});

describe('inmutabilidad: lo calculado, lo importado y lo auditado no se reescribe', () => {
  it('declara las seis tablas y cada una rechaza el UPDATE', async () => {
    expect([...TABLAS_INMUTABLES].sort()).toEqual(['barrido', 'bitacora', 'calculo_depreciacion', 'calculo_exclusion', 'calculo_obsolescencia', 'corte']);
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const corte = crearCorte(sqlite, ids);
    insertarCalculoDepreciacion(sqlite, corte, bienId, 0);
    sqlite.prepare(`INSERT INTO calculo_exclusion (id, corte_id, bien_id, ambito, estado, motivo) VALUES (?, ?, ?, 'OBSOLESCENCIA', 'NO_CALCULABLE', 'x')`).run(nuevoId(), corte, bienId);
    sqlite
      .prepare(
        `INSERT INTO barrido (id, proceso_id, fecha, archivo, archivo_conservado, hash_sha256, bienes_nuevos, bienes_actualizados, bienes_no_encontrados, servicios_recorridos)
         VALUES (?, ?, '2025-05-15', 'a.xlsx', 'a.xlsx', 'h', 1, 0, 0, 1)`,
      )
      .run(nuevoId(), ids.proceso);
    sqlite.prepare(`INSERT INTO bitacora (id, entidad_afectada, registro_id, accion, fecha, origen) VALUES (?, 'bien', ?, 'CREAR', 'f', 'pc/u')`).run(nuevoId(), bienId);

    expect(() => sqlite.prepare(`UPDATE corte SET fecha_corte = '2024-12-31' WHERE id = ?`).run(corte)).toThrow(/no se modifica/);
    expect(() => sqlite.prepare('UPDATE calculo_depreciacion SET depreciacion_acumulada_cent = 1 WHERE corte_id = ?').run(corte)).toThrow(/no se modifica/);
    expect(() => sqlite.prepare(`UPDATE calculo_exclusion SET motivo = 'otro' WHERE corte_id = ?`).run(corte)).toThrow(/no se modifica/);
    expect(() => sqlite.prepare('UPDATE barrido SET bienes_nuevos = 9').run()).toThrow(/no se modifica/);
    expect(() => sqlite.prepare(`UPDATE bitacora SET accion = 'ELIMINAR'`).run()).toThrow(/no se modifica/);
  });

  it('un corte que sobra se elimina entero, con sus resultados', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const corte = crearCorte(sqlite, ids);
    insertarCalculoDepreciacion(sqlite, corte, bienId, 0);
    expect(sqlite.prepare('DELETE FROM corte WHERE id = ?').run(corte).changes).toBe(1);
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM calculo_depreciacion').get() as { n: number }).n).toBe(0);
  });
});

describe('baja · se registra y, si fue un error, se anula; nada más', () => {
  function registrar(sqlite: ConexionSqlite, bienId: string): string {
    const id = nuevoId();
    sqlite.prepare(`INSERT INTO baja (id, bien_id, fecha, causal, justificacion) VALUES (?, ?, '2025-07-01', 'OBSOLESCENCIA', 'Sin repuestos del fabricante')`).run(id, bienId);
    return id;
  }

  it('no se reescribe la causal ni se anula sin motivo', async () => {
    const { sqlite, db, ids } = await base();
    const baja = registrar(sqlite, crearBien(db, ids));
    expect(() => sqlite.prepare(`UPDATE baja SET causal = 'DESUSO' WHERE id = ?`).run(baja)).toThrow(/solo se anula/);
    expect(() => sqlite.prepare(`UPDATE baja SET anulada_en = 'f' WHERE id = ?`).run(baja)).toThrow(/solo se anula/);
    expect(() => sqlite.prepare(`UPDATE baja SET anulada_en = 'f', motivo_anulacion = 'Se registró sobre el bien equivocado' WHERE id = ?`).run(baja)).not.toThrow();
    expect(() => sqlite.prepare(`UPDATE baja SET motivo_anulacion = 'otro' WHERE id = ?`).run(baja)).toThrow(/solo se anula/);
  });

  it('un bien tiene a lo sumo una baja vigente', async () => {
    const { sqlite, db, ids } = await base();
    const bienId = crearBien(db, ids);
    const primera = registrar(sqlite, bienId);
    expect(() => registrar(sqlite, bienId)).toThrow(/UNIQUE/);
    sqlite.prepare(`UPDATE baja SET anulada_en = 'f', motivo_anulacion = 'Error de digitación' WHERE id = ?`).run(primera);
    expect(() => registrar(sqlite, bienId)).not.toThrow();
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
  /**
   * Los finales de línea son cosa del `git checkout`, no del generador: en Windows
   * con `core.autocrlf=true` el archivo llega con CRLF y el generador produce LF.
   * `.gitattributes` fija LF en todo el repositorio, y aquí se normaliza además
   * para que la prueba mida lo que dice medir —que nadie editó los triggers a
   * mano— y no la configuración de git de quien la ejecuta.
   */
  const sinCr = (s: string): string => s.replace(/\r\n/g, '\n');

  it('0002_triggers_integridad.sql es exactamente lo que produce scripts/generar-triggers.ts', () => {
    const enDisco = readFileSync(join(raiz, RUTA_MIGRACION), 'utf8');
    expect(sinCr(enDisco)).toBe(sinCr(generarSql()));
  });
});
