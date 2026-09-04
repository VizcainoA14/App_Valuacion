/** T-B-10 — paso 01: parametrización, congelado y validaciones (RF-01-01…09, VAL-01-01…10). */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from './pruebas';

async function entidadNueva(precargar = true) {
  const arnes = await arnesPaso01();
  const entidad = valor(await arnes.registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, precargarSemillas: precargar }));
  return { ...arnes, entidad };
}

async function configuracionCompleta() {
  const a = await entidadNueva();
  const sede = valor(await a.registro.invocar('sede:crear', { entidadId: a.entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán' }));
  valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'URG', nombre: 'Urgencias', tipo: 'asistencial' }));
  const coordinadora = valor(
    await a.registro.invocar('responsable:crear', { entidadId: a.entidad.id, nombreCompleto: 'Ana Coordinadora', documentoIdentidad: '1', perfil: 'COORDINADOR', cargo: 'Líder' }),
  );
  return { ...a, sede, coordinadora };
}

describe('entidad y semillas (RF-01-01, RF-01-03)', () => {
  it('crear con semillas precarga 8 clases, 20 abreviaturas y los parámetros por defecto', async () => {
    const { registro, entidad, sqlite } = await entidadNueva();
    expect(entidad.nit).toBe('890000000-1');
    expect(valor(await registro.invocar('clase:listar', { entidadId: entidad.id }))).toHaveLength(8);
    expect(valor(await registro.invocar('abreviatura:listar', { entidadId: entidad.id }))).toHaveLength(20);
    const p = valor(await registro.invocar('parametros:obtener', { entidadId: entidad.id }));
    expect(p.metodo_conteo_meses).toBe('dias_exactos');
    expect(p.metodo_conteo_meses_confirmado).toBe(false);
    const filas = sqlite.prepare(`SELECT COUNT(*) AS n FROM bitacora WHERE registro_id = ? AND accion = 'CREAR'`).get(entidad.id) as { n: number };
    expect(filas.n).toBe(1);
  });

  it('el NIT es único; las clases sugeridas no se duplican al precargar dos veces', async () => {
    const { registro, entidad } = await entidadNueva();
    expect(await registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, razonSocial: 'Otra' })).toMatchObject({ ok: false, error: { codigo: 'NIT_DUPLICADO' } });
    expect(valor(await registro.invocar('clase:precargarSugeridas', { entidadId: entidad.id }))).toEqual({ creadas: 0, omitidas: 8 });
  });

  it('las clases sugeridas conservan la vida útil técnica con decimales (x10k)', async () => {
    const { registro, entidad } = await entidadNueva();
    const emc = valor(await registro.invocar('clase:listar', { entidadId: entidad.id })).find((c) => c.codigo === 'EMC');
    expect(emc).toMatchObject({ vidaUtilContableMeses: 180, vidaUtilTecnicaAnios: 15, esDepreciable: true, requiereInvima: true });
    const terreno = valor(await registro.invocar('clase:listar', { entidadId: entidad.id })).find((c) => c.codigo === 'TER');
    expect(terreno).toMatchObject({ esDepreciable: false, vidaUtilContableMeses: null });
  });
});

