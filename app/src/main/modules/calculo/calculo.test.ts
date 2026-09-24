/**
 * T-D-03 / T-D-05 — el motor aplicado sobre la base: qué se persiste, qué se
 * excluye y qué NO se pisa al recalcular.
 *
 * La aritmética ya está probada contra `/especificacion/teoria` en `compartido/motor/calculo.test.ts`.
 * Aquí se comprueba el camino: parámetros congelados, exclusiones con motivo,
 * conservación del juicio humano e inmutabilidad del ejercicio cerrado.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from '../configuracion/pruebas';
import { nuevoId } from '../../infraestructura/db/identificadores';
import type { Arnes } from '../configuracion/pruebas';

const FECHA_CORTE = '2025-06-30';

interface Escenario extends Arnes {
  entidadId: string;
  ejercicioId: string;
  claseId: string;
  claseNoDepreciableId: string;
  servicioId: string;
}

/**
 * Entidad con dos clases (una depreciable y un terreno), un servicio y un
 * ejercicio al 2025-06-30 con el método de conteo YA confirmado por acta.
 */
async function escenario(opciones: { confirmarMetodo?: boolean } = {}): Promise<Escenario> {
  const a = await arnesPaso01({ hoy: '2025-09-02' });
  const entidad = valor(await a.registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, precargarSemillas: false }));
  const clase = valor(
    await a.registro.invocar('clase:crear', {
      entidadId: entidad.id,
      codigo: 'EMC',
      nombre: 'EQUIPO MEDICO CIENTIFICO',
      subcuentaContable: '167002',
      esDepreciable: true,
      vidaUtilContableMeses: 180,
      vidaUtilTecnicaAnios: 15,
      requiereHojaVida: true,
      requiereInvima: false,
      responsableTecnico: 'Ingeniería biomédica',
      activo: true,
    }),
  );
  const terreno = valor(
    await a.registro.invocar('clase:crear', {
      entidadId: entidad.id,
      codigo: 'TER',
      nombre: 'TERRENOS',
      subcuentaContable: '160501',
      esDepreciable: false,
      vidaUtilContableMeses: null,
      vidaUtilTecnicaAnios: null,
      requiereHojaVida: false,
      requiereInvima: false,
      responsableTecnico: 'Gestión predial',
      activo: true,
    }),
  );
  const sede = valor(await a.registro.invocar('sede:crear', { entidadId: entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán', activa: true }));
  const servicio = valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'LAB', nombre: 'Laboratorio', tipo: 'asistencial', responsable: null, activo: true }));

  if (opciones.confirmarMetodo !== false) {
    const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: entidad.id }));
    valor(await a.registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { ...p, metodo_conteo_meses_confirmado: true }, justificacion: 'Acta de comité con el contador' }));
  }

  const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte 2025', fechaCorte: FECHA_CORTE }));
  return { ...a, entidadId: entidad.id, ejercicioId: ejercicio.id, claseId: clase.id, claseNoDepreciableId: terreno.id, servicioId: servicio.id };
}

