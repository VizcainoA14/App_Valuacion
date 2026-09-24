/** T-B-10 — el proceso (ADR-029) y su configuración: parametrización y su revisión (RF-01-01…08, VAL-01-01…10). */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, PROCESO_PRUEBA, valor } from './pruebas';

async function procesoNuevo(precargar = true) {
  const arnes = await arnesPaso01();
  const entidad = valor(await arnes.registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, precargarSemillas: precargar }));
  return { ...arnes, entidad };
}

async function configuracionCompleta() {
  const a = await procesoNuevo();
  const sede = valor(await a.registro.invocar('sede:crear', { procesoId: a.entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán' }));
  valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'URG', nombre: 'Urgencias', tipo: 'asistencial' }));
  return { ...a, sede };
}

/** Un bien sembrado por SQL: el camino de importación tiene sus propias pruebas. */
async function conUnBien(a: Awaited<ReturnType<typeof configuracionCompleta>>): Promise<void> {
  const servicio = valor(await a.registro.invocar('servicio:listar', { procesoId: a.entidad.id }))[0];
  const clase = valor(await a.registro.invocar('clase:listar', { procesoId: a.entidad.id }))[0];
  a.sqlite
    .prepare(
      `INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id, sede_id, servicio_id, estado_actual, condicion_tenencia, fecha_toma, funcionario_conteo)
       VALUES ('b1', ?, 'C-1', 'P-1', 'Monitor', ?, ?, ?, 'BUENO', 'PROPIO', '2025-05-01', 'F')`,
    )
    .run(a.entidad.id, clase?.id, a.sede.id, servicio?.id);
}

describe('proceso y semillas (RF-01-01, RF-01-03)', () => {
  it('crear con semillas precarga 8 clases, 20 abreviaturas y los parámetros por defecto', async () => {
    const { registro, entidad, sqlite } = await procesoNuevo();
    expect(entidad).toMatchObject({ nit: '890000000-1', nombre: 'Valuación de prueba', fechaCorte: '2025-06-30', estado: 'EN_CURSO', finalizadoEn: null });
    expect(valor(await registro.invocar('clase:listar', { procesoId: entidad.id }))).toHaveLength(8);
    expect(valor(await registro.invocar('abreviatura:listar', { procesoId: entidad.id }))).toHaveLength(20);
    const p = valor(await registro.invocar('parametros:obtener', { procesoId: entidad.id }));
    expect(p.metodo_conteo_meses).toBe('dias_exactos');
    const filas = sqlite.prepare(`SELECT COUNT(*) AS n FROM bitacora WHERE registro_id = ? AND accion = 'CREAR'`).get(entidad.id) as { n: number };
    expect(filas.n).toBe(1);
  });

  it('dos procesos del mismo hospital son independientes: cada uno con su catálogo (ADR-029)', async () => {
    const { registro, entidad } = await procesoNuevo();
    const otro = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, nombre: 'Valuación 2026', fechaCorte: '2026-06-30' }));
    expect(otro.nit).toBe(entidad.nit);
    valor(await registro.invocar('clase:actualizar', { id: valor(await registro.invocar('clase:listar', { procesoId: entidad.id }))[0]?.id ?? '', cambios: { vidaUtilContableMeses: 99 } }));
    const delOtro = valor(await registro.invocar('clase:listar', { procesoId: otro.id }));
    expect(delOtro).toHaveLength(8);
    expect(delOtro.some((c) => c.vidaUtilContableMeses === 99)).toBe(false);
    // Y dentro de un proceso las sugeridas no se duplican al precargar dos veces.
    expect(valor(await registro.invocar('clase:precargarSugeridas', { procesoId: entidad.id }))).toEqual({ creadas: 0, omitidas: 8 });
  });

  it('la fecha de corte no puede ser futura', async () => {
    const { registro } = await arnesPaso01({ hoy: '2026-09-02' });
    expect(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, fechaCorte: '2026-09-03' })).toMatchObject({ ok: false, error: { codigo: 'FECHA_CORTE_FUTURA' } });
  });

  it('las clases sugeridas conservan la vida útil técnica con decimales (x10k)', async () => {
    const { registro, entidad } = await procesoNuevo();
    const emc = valor(await registro.invocar('clase:listar', { procesoId: entidad.id })).find((c) => c.codigo === 'EMC');
    expect(emc).toMatchObject({ vidaUtilContableMeses: 180, vidaUtilTecnicaAnios: 15, esDepreciable: true, requiereInvima: true });
    const terreno = valor(await registro.invocar('clase:listar', { procesoId: entidad.id })).find((c) => c.codigo === 'TER');
    expect(terreno).toMatchObject({ esDepreciable: false, vidaUtilContableMeses: null });
  });
});