describe('sedes, servicios y clases', () => {
  it('códigos únicos por entidad / por sede', async () => {
    const { registro, sede, entidad } = await configuracionCompleta();
    expect(await registro.invocar('sede:crear', { entidadId: entidad.id, codigo: '01', nombre: 'Dup', direccion: 'x', municipio: 'y' })).toMatchObject({ ok: false, error: { codigo: 'SEDE_DUPLICADA' } });
    expect(await registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'URG', nombre: 'Dup', tipo: 'apoyo' })).toMatchObject({ ok: false, error: { codigo: 'SERVICIO_DUPLICADO' } });
  });

  it('actualizar una clase deja una fila de bitácora por campo', async () => {
    const { registro, entidad, sqlite } = await entidadNueva();
    const emc = valor(await registro.invocar('clase:listar', { entidadId: entidad.id })).find((c) => c.codigo === 'EMC');
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
    const { registro, entidad } = await entidadNueva();
    expect(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { umbral_semaforo_verde: 0.95 } })).toMatchObject({ ok: false, error: { codigo: 'UMBRALES_INCOHERENTES' } });
  });

  it('cambiar el método de conteo invalida la confirmación por acta (CT-02) y queda en bitácora', async () => {
    const { registro, entidad, sqlite } = await entidadNueva();
    valor(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { metodo_conteo_meses_confirmado: true }, justificacion: 'Acta 001 del contador' }));
    const p = valor(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { metodo_conteo_meses: 'mes_completo' } }));
    expect(p.metodo_conteo_meses).toBe('mes_completo');
    expect(p.metodo_conteo_meses_confirmado).toBe(false);
    const campos = (sqlite.prepare(`SELECT campo FROM bitacora WHERE entidad_afectada = 'parametro_calculo' ORDER BY rowid`).all() as { campo: string }[]).map((f) => f.campo);
    expect(campos).toEqual(['metodo_conteo_meses_confirmado', 'metodo_conteo_meses', 'metodo_conteo_meses_confirmado']);
  });

  it('un ejercicio ABIERTO recibe los parámetros ajustados; RN-01-01 se aplica al avanzar', async () => {
    const { registro, entidad, coordinadora } = await configuracionCompleta();
    const ej = valor(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte 2025', fechaCorte: '2025-06-30', responsableId: coordinadora.id }));
    expect(ej.parametrosCongelados.metodo_conteo_meses_confirmado).toBe(false);
    valor(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { metodo_conteo_meses_confirmado: true }, justificacion: 'Acta' }));
    const refrescado = valor(await registro.invocar('ejercicio:porId', { id: ej.id }));
    expect(refrescado?.parametrosCongelados.metodo_conteo_meses_confirmado).toBe(true);
  });
});

describe('convención de codificación (RN-01-02, RF-01-04)', () => {
  it('sin definir devuelve la genérica; previsualiza; guarda con bitácora', async () => {
    const { registro, entidad } = await entidadNueva();
    expect(valor(await registro.invocar('convencion:obtener', { entidadId: entidad.id })).definida).toBe(false);
    const segmentos = [{ tipo: 'PREFIJO_ENTIDAD' as const, valor: 'HSV' }, { tipo: 'CODIGO_SEDE' as const }, { tipo: 'ABREVIATURA_TIPO' as const }, { tipo: 'CONSECUTIVO' as const }];
    expect(valor(await registro.invocar('convencion:previsualizar', { segmentos, longitudConsecutivo: 2, ejemplo: { codigoSede: '01', abreviatura: 'AGM', consecutivo: 1 } }))).toEqual({ codigo: 'HSV01AGM01' });
    const guardada = valor(await registro.invocar('convencion:guardar', { entidadId: entidad.id, segmentos, longitudConsecutivo: 2 }));
    expect(guardada.definida).toBe(true);
    expect(await registro.invocar('convencion:guardar', { entidadId: entidad.id, segmentos: [{ tipo: 'CODIGO_SEDE' }], longitudConsecutivo: 2 })).toMatchObject({ ok: false, error: { codigo: 'CONVENCION_INVALIDA' } });
  });
});