/** Inserta un bien y su hoja de vida por SQL: el camino de importación ya tiene sus pruebas. */
function sembrarBien(
  e: Escenario,
  datos: {
    codigo: string;
    claseId?: string;
    tenencia?: string;
    estadoActual?: string;
    fechaAdquisicion?: string | null;
    costoPesos?: number | null;
    adicionesPesos?: number;
    sinHojaVida?: boolean;
    estadoOperativo?: string;
  },
): string {
  const id = nuevoId();
  const sedeId = (e.sqlite.prepare('SELECT sede_id FROM servicio WHERE id = ?').get(e.servicioId) as { sede_id: string }).sede_id;
  e.sqlite
    .prepare(
      `INSERT INTO bien (id, ejercicio_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                         sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, fecha_toma,
                         funcionario_conteo, estado_registro, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, 'AGITADOR', ?, ?, ?, 1, ?, ?, ?, 'TECNICO', 'BORRADOR', ?, ?)`,
    )
    .run(id, e.ejercicioId, datos.codigo, `P-${datos.codigo}`, datos.claseId ?? e.claseId, sedeId, e.servicioId, datos.estadoActual ?? 'BUENO', datos.tenencia ?? 'PROPIO', FECHA_CORTE, e.ctx.ahoraIso(), e.ctx.ahoraIso());

  if (datos.sinHojaVida !== true) {
    e.sqlite
      .prepare(
        `INSERT INTO hoja_vida (id, bien_id, estado_operativo, forma_adquisicion, fecha_adquisicion,
                                costo_adquisicion_cent, adiciones_mejoras_cent, creado_en, actualizado_en)
         VALUES (?, ?, ?, 'COMPRA', ?, ?, ?, ?, ?)`,
      )
      .run(
        nuevoId(),
        id,
        datos.estadoOperativo ?? 'OPERATIVO',
        datos.fechaAdquisicion === undefined ? '2018-04-27' : datos.fechaAdquisicion,
        datos.costoPesos === undefined ? 2_373_928_000 : datos.costoPesos === null ? null : Math.round(datos.costoPesos * 100),
        Math.round((datos.adicionesPesos ?? 0) * 100),
        e.ctx.ahoraIso(),
        e.ctx.ahoraIso(),
      );
  }
  return id;
}

let e: Escenario;
beforeEach(async () => {
  e = await escenario();
});

describe('calculo:ejecutar · recorre el inventario y persiste', () => {
  it('reproduce las cifras de ANEXO_C §3.3 a través de la base', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', costoPesos: 23_739_280, fechaAdquisicion: '2018-04-27' });

    const r = valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(r.resumen.conObsolescencia).toBe(1);
    expect(r.resumen.conDepreciacion).toBe(1);
    expect(r.resumen.metodoConteoAplicado).toBe('dias_exactos');

    const fila = e.sqlite.prepare('SELECT * FROM calculo_depreciacion WHERE bien_id = ?').get(bienId) as Record<string, number | string>;
    expect(fila['depreciacion_acumulada_cent']).toBe(1_135_672_423);
    expect(fila['saldo_por_depreciar_cent']).toBe(1_238_255_577);
    expect(fila['meses_transcurridos_x10k']).toBe(861_109);
    expect(fila['metodo_conteo_aplicado']).toBe('dias_exactos');

    const obs = e.sqlite.prepare('SELECT * FROM calculo_obsolescencia WHERE bien_id = ?').get(bienId) as Record<string, number | string>;
    // 2.621 días / 365,25 = 7,1759 años sobre 15 → 0,4784 → VERDE.
    expect(obs['edad_actual_anios_x10k']).toBe(71_759);
    expect(obs['indice_obsolescencia_x10k']).toBe(4_784);
    expect(obs['semaforo']).toBe('VERDE');
  });

  it('el resumen totaliza y clasifica por semáforo', async () => {
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2024-06-30', costoPesos: 1_000_000 });
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2005-06-30', costoPesos: 1_000_000, estadoActual: 'MALO' });

    const r = valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(r.resumen.bienesConsiderados).toBe(2);
    expect(r.resumen.porSemaforo.VERDE).toBe(1);
    expect(r.resumen.porSemaforo.ROJO).toBe(1);
    // El viejo superó su vida útil: candidato por índice ≥ 1.
    expect(r.resumen.candidatosBaja).toBe(1);
    expect(r.resumen.totalSaldoAjustado).toBe(200_000_000);
    expect(r.resumen.totalValorNetoLibros).toBe(r.resumen.totalSaldoAjustado - r.resumen.totalDepreciacionAcumulada);
  });

  it('excluye con motivo, no con un cero: sin datos, terreno y bien de tercero', async () => {
    sembrarBien(e, { codigo: 'SIN-COSTO', costoPesos: null });
    sembrarBien(e, { codigo: 'SIN-HV', sinHojaVida: true });
    sembrarBien(e, { codigo: 'TERRENO', claseId: e.claseNoDepreciableId });
    sembrarBien(e, { codigo: 'COMODATO', tenencia: 'COMODATO' });

    const r = valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    const por = (codigo: string, ambito: string) => r.exclusiones.find((x) => x.codigoInstitucional === codigo && x.ambito === ambito);

    expect(por('SIN-COSTO', 'DEPRECIACION')?.estado).toBe('NO_CALCULABLE');
    expect(por('SIN-HV', 'OBSOLESCENCIA')?.estado).toBe('NO_CALCULABLE');
    expect(por('TERRENO', 'DEPRECIACION')?.estado).toBe('NO_APLICA');
    expect(por('COMODATO', 'DEPRECIACION')?.motivo).toContain('RN-02-04');

    // El terreno SÍ tiene obsolescencia calculada si su clase trae vida útil; esta no.
    expect(por('TERRENO', 'OBSOLESCENCIA')?.estado).toBe('NO_CALCULABLE');
    expect(r.resumen.conDepreciacion).toBe(0);
    expect(r.resumen.noAplicaDepreciacion).toBe(2);
  });

  it('un bien dado de baja no entra al cálculo pero conserva su historial (§11 caso 10)', async () => {
    sembrarBien(e, { codigo: 'VIVO' });
    const bajaId = sembrarBien(e, { codigo: 'BAJA' });
    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));

    // Recorrido completo de la máquina de estados hasta DADO_DE_BAJA.
    for (const estado of ['INCOMPLETO', 'VALIDADO', 'ACTIVO', 'PROPUESTO_BAJA', 'DADO_DE_BAJA']) {
      e.sqlite.prepare('UPDATE bien SET estado_registro = ? WHERE id = ?').run(estado, bajaId);
    }

    const r = valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(r.resumen.bienesConsiderados).toBe(1);
    expect(r.resumen.conDepreciacion).toBe(1);
    // El cálculo anterior del bien dado de baja se retira: ya no lo respalda nada.
    expect((e.sqlite.prepare('SELECT COUNT(*) AS n FROM calculo_depreciacion').get() as { n: number }).n).toBe(1);
  });
});

