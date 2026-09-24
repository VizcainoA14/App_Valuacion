/**
 * T-D-03 / T-D-05 — el motor aplicado sobre la base: qué se persiste en el
 * cálculo, qué se excluye y por qué, y que hay uno solo por proceso, a su fecha
 * de corte (ADR-029).
 *
 * La aritmética ya está probada contra `/especificacion/teoria` en `compartido/motor/calculo.test.ts`.
 * Aquí se comprueba el camino. Las cifras esperadas son las mismas de antes de
 * ADR-028 y ADR-029: las reestructuraciones cambiaron cómo se organiza el
 * cálculo, no el cálculo.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { arnesPaso01, PROCESO_PRUEBA, valor } from '../configuracion/pruebas';
import { nuevoId } from '../../infraestructura/db/identificadores';
import type { Arnes } from '../configuracion/pruebas';

const FECHA_CORTE = '2025-06-30';

interface Escenario extends Arnes {
  procesoId: string;
  claseId: string;
  claseNoDepreciableId: string;
  servicioId: string;
}

/** Proceso con dos clases (una depreciable y un terreno) y un servicio. */
async function escenario(): Promise<Escenario> {
  const a = await arnesPaso01({ hoy: '2025-09-02' });
  const entidad = valor(await a.registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, fechaCorte: FECHA_CORTE, precargarSemillas: false }));
  const clase = valor(
    await a.registro.invocar('clase:crear', {
      procesoId: entidad.id,
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
      procesoId: entidad.id,
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
  const sede = valor(await a.registro.invocar('sede:crear', { procesoId: entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán', activa: true }));
  const servicio = valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'LAB', nombre: 'Laboratorio', tipo: 'asistencial', responsable: null, activo: true }));
  return { ...a, procesoId: entidad.id, claseId: clase.id, claseNoDepreciableId: terreno.id, servicioId: servicio.id };
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
      `INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                         sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, fecha_toma,
                         funcionario_conteo, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, 'AGITADOR', ?, ?, ?, 1, ?, ?, ?, 'TECNICO', ?, ?)`,
    )
    .run(id, e.procesoId, datos.codigo, `P-${datos.codigo}`, datos.claseId ?? e.claseId, sedeId, e.servicioId, datos.estadoActual ?? 'BUENO', datos.tenencia ?? 'PROPIO', FECHA_CORTE, e.ctx.ahoraIso(), e.ctx.ahoraIso());

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

const calcular = (e: Escenario) => e.registro.invocar('calculo:ejecutar', { procesoId: e.procesoId });

/** La fecha de corte es del proceso: para calcular a otra, se cambia la del proceso. */
const cambiarFecha = (e: Escenario, fechaCorte: string) => e.registro.invocar('proceso:actualizar', { id: e.procesoId, cambios: { fechaCorte }, justificacion: null });

const cortes = (e: Escenario): number => (e.sqlite.prepare('SELECT COUNT(*) AS n FROM corte WHERE proceso_id = ?').get(e.procesoId) as { n: number }).n;

let e: Escenario;
beforeEach(async () => {
  e = await escenario();
});

describe('calculo:ejecutar · recorre el inventario y guarda un corte', () => {
  it('reproduce las cifras de ANEXO_C §3.3 a través de la base', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', costoPesos: 23_739_280, fechaAdquisicion: '2018-04-27' });

    const r = valor(await calcular(e));
    expect(r.corte.fechaCorte).toBe(FECHA_CORTE);
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

    const r = valor(await calcular(e));
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

    const r = valor(await calcular(e));
    const por = (codigo: string, ambito: string) => r.exclusiones.find((x) => x.codigoInstitucional === codigo && x.ambito === ambito);

    expect(por('SIN-COSTO', 'DEPRECIACION')?.estado).toBe('NO_CALCULABLE');
    expect(por('SIN-HV', 'OBSOLESCENCIA')?.estado).toBe('NO_CALCULABLE');
    expect(por('TERRENO', 'DEPRECIACION')?.estado).toBe('NO_APLICA');
    expect(por('COMODATO', 'DEPRECIACION')?.motivo).toContain('RN-02-04');

    // El terreno SÍ tiene obsolescencia calculada si su clase trae vida útil; esta no.
    expect(por('TERRENO', 'OBSOLESCENCIA')?.estado).toBe('NO_CALCULABLE');
    expect(r.resumen.conDepreciacion).toBe(0);
    expect(r.resumen.noAplicaDepreciacion).toBe(2);

    // Y quedan guardadas con el corte: el informe de este corte las relaciona aunque el bien cambie después.
    const guardadas = valor(await e.registro.invocar('calculo:exclusiones', { corteId: r.corte.id }));
    expect(guardadas).toHaveLength(r.exclusiones.length);
  });

  it('un bien dado de baja no entra al cálculo pero conserva su historial (§11 caso 10)', async () => {
    sembrarBien(e, { codigo: 'VIVO' });
    const bajaId = sembrarBien(e, { codigo: 'BAJA' });
    const antes = valor(await calcular(e));
    expect(antes.resumen.bienesConsiderados).toBe(2);
    e.sqlite.prepare(`UPDATE bien SET estado_registro = 'DADO_DE_BAJA' WHERE id = ?`).run(bajaId);
    // Hasta recalcular, el cálculo dice lo que era cierto cuando se hizo.
    expect(valor(await e.registro.invocar('calculo:resumen', { corteId: antes.corte.id })).bienesConsiderados).toBe(2);

    const r = valor(await calcular(e));
    expect(r.resumen.bienesConsiderados).toBe(1);
    expect(r.resumen.conDepreciacion).toBe(1);
    // El bien sigue ahí, con su historia: solo sale del cálculo.
    expect((e.sqlite.prepare('SELECT COUNT(*) AS n FROM bien WHERE id = ?').get(bajaId) as { n: number }).n).toBe(1);
  });

  it('un bien adquirido después de la fecha de corte no existía ese día: NO_APLICA, no un error', async () => {
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2018-04-27' });
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2025-08-01' });
    const r = valor(await calcular(e));
    expect(r.resumen.bienesConsiderados).toBe(1);
    const x = r.exclusiones.find((y) => y.codigoInstitucional === 'NUEVO');
    expect(x).toMatchObject({ ambito: 'GENERAL', estado: 'NO_APLICA' });
    expect(x?.motivo).toContain('después de la fecha de corte');
  });
});

describe('calculo:ejecutar · garantías del proceso', () => {
  it('calcula a la fecha de corte del proceso; cambiarla descarta el cálculo y el nuevo sale a la fecha nueva', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', costoPesos: 23_739_280 });
    const acumulada = (corteId: string): number =>
      (e.sqlite.prepare('SELECT depreciacion_acumulada_cent AS v FROM calculo_depreciacion WHERE bien_id = ? AND corte_id = ?').get(bienId, corteId) as { v: number }).v;

    const junio = valor(await calcular(e));
    expect(junio.corte.fechaCorte).toBe(FECHA_CORTE);
    expect(acumulada(junio.corte.id)).toBe(1_135_672_423);

    valor(await cambiarFecha(e, '2024-12-31'));
    // Un cálculo a otra fecha ya no es el de este proceso: se descarta.
    expect(valor(await e.registro.invocar('corte:actual', { procesoId: e.procesoId }))).toBeNull();

    const diciembre = valor(await calcular(e));
    expect(diciembre.corte.fechaCorte).toBe('2024-12-31');
    expect(acumulada(diciembre.corte.id)).toBeLessThan(1_135_672_423);
    expect(cortes(e)).toBe(1);
  });

  it('recalcular reemplaza el cálculo anterior: hay uno solo por proceso', async () => {
    sembrarBien(e, { codigo: 'B-1' });
    const primero = valor(await calcular(e));
    const segundo = valor(await calcular(e));
    expect(segundo.corte.id).not.toBe(primero.corte.id);
    expect(cortes(e)).toBe(1);
    expect(valor(await e.registro.invocar('corte:porId', { id: primero.corte.id }))).toBeNull();
    expect((e.sqlite.prepare('SELECT COUNT(*) AS n FROM calculo_obsolescencia WHERE corte_id = ?').get(primero.corte.id) as { n: number }).n).toBe(0);
    expect(valor(await e.registro.invocar('corte:actual', { procesoId: e.procesoId }))?.id).toBe(segundo.corte.id);
    // Los dos cálculos quedan en la bitácora aunque el primero ya no exista.
    expect((e.sqlite.prepare(`SELECT COUNT(*) AS n FROM bitacora WHERE accion = 'CALCULAR'`).get() as { n: number }).n).toBe(2);
  });

  it('la fecha de corte del proceso no puede ser futura', async () => {
    const r = await cambiarFecha(e, '2099-01-01');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('FECHA_CORTE_FUTURA');
  });

  it('sin inventario no hay nada que calcular, y lo dice', async () => {
    const r = await calcular(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('SIN_INVENTARIO');
  });

  it('el cálculo guarda sus parámetros: cambiarlos no reescribe lo calculado hasta que se recalcula (RN-01-01)', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', costoPesos: 23_739_280 });
    const residual = (corteId: string): number =>
      (e.sqlite.prepare('SELECT valor_residual_cent AS v FROM calculo_depreciacion WHERE bien_id = ? AND corte_id = ?').get(bienId, corteId) as { v: number }).v;

    const primero = valor(await calcular(e));
    expect(residual(primero.corte.id)).toBe(0);

    valor(await e.registro.invocar('parametros:actualizar', { procesoId: e.procesoId, cambios: { valor_residual_pct: 20 }, justificacion: 'Política contable actualizada' }));
    expect(residual(primero.corte.id)).toBe(0);
    expect(valor(await e.registro.invocar('corte:porId', { id: primero.corte.id }))?.parametros.valor_residual_pct).toBe(0);

    const segundo = valor(await calcular(e));
    // 20 % de 23.739.280 = 4.747.856 pesos.
    expect(residual(segundo.corte.id)).toBe(474_785_600);
    expect(segundo.corte.parametros.valor_residual_pct).toBe(20);
  });

  it('la obsolescencia funcional se declara en el bien y pesa al recalcular (RN-05-03)', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2024-01-15' });
    const antes = valor(await calcular(e));
    expect(antes.resumen.candidatosBaja).toBe(0);

    const marcado = valor(
      await e.registro.invocar('bien:marcarObsolescenciaFuncional', {
        bienId,
        funcional: true,
        justificacion: 'El software del equipo ya no es compatible con el sistema de información',
      }),
    );
    expect(marcado.obsolescenciaFuncional).toBe(true);
    expect(marcado.justificacionFuncional).toContain('sistema de información');
    // El cálculo hecho no cambia solo: dice lo que se sabía cuando se calculó.
    expect(valor(await e.registro.invocar('calculo:resumen', { corteId: antes.corte.id })).candidatosBaja).toBe(0);

    const despues = valor(await calcular(e));
    expect(despues.resumen.candidatosBaja).toBe(1);
    const fila = e.sqlite.prepare('SELECT obsolescencia_funcional, motivos_baja FROM calculo_obsolescencia WHERE corte_id = ?').get(despues.corte.id) as { obsolescencia_funcional: number; motivos_baja: string };
    expect(fila.obsolescencia_funcional).toBe(1);
    expect(JSON.parse(fila.motivos_baja)).not.toHaveLength(0);
  });

  it('deja el cálculo en la bitácora, con el método aplicado', async () => {
    sembrarBien(e, { codigo: 'B-1' });
    valor(await calcular(e));
    const fila = e.sqlite.prepare(`SELECT valor_nuevo FROM bitacora WHERE accion = 'CALCULAR' ORDER BY rowid DESC LIMIT 1`).get() as { valor_nuevo: string };
    expect(fila.valor_nuevo).toContain('dias_exactos');
    expect(fila.valor_nuevo).toContain(FECHA_CORTE);
  });

  it('un proceso finalizado no se recalcula, y su cálculo tampoco se toca por SQL (ADR-029)', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1' });
    const { corte } = valor(await calcular(e));
    valor(await e.registro.invocar('proceso:finalizar', { id: e.procesoId }));

    const r = await calcular(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('PROCESO_FINALIZADO');
    expect(() => e.sqlite.prepare('UPDATE hoja_vida SET costo_adquisicion_cent = 1 WHERE bien_id = ?').run(bienId)).toThrow(/FINALIZADO/);
    expect(() => e.sqlite.prepare('DELETE FROM corte WHERE id = ?').run(corte.id)).toThrow(/FINALIZADO/);
    expect(valor(await e.registro.invocar('corte:actual', { procesoId: e.procesoId }))?.id).toBe(corte.id);
  });
});