describe('eliminar entidad', () => {
  it('borra la entidad y todo su catálogo mientras la valuación no haya empezado', async () => {
    const { registro, entidad, sqlite } = await configuracionCompleta();
    expect(valor(await registro.invocar('sede:listar', { entidadId: entidad.id }))).toHaveLength(1);

    const r = valor(await registro.invocar('entidad:eliminar', { id: entidad.id, justificacion: 'Creada con el NIT equivocado' }));
    expect(r.razonSocial).toBe(entidad.razonSocial);
    expect(valor(await registro.invocar('entidad:listar', undefined))).toHaveLength(0);

    // Sedes, servicios, clases, parámetros y responsables se van con ella (cascade).
    for (const tabla of ['sede', 'clase_activo', 'parametro_calculo', 'responsable', 'abreviatura_tipo'] as const) {
      expect((sqlite.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n, tabla).toBe(0);
    }
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM servicio').get() as { n: number }).n).toBe(0);

    // Pero la bitácora NO: que se eliminó también es historia, con su motivo.
    const fila = sqlite.prepare(`SELECT accion, valor_anterior, justificacion FROM bitacora WHERE accion = 'ELIMINAR'`).get() as {
      accion: string;
      valor_anterior: string | null;
      justificacion: string | null;
    };
    expect(fila.valor_anterior).toContain(entidad.nit);
    expect(fila.justificacion).toBe('Creada con el NIT equivocado');
  });

  it('se niega en cuanto existe un ejercicio, y dice por qué', async () => {
    const { registro, entidad, coordinadora } = await configuracionCompleta();
    valor(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte 2025', fechaCorte: '2025-06-30', responsableId: coordinadora.id }));

    const r = await registro.invocar('entidad:eliminar', { id: entidad.id, justificacion: 'Ya no la quiero' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.codigo).toBe('ENTIDAD_CON_EJERCICIOS');
      expect(r.error.mensaje).toContain('Corte 2025');
      expect(r.error.mensaje).toContain('corríjalos');
    }
    // Y sigue ahí.
    expect(valor(await registro.invocar('entidad:listar', undefined))).toHaveLength(1);
  });

  it('el hospital de demostración tiene su propio botón; este canal no lo borra', async () => {
    const { registro } = await arnesPaso01();
    const demo = valor(await registro.invocar('demo:cargar', undefined));
    const r = await registro.invocar('entidad:eliminar', { id: demo.id, justificacion: 'Limpiando pruebas' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('ES_DEMOSTRACION');
  });
});

describe('ejercicio (RF-01-05, RN-01-01, RN-01-06)', () => {
  it('congela los parámetros vigentes y rechaza fechas futuras o responsables ajenos', async () => {
    const { registro, entidad, coordinadora } = await configuracionCompleta();
    expect(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Futuro', fechaCorte: '2027-01-01', responsableId: coordinadora.id })).toMatchObject({ ok: false, error: { codigo: 'VAL-01-06' } });
    const ej = valor(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte junio 2025', fechaCorte: '2025-06-30', contratoNumero: 'C-001', responsableId: coordinadora.id }));
    expect(ej.estado).toBe('ABIERTO');
    expect(ej.parametrosCongelados.base_comparacion_avaluo).toBe('valor_neto_libros');
  });

  it('cambiar la fecha de corte exige justificación y queda como campo sensible en bitácora', async () => {
    const { registro, entidad, coordinadora, sqlite } = await configuracionCompleta();
    const ej = valor(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte', fechaCorte: '2025-06-30', responsableId: coordinadora.id }));
    expect(await registro.invocar('ejercicio:cambiarFechaCorte', { id: ej.id, fechaCorte: '2025-12-31', justificacion: '' })).toMatchObject({ ok: false, error: { tipo: 'VALIDACION' } });
    const r = valor(await registro.invocar('ejercicio:cambiarFechaCorte', { id: ej.id, fechaCorte: '2025-12-31', justificacion: 'Comité acordó nuevo corte' }));
    expect(r.fechaCorte).toBe('2025-12-31');
    const fila = sqlite.prepare(`SELECT campo, valor_anterior, valor_nuevo, justificacion FROM bitacora WHERE registro_id = ? AND campo = 'fecha_corte'`).get(ej.id);
    expect(fila).toEqual({ campo: 'fecha_corte', valor_anterior: '2025-06-30', valor_nuevo: '2025-12-31', justificacion: 'Comité acordó nuevo corte' });
  });
});

describe('validaciones del paso 01 (TR-01, RF-01-06)', () => {
  it('una entidad recién creada tiene 4 bloqueantes pendientes y no puede avanzar', async () => {
    const { registro, entidad } = await entidadNueva();
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 1, entidadId: entidad.id }));
    expect(v.puedeAvanzar).toBe(false);
    const fallan = v.resultados.filter((r) => !r.cumple).map((r) => r.codigo);
    expect(fallan).toEqual(['VAL-01-02', 'VAL-01-03', 'VAL-01-06', 'VAL-01-07', 'VAL-01-08', 'VAL-01-10']);
    expect(v.resultados.find((r) => r.codigo === 'VAL-01-07')?.detalle).toContain('acta');
  });

  it('con sedes, servicios, ejercicio y método confirmado se puede avanzar; quedan solo advertencias', async () => {
    const { registro, entidad, coordinadora } = await configuracionCompleta();
    const ej = valor(await registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte', fechaCorte: '2025-06-30', responsableId: coordinadora.id }));
    valor(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { metodo_conteo_meses_confirmado: true }, justificacion: 'Acta' }));
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 1, entidadId: entidad.id, ejercicioId: ej.id }));
    expect(v.puedeAvanzar).toBe(true);
    expect(v.bloqueantesPendientes).toBe(0);
    expect(v.resultados.filter((r) => !r.cumple).map((r) => r.codigo)).toEqual(['VAL-01-08', 'VAL-01-10']);
  });

  it('VAL-01-04/05/09 señalan la clase concreta', async () => {
    const { registro, entidad, sqlite } = await entidadNueva();
    valor(await registro.invocar('clase:crear', { entidadId: entidad.id, codigo: 'RAR', nombre: 'Rara', subcuentaContable: '1699', vidaUtilContableMeses: null, vidaUtilTecnicaAnios: 3, esDepreciable: true, requiereHojaVida: false, requiereInvima: false, responsableTecnico: 'x' }));
    // El contrato impide crear sin subcuenta; el dato legado o importado sí puede llegar vacío.
    sqlite.prepare(`UPDATE clase_activo SET subcuenta_contable = '' WHERE codigo = 'RAR'`).run();
    const v = valor(await registro.invocar('validaciones:evaluar', { paso: 1, entidadId: entidad.id }));
    expect(v.resultados.find((r) => r.codigo === 'VAL-01-04')?.detalle).toContain('RAR');
    expect(v.resultados.find((r) => r.codigo === 'VAL-01-05')?.detalle).toContain('RAR');
    const emc = valor(await registro.invocar('clase:listar', { entidadId: entidad.id })).find((c) => c.codigo === 'EMC');
    valor(await registro.invocar('clase:actualizar', { id: emc?.id ?? '', cambios: { vidaUtilTecnicaAnios: 12 } }));
    const v2 = valor(await registro.invocar('validaciones:evaluar', { paso: 1, entidadId: entidad.id }));
    expect(v2.resultados.find((r) => r.codigo === 'VAL-01-09')).toMatchObject({ cumple: false, severidad: 'ADVERTENCIA', detalle: expect.stringContaining('EMC') });
  });
});

describe('clonar parametrización (RF-01-09)', () => {
  it('copia clases, parámetros (sin la confirmación por acta) y convención al destino', async () => {
    const { registro, entidad } = await entidadNueva();
    valor(await registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { valor_residual_pct: 10, metodo_conteo_meses_confirmado: true }, justificacion: 'Acta' }));
    const destino = valor(await registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, nit: '800000000-9', razonSocial: 'Destino', precargarSemillas: false }));
    const r = valor(await registro.invocar('entidad:clonarParametrizacion', { origenId: entidad.id, destinoId: destino.id }));
    expect(r.clases).toBe(8);
    const p = valor(await registro.invocar('parametros:obtener', { entidadId: destino.id }));
    expect(p.valor_residual_pct).toBe(10);
    expect(p.metodo_conteo_meses_confirmado).toBe(false);
    expect(valor(await registro.invocar('abreviatura:listar', { entidadId: destino.id }))).toHaveLength(20);
  });
});