describe('calculo:ejecutar · garantías del proceso', () => {
  it('se niega a calcular si el método de conteo no está confirmado por acta (VAL-01-07)', async () => {
    const sin = await escenario({ confirmarMetodo: false });
    sembrarBien(sin, { codigo: 'B-1' });
    const r = await sin.registro.invocar('calculo:ejecutar', { entidadId: sin.entidadId, ejercicioId: sin.ejercicioId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.codigo).toBe('METODO_CONTEO_SIN_CONFIRMAR');
      expect(r.error.mensaje).toContain('acta');
    }
  });

  it('calcula con los parámetros CONGELADOS del ejercicio, no con el catálogo vigente (RN-01-01)', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', costoPesos: 23_739_280 });
    const residual = (): number =>
      (e.sqlite.prepare('SELECT valor_residual_cent FROM calculo_depreciacion WHERE bien_id = ?').get(bienId) as { valor_residual_cent: number }).valor_residual_cent;

    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(residual()).toBe(0);

    // El congelado del ejercicio dice 20 %; el catálogo vigente sigue en 0 %.
    // El motor tiene que seguir al congelado: es lo que se pactó al abrir el corte.
    const congelados = JSON.parse((e.sqlite.prepare('SELECT parametros_congelados_json AS j FROM ejercicio WHERE id = ?').get(e.ejercicioId) as { j: string }).j) as Record<string, unknown>;
    e.sqlite.prepare('UPDATE ejercicio SET parametros_congelados_json = ? WHERE id = ?').run(JSON.stringify({ ...congelados, valor_residual_pct: 20 }), e.ejercicioId);
    expect(valor(await e.registro.invocar('parametros:obtener', { entidadId: e.entidadId })).valor_residual_pct).toBe(0);

    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    // 20 % de 23.739.280 = 4.747.856 pesos.
    expect(residual()).toBe(474_785_600);
  });

  it('recalcular NO borra la obsolescencia funcional declarada por el especialista (RN-05-03)', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2024-01-15' });
    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));

    const marcado = valor(
      await e.registro.invocar('calculo:marcarObsolescenciaFuncional', {
        ejercicioId: e.ejercicioId,
        bienId,
        funcional: true,
        justificacion: 'El software del equipo ya no es compatible con el sistema de información',
      }),
    );
    expect(marcado.obsolescenciaFuncional).toBe(true);
    expect(marcado.candidatoBaja).toBe(true);

    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    const fila = e.sqlite.prepare('SELECT obsolescencia_funcional, justificacion_funcional, candidato_baja FROM calculo_obsolescencia WHERE bien_id = ?').get(bienId) as {
      obsolescencia_funcional: number;
      justificacion_funcional: string | null;
      candidato_baja: number;
    };
    expect(fila.obsolescencia_funcional).toBe(1);
    expect(fila.justificacion_funcional).toContain('sistema de información');
    // Y el bien sigue siendo candidato: el motivo humano se conserva en el recálculo.
    expect(fila.candidato_baja).toBe(1);
  });

  it('deja el cálculo en la bitácora, con el método aplicado', async () => {
    sembrarBien(e, { codigo: 'B-1' });
    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    const fila = e.sqlite.prepare(`SELECT valor_nuevo FROM bitacora WHERE accion = 'CALCULAR' ORDER BY rowid DESC LIMIT 1`).get() as { valor_nuevo: string };
    expect(fila.valor_nuevo).toContain('dias_exactos');
    expect(fila.valor_nuevo).toContain(FECHA_CORTE);
  });

  it('un ejercicio cerrado rechaza el cálculo (INT-09, §11 caso 15)', async () => {
    sembrarBien(e, { codigo: 'B-1' });
    // La máquina de ANEXO_B §6.1 no admite saltos: hay que recorrer los estados.
    for (const estado of ['EN_LEVANTAMIENTO', 'EN_CONCILIACION', 'EN_CALCULO', 'EN_VALUACION', 'EN_APROBACION', 'CERRADO']) {
      e.sqlite.prepare('UPDATE ejercicio SET estado = ? WHERE id = ?').run(estado, e.ejercicioId);
    }
    const r = await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId });
    expect(r.ok).toBe(false);
    // Lo para el middleware antes de llegar al caso de uso: la inmutabilidad no
    // depende de que cada caso de uso se acuerde de comprobarla (ADR-017).
    if (!r.ok) expect(r.error.codigo).toBe('INT-09');
  });
});