describe('calculo:listar y calculo:resumen', () => {
  it('ordena por índice descendente y filtra por semáforo y candidatos', async () => {
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2024-06-30' });
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2000-06-30', estadoActual: 'INSERVIBLE' });
    sembrarBien(e, { codigo: 'SIN-HV', sinHojaVida: true });
    const { corte } = valor(await calcular(e));

    const todos = valor(await e.registro.invocar('calculo:listar', { corteId: corte.id }));
    expect(todos.total).toBe(3);
    // El más obsoleto primero; el no calculable al final, para que no tape el trabajo real.
    expect(todos.filas[0]?.codigoInstitucional).toBe('VIEJO');
    expect(todos.filas[2]?.codigoInstitucional).toBe('SIN-HV');
    expect(todos.filas[2]?.indiceObsolescencia).toBeNull();

    const rojos = valor(await e.registro.invocar('calculo:listar', { corteId: corte.id, semaforo: 'ROJO' }));
    expect(rojos.filas.map((f) => f.codigoInstitucional)).toEqual(['VIEJO']);

    const candidatos = valor(await e.registro.invocar('calculo:listar', { corteId: corte.id, soloCandidatosBaja: true }));
    expect(candidatos.filas.map((f) => f.codigoInstitucional)).toEqual(['VIEJO']);
  });

  it('avisa de que el inventario cambió después de calcular', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1' });
    const { corte } = valor(await calcular(e));
    expect(valor(await e.registro.invocar('calculo:resumen', { corteId: corte.id })).inventarioCambio).toBe(false);

    e.sqlite.prepare(`UPDATE hoja_vida SET costo_adquisicion_cent = 999, actualizado_en = '2999-01-01T00:00:00.000Z' WHERE bien_id = ?`).run(bienId);
    expect(valor(await e.registro.invocar('calculo:resumen', { corteId: corte.id })).inventarioCambio).toBe(true);
  });
});