describe('sedes, servicios y clases', () => {
  it('códigos únicos por proceso / por sede', async () => {
    const { registro, sede, entidad } = await configuracionCompleta();
    expect(await registro.invocar('sede:crear', { procesoId: entidad.id, codigo: '01', nombre: 'Dup', direccion: 'x', municipio: 'y' })).toMatchObject({ ok: false, error: { codigo: 'SEDE_DUPLICADA' } });
    expect(await registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'URG', nombre: 'Dup', tipo: 'apoyo' })).toMatchObject({ ok: false, error: { codigo: 'SERVICIO_DUPLICADO' } });
  });

  it('actualizar una clase deja una fila de bitácora por campo', async () => {
    const { registro, entidad, sqlite } = await procesoNuevo();
    const emc = valor(await registro.invocar('clase:listar', { procesoId: entidad.id })).find((c) => c.codigo === 'EMC');
    if (emc === undefined) throw new Error('sin EMC');
    const r = valor(await registro.invocar('clase:actualizar', { id: emc.id, cambios: { vidaUtilContableMeses: 120, vidaUtilTecnicaAnios: 12.5 } }));
    expect(r.vidaUtilContableMeses).toBe(120);
    expect(r.vidaUtilTecnicaAnios).toBe(12.5);
    const filas = sqlite.prepare(`SELECT campo, valor_anterior, valor_nuevo FROM bitacora WHERE registro_id = ? AND accion = 'ACTUALIZAR' ORDER BY rowid`).all(emc.id);
    expect(filas).toEqual([
      { campo: 'vidaUtilContableMeses', valor_anterior: '180', valor_nuevo: '120' },
      { campo: 'vidaUtilTecnicaAnios', valor_anterior: '15', valor_nuevo: '12.5' },
    ]);
  });
});

describe('parámetros de cálculo (RN-01-04, RN-01-05, RF-01-08)', () => {
  it('umbrales incoherentes se rechazan', async () => {
    const { registro, entidad } = await procesoNuevo();
    expect(await registro.invocar('parametros:actualizar', { procesoId: entidad.id, cambios: { umbral_semaforo_verde: 0.95 } })).toMatchObject({ ok: false, error: { codigo: 'UMBRALES_INCOHERENTES' } });
  });

  it('cambiar el método de conteo queda en bitácora y vale desde el próximo cálculo', async () => {
    const { registro, entidad, sqlite } = await procesoNuevo();
    const p = valor(await registro.invocar('parametros:actualizar', { procesoId: entidad.id, cambios: { metodo_conteo_meses: 'mes_completo' } }));
    expect(p.metodo_conteo_meses).toBe('mes_completo');
    const campos = (sqlite.prepare(`SELECT campo FROM bitacora WHERE entidad_afectada = 'parametro_calculo' ORDER BY rowid`).all() as { campo: string }[]).map((f) => f.campo);
    expect(campos).toEqual(['metodo_conteo_meses']);
  });
});

describe('convención de codificación (RN-01-02, RF-01-04)', () => {
  it('sin definir devuelve la genérica; previsualiza; guarda con bitácora', async () => {
    const { registro, entidad } = await procesoNuevo();
    expect(valor(await registro.invocar('convencion:obtener', { procesoId: entidad.id })).definida).toBe(false);
    const segmentos = [{ tipo: 'PREFIJO_ENTIDAD' as const, valor: 'HSV' }, { tipo: 'CODIGO_SEDE' as const }, { tipo: 'ABREVIATURA_TIPO' as const }, { tipo: 'CONSECUTIVO' as const }];
    expect(valor(await registro.invocar('convencion:previsualizar', { segmentos, longitudConsecutivo: 2, ejemplo: { codigoSede: '01', abreviatura: 'AGM', consecutivo: 1 } }))).toEqual({ codigo: 'HSV01AGM01' });
    const guardada = valor(await registro.invocar('convencion:guardar', { procesoId: entidad.id, segmentos, longitudConsecutivo: 2 }));
    expect(guardada.definida).toBe(true);
    expect(await registro.invocar('convencion:guardar', { procesoId: entidad.id, segmentos: [{ tipo: 'CODIGO_SEDE' }], longitudConsecutivo: 2 })).toMatchObject({ ok: false, error: { codigo: 'CONVENCION_INVALIDA' } });
  });
});