describe('calculo:listar y calculo:resumen', () => {
  it('ordena por índice descendente y filtra por semáforo y candidatos', async () => {
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2024-06-30' });
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2000-06-30', estadoActual: 'INSERVIBLE' });
    sembrarBien(e, { codigo: 'SIN-HV', sinHojaVida: true });
    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));

    const todos = valor(await e.registro.invocar('calculo:listar', { ejercicioId: e.ejercicioId }));
    expect(todos.total).toBe(3);
    // El más obsoleto primero; el no calculable al final, para que no tape el trabajo real.
    expect(todos.filas[0]?.codigoInstitucional).toBe('VIEJO');
    expect(todos.filas[2]?.codigoInstitucional).toBe('SIN-HV');
    expect(todos.filas[2]?.indiceObsolescencia).toBeNull();

    const rojos = valor(await e.registro.invocar('calculo:listar', { ejercicioId: e.ejercicioId, semaforo: 'ROJO' }));
    expect(rojos.filas.map((f) => f.codigoInstitucional)).toEqual(['VIEJO']);

    const candidatos = valor(await e.registro.invocar('calculo:listar', { ejercicioId: e.ejercicioId, soloCandidatosBaja: true }));
    expect(candidatos.filas.map((f) => f.codigoInstitucional)).toEqual(['VIEJO']);
  });

  it('avisa de que el cálculo quedó desfasado cuando cambia una entrada', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1' });
    valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(valor(await e.registro.invocar('calculo:resumen', { ejercicioId: e.ejercicioId })).desactualizado).toBe(false);

    e.sqlite.prepare(`UPDATE hoja_vida SET costo_adquisicion_cent = 999, actualizado_en = '2999-01-01T00:00:00.000Z' WHERE bien_id = ?`).run(bienId);
    expect(valor(await e.registro.invocar('calculo:resumen', { ejercicioId: e.ejercicioId })).desactualizado).toBe(true);
  });
});