describe('eliminar un proceso', () => {
  it('borra un proceso en curso con todo su catálogo mientras no tenga inventario; la bitácora se queda', async () => {
    const { registro, entidad, sqlite } = await configuracionCompleta();

    const r = valor(await registro.invocar('proceso:eliminar', { id: entidad.id, justificacion: 'Iniciado con la fecha equivocada' }));
    expect(r.nombre).toBe(entidad.nombre);
    expect(valor(await registro.invocar('proceso:listar', undefined))).toHaveLength(0);
    for (const tabla of ['sede', 'servicio', 'clase_activo', 'parametro_calculo', 'abreviatura_tipo'] as const) {
      expect((sqlite.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n, tabla).toBe(0);
    }

    // La bitácora NO: que se eliminó también es historia, con su motivo.
    const fila = sqlite.prepare(`SELECT valor_anterior, justificacion FROM bitacora WHERE accion = 'ELIMINAR'`).get() as { valor_anterior: string | null; justificacion: string | null };
    expect(fila.valor_anterior).toContain(entidad.nit);
    expect(fila.justificacion).toBe('Iniciado con la fecha equivocada');
  });

  it('se niega en cuanto el proceso tiene inventario, y dice por qué (RN-09-09)', async () => {
    const a = await configuracionCompleta();
    await conUnBien(a);
    const r = await a.registro.invocar('proceso:eliminar', { id: a.entidad.id, justificacion: 'Ya no lo quiero' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.codigo).toBe('PROCESO_CON_INVENTARIO');
      expect(r.error.mensaje).toContain('1 bienes');
    }
    expect(valor(await a.registro.invocar('proceso:listar', undefined))).toHaveLength(1);
    // Y la base lo sostiene aunque se le escriba directo (INT-03).
    expect(() => a.sqlite.prepare(`DELETE FROM bien WHERE id = 'b1'`).run()).toThrow(/INT-03/);
  });

  it('eliminar uno no toca los demás', async () => {
    const { registro, entidad } = await procesoNuevo();
    const otro = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, nombre: 'Otro' }));
    valor(await registro.invocar('proceso:eliminar', { id: entidad.id, justificacion: 'Duplicado por error' }));
    expect(valor(await registro.invocar('proceso:listar', undefined)).map((p) => p.id)).toEqual([otro.id]);
    expect(valor(await registro.invocar('clase:listar', { procesoId: otro.id }))).toHaveLength(8);
  });

  it('el proceso de demostración tiene su propio botón; este canal no lo borra', async () => {
    const { registro } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const r = await registro.invocar('proceso:eliminar', { id: demo.id, justificacion: 'Limpiando pruebas' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('ES_DEMOSTRACION');
  });
});

describe('finalizar un proceso (ADR-029)', () => {
  async function finalizado() {
    const a = await configuracionCompleta();
    await conUnBien(a);
    valor(await a.registro.invocar('calculo:ejecutar', { procesoId: a.entidad.id }));
    const p = valor(await a.registro.invocar('proceso:finalizar', { id: a.entidad.id }));
    return { ...a, p };
  }

  it('sin calcular no se finaliza: no dejaría nada que consultar', async () => {
    const { registro, entidad } = await configuracionCompleta();
    expect(await registro.invocar('proceso:finalizar', { id: entidad.id })).toMatchObject({ ok: false, error: { codigo: 'PROCESO_SIN_CALCULO' } });
  });

  it('queda FINALIZADO, con su fecha, y en la bitácora', async () => {
    const { p, sqlite } = await finalizado();
    expect(p).toMatchObject({ estado: 'FINALIZADO', finalizadoEn: '2026-09-02T10:00:00.000Z' });
    const fila = sqlite.prepare(`SELECT valor_anterior, valor_nuevo FROM bitacora WHERE registro_id = ? AND accion = 'CERRAR'`).get(p.id);
    expect(fila).toEqual({ valor_anterior: 'EN_CURSO', valor_nuevo: 'FINALIZADO' });
  });

  it('finalizado es de solo lectura: ni la aplicación ni el SQL directo lo cambian', async () => {
    const { registro, sqlite, p, sede } = await finalizado();
    expect(await registro.invocar('proceso:actualizar', { id: p.id, cambios: { nombre: 'Otro nombre' }, justificacion: null })).toMatchObject({ ok: false, error: { codigo: 'PROCESO_FINALIZADO' } });
    expect(await registro.invocar('proceso:finalizar', { id: p.id })).toMatchObject({ ok: false, error: { codigo: 'PROCESO_FINALIZADO' } });
    expect(await registro.invocar('proceso:eliminar', { id: p.id, justificacion: 'Ya no lo quiero' })).toMatchObject({ ok: false, error: { codigo: 'PROCESO_FINALIZADO' } });
    // El caso de uso no lo comprueba: lo detiene la base, y el error llega traducido.
    expect(await registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'NEW', nombre: 'Nuevo', tipo: 'apoyo' })).toMatchObject({ ok: false, error: { codigo: 'PROCESO_FINALIZADO' } });

    expect(() => sqlite.prepare(`UPDATE proceso SET estado = 'EN_CURSO' WHERE id = ?`).run(p.id)).toThrow(/FINALIZADO/);
    expect(() => sqlite.prepare(`DELETE FROM proceso WHERE id = ?`).run(p.id)).toThrow(/FINALIZADO/);
    expect(() => sqlite.prepare(`UPDATE bien SET descripcion_funcional = 'x' WHERE proceso_id = ?`).run(p.id)).toThrow(/FINALIZADO/);
    expect(() => sqlite.prepare(`UPDATE clase_activo SET nombre = 'x' WHERE proceso_id = ?`).run(p.id)).toThrow(/FINALIZADO/);
    expect(() => sqlite.prepare(`DELETE FROM servicio WHERE sede_id = ?`).run(sede.id)).toThrow(/FINALIZADO/);
  });

  it('finalizar uno no congela los demás', async () => {
    const { registro } = await finalizado();
    const otro = valor(await registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, nombre: 'Siguiente valuación' }));
    expect(valor(await registro.invocar('proceso:actualizar', { id: otro.id, cambios: { nombre: 'Valuación 2026' }, justificacion: null })).nombre).toBe('Valuación 2026');
  });
});

describe('revisión de la configuración (TR-01)', () => {
  it('un proceso recién creado no está listo: le faltan sedes y servicios', async () => {
    const { registro, entidad } = await procesoNuevo();
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: entidad.id }));
    expect(v.lista).toBe(false);
    const fallan = v.resultados.filter((r) => !r.cumple).map((r) => r.codigo);
    expect(fallan).toEqual(['VAL-01-02', 'VAL-01-03', 'VAL-01-10']);
  });

  it('con sedes y servicios está lista; no exige ejercicio, acta ni manual (ADR-028)', async () => {
    const { registro, entidad } = await configuracionCompleta();
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: entidad.id }));
    expect(v.lista).toBe(true);
    expect(v.bloqueantesPendientes).toBe(0);
    expect(v.resultados.filter((r) => !r.cumple).map((r) => r.codigo)).toEqual(['VAL-01-10']);
  });

  it('VAL-01-04/05/09 señalan la clase concreta', async () => {
    const { registro, entidad, sqlite } = await procesoNuevo();
    valor(await registro.invocar('clase:crear', { procesoId: entidad.id, codigo: 'RAR', nombre: 'Rara', subcuentaContable: '1699', vidaUtilContableMeses: null, vidaUtilTecnicaAnios: 3, esDepreciable: true, requiereHojaVida: false, requiereInvima: false, responsableTecnico: 'x' }));
    // El contrato impide crear sin subcuenta; el dato legado o importado sí puede llegar vacío.
    sqlite.prepare(`UPDATE clase_activo SET subcuenta_contable = '' WHERE codigo = 'RAR'`).run();
    const v = valor(await registro.invocar('validaciones:evaluar', { procesoId: entidad.id }));
    expect(v.resultados.find((r) => r.codigo === 'VAL-01-04')?.detalle).toContain('RAR');
    expect(v.resultados.find((r) => r.codigo === 'VAL-01-05')?.detalle).toContain('RAR');
    const emc = valor(await registro.invocar('clase:listar', { procesoId: entidad.id })).find((c) => c.codigo === 'EMC');
    valor(await registro.invocar('clase:actualizar', { id: emc?.id ?? '', cambios: { vidaUtilTecnicaAnios: 12 } }));
    const v2 = valor(await registro.invocar('validaciones:evaluar', { procesoId: entidad.id }));
    expect(v2.resultados.find((r) => r.codigo === 'VAL-01-09')).toMatchObject({ cumple: false, severidad: 'ADVERTENCIA', detalle: expect.stringContaining('EMC') });
  });
});
