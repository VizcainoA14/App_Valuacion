/**
 * T-F-01 / T-F-02 — la bandeja de candidatos y las propuestas de baja.
 *
 * Lo que se comprueba aquí es que la app **registre estados sin decidir nada**
 * (RN-09-04), que exija una justificación individual de verdad (RN-09-06) y que
 * la máquina de ANEXO_B §6.3 la haga cumplir la base, no la interfaz.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from '../configuracion/pruebas';
import type { Arnes } from '../configuracion/pruebas';
import { nuevoId } from '../../infraestructura/db/identificadores';

const FECHA_CORTE = '2025-06-30';

interface Escenario extends Arnes {
  entidadId: string;
  ejercicioId: string;
  claseId: string;
  servicioId: string;
}

async function escenario(): Promise<Escenario> {
  const a = await arnesPaso01({ hoy: '2025-09-02' });
  const entidad = valor(await a.registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, precargarSemillas: false }));
  const clase = valor(
    await a.registro.invocar('clase:crear', {
      entidadId: entidad.id,
      codigo: 'EMC',
      nombre: 'EQUIPO MEDICO CIENTIFICO',
      subcuentaContable: '167002',
      esDepreciable: true,
      vidaUtilContableMeses: 120,
      vidaUtilTecnicaAnios: 10,
      requiereHojaVida: true,
      requiereInvima: false,
      responsableTecnico: 'Ingeniería biomédica',
      activo: true,
    }),
  );
  const sede = valor(await a.registro.invocar('sede:crear', { entidadId: entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán', activa: true }));
  const servicio = valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'LAB', nombre: 'Laboratorio', tipo: 'asistencial', responsable: null, activo: true }));

  const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: entidad.id }));
  valor(await a.registro.invocar('parametros:actualizar', { entidadId: entidad.id, cambios: { ...p, metodo_conteo_meses_confirmado: true }, justificacion: 'Acta con el contador' }));

  const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Corte 2025', fechaCorte: FECHA_CORTE }));
  return { ...a, entidadId: entidad.id, ejercicioId: ejercicio.id, claseId: clase.id, servicioId: servicio.id };
}

/** Bien con hoja de vida, sembrado por SQL; el camino de importación ya tiene pruebas. */
function sembrarBien(e: Escenario, datos: { codigo: string; fechaAdquisicion?: string; estadoActual?: string; costoPesos?: number; estadoOperativo?: string }): string {
  const id = nuevoId();
  const sedeId = (e.sqlite.prepare('SELECT sede_id FROM servicio WHERE id = ?').get(e.servicioId) as { sede_id: string }).sede_id;
  const ahora = e.ctx.ahoraIso();
  e.sqlite
    .prepare(
      `INSERT INTO bien (id, ejercicio_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                         sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, fecha_toma,
                         funcionario_conteo, estado_registro, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, 'MONITOR DE SIGNOS VITALES', ?, ?, ?, 1, ?, 'PROPIO', ?, 'TECNICO', 'BORRADOR', ?, ?)`,
    )
    .run(id, e.ejercicioId, datos.codigo, `P-${datos.codigo}`, e.claseId, sedeId, e.servicioId, datos.estadoActual ?? 'BUENO', FECHA_CORTE, ahora, ahora);
  e.sqlite
    .prepare(
      `INSERT INTO hoja_vida (id, bien_id, estado_operativo, forma_adquisicion, fecha_adquisicion,
                              costo_adquisicion_cent, adiciones_mejoras_cent, creado_en, actualizado_en)
       VALUES (?, ?, ?, 'COMPRA', ?, ?, 0, ?, ?)`,
    )
    .run(nuevoId(), id, datos.estadoOperativo ?? 'OPERATIVO', datos.fechaAdquisicion ?? '2010-01-15', Math.round((datos.costoPesos ?? 10_000_000) * 100), ahora, ahora);
  // BORRADOR → VALIDADO; el paso a ACTIVO lo hace `bien:activarValidados`.
  e.sqlite.prepare(`UPDATE bien SET estado_registro = 'VALIDADO' WHERE id = ?`).run(id);
  return id;
}

async function calcular(e: Escenario): Promise<void> {
  valor(await e.registro.invocar('calculo:ejecutar', { entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
}

const JUSTIFICACION = 'Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición.';

async function proponer(e: Escenario, bienId: string, extra: Record<string, unknown> = {}) {
  return e.registro.invocar('baja:proponer', {
    ejercicioId: e.ejercicioId,
    bienId,
    causal: 'OBSOLESCENCIA',
    justificacionTecnica: JUSTIFICACION,
    fechaPropuesta: '2025-07-15',
    ...extra,
  });
}

let e: Escenario;
beforeEach(async () => {
  e = await escenario();
});

describe('bandeja de candidatos (T-F-01, RF-09-01)', () => {
  it('lista los candidatos del paso 05 con los motivos que dio el motor', async () => {
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2000-01-15', estadoActual: 'INSERVIBLE' });
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2024-01-15' });
    await calcular(e);

    const candidatos = valor(await e.registro.invocar('baja:candidatos', { ejercicioId: e.ejercicioId }));
    expect(candidatos.map((c) => c.codigoInstitucional)).toEqual(['VIEJO']);
    const viejo = candidatos[0];
    expect(viejo?.motivos.length).toBeGreaterThan(0);
    expect(viejo?.motivos.join(' ')).toContain('vida útil');
    // La causal es una sugerencia: el bien está inservible, así que se propone esa.
    expect(viejo?.causalSugerida).toBe('INSERVIBLE');
    expect(viejo?.valorNetoLibros).not.toBeNull();
    expect(viejo?.propuestaId).toBeNull();
  });

  it('un bien ya propuesto sale de la bandeja, salvo que se pidan expresamente', async () => {
    const bienId = sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, bienId));

    expect(valor(await e.registro.invocar('baja:candidatos', { ejercicioId: e.ejercicioId }))).toHaveLength(0);
    const conPropuestos = valor(await e.registro.invocar('baja:candidatos', { ejercicioId: e.ejercicioId, incluirYaPropuestos: true }));
    expect(conPropuestos[0]?.estadoPropuesta).toBe('PROPUESTO');
  });
});

describe('propuestas de baja (T-F-02)', () => {
  it('RN-09-06: rechaza una justificación genérica y acepta la individual', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));

    const generica = await proponer(e, bienId, { justificacionTecnica: 'Obsoleto' });
    expect(generica.ok).toBe(false);
    if (!generica.ok) {
      expect(generica.error.codigo).toBe('JUSTIFICACION_GENERICA');
      expect(generica.error.mensaje).toContain('RN-09-06');
    }

    const buena = valor(await proponer(e, bienId));
    expect(buena.justificacionTecnica).toBe(JUSTIFICACION);
    expect(buena.estadoAprobacion).toBe('PROPUESTO');
    // ADR-027: ya no se elige especialista. La propuesta se atribuye al
    // representante legal registrado en los datos de la entidad.
    expect(buena.especialistaNombre).toBe('Gerente Prueba');
  });

  it('RN-09-03: calcula y guarda la relación reparación/reposición con su recomendación', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));

    const p = valor(await proponer(e, bienId, { causal: 'INSERVIBLE', costoReparacionEstimado: 600_000_000, valorReposicion: 1_000_000_000 }));
    expect(p.relacionReparacionReposicion).toBe(0.6);
    expect(p.procedeBajaPorEconomia).toBe(true);
    expect(p.recomendacionEconomica).toContain('procede la baja');

    // Sin cotización no hay relación, y se dice por qué (no se inventa un 0).
    const otro = sembrarBien(e, { codigo: 'B-2', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    const sinCotizacion = valor(await proponer(e, otro, { causal: 'INSERVIBLE' }));
    expect(sinCotizacion.relacionReparacionReposicion).toBeNull();
    expect(sinCotizacion.procedeBajaPorEconomia).toBeNull();
    expect(sinCotizacion.recomendacionEconomica).toContain('cotización');
  });

  it('RN-09-05: el efecto contable sale del paso 06, no de otra fuente', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15', costoPesos: 10_000_000 });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    const p = valor(await proponer(e, bienId, { valorSalvamento: 20_000_000 }));

    const dep = e.sqlite.prepare('SELECT saldo_final_ajustado_cent AS s, depreciacion_acumulada_cent AS d FROM calculo_depreciacion WHERE bien_id = ?').get(bienId) as { s: number; d: number };
    expect(p.efectoContable.valorBruto).toBe(dep.s);
    expect(p.efectoContable.depreciacionAsociada).toBe(dep.d);
    expect(p.efectoContable.valorNeto).toBe(dep.s - dep.d);
    expect(p.efectoContable.valorRecuperado).toBe(20_000_000);
  });

  it('no se propone dos veces el mismo bien, ni un bien que no está activo', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);

    // Todavía VALIDADO: hay que cerrar el inventario antes.
    const sinActivar = await proponer(e, bienId);
    expect(sinActivar.ok).toBe(false);
    if (!sinActivar.ok) expect(sinActivar.error.codigo).toBe('BIEN_NO_ACTIVO');

    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, bienId));
    const repetida = await proponer(e, bienId);
    expect(repetida.ok).toBe(false);
    if (!repetida.ok) expect(repetida.error.codigo).toBe('BIEN_YA_PROPUESTO');
  });

  it('el bien acompaña a su propuesta: pasa a PROPUESTO_BAJA', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, bienId));
    const estado = (e.sqlite.prepare('SELECT estado_registro AS x FROM bien WHERE id = ?').get(bienId) as { x: string }).x;
    expect(estado).toBe('PROPUESTO_BAJA');
  });
});

describe('flujo de aprobación (RN-09-04)', () => {
  async function conPropuesta() {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    const p = valor(await proponer(e, bienId));
    return { bienId, propuestaId: p.id };
  }

  it('recorre PROPUESTO → EN_REVISION → APROBADO_COMITE', async () => {
    const { propuestaId } = await conPropuesta();
    expect(valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'EN_REVISION', observacionComite: null })).estadoAprobacion).toBe('EN_REVISION');
    expect(valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'APROBADO_COMITE', observacionComite: 'Aprobada en sesión del 20/07' })).estadoAprobacion).toBe('APROBADO_COMITE');
  });

  it('no admite saltos de estado, y lo dice con lo que sí se puede hacer', async () => {
    const { propuestaId } = await conPropuesta();
    const salto = await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'APROBADO_COMITE', observacionComite: null });
    expect(salto.ok).toBe(false);
    if (!salto.ok) {
      expect(salto.error.codigo).toBe('TRANSICION_NO_PERMITIDA');
      expect(salto.error.mensaje).toContain('En revisión');
    }
  });

  it('el rechazo exige observación y devuelve el bien a ACTIVO (RN-09-04)', async () => {
    const { bienId, propuestaId } = await conPropuesta();
    valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'EN_REVISION', observacionComite: null }));

    const sinMotivo = await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'RECHAZADO', observacionComite: null });
    expect(sinMotivo.ok).toBe(false);
    if (!sinMotivo.ok) expect(sinMotivo.error.codigo).toBe('RECHAZO_SIN_OBSERVACION');

    const rechazada = valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'RECHAZADO', observacionComite: 'El Comité ordena cotizar la reparación antes de decidir.' }));
    expect(rechazada.estadoAprobacion).toBe('RECHAZADO');
    expect((e.sqlite.prepare('SELECT estado_registro AS x FROM bien WHERE id = ?').get(bienId) as { x: string }).x).toBe('ACTIVO');
    // Y al volver a estar activo, puede proponerse de nuevo con mejor soporte.
    expect(valor(await proponer(e, bienId, { causal: 'INSERVIBLE', costoReparacionEstimado: 900_000_000, valorReposicion: 1_000_000_000 })).estadoAprobacion).toBe('PROPUESTO');
  });

  it('ejecutar sin acta del Comité aborta en la BASE, no solo en la interfaz (INT-07)', async () => {
    const { propuestaId } = await conPropuesta();
    for (const estado of ['EN_REVISION', 'APROBADO_COMITE', 'RESOLUCION_EMITIDA']) {
      valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: estado as 'EN_REVISION', observacionComite: null }));
    }
    const ejecutar = await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'EJECUTADO', observacionComite: null });
    expect(ejecutar.ok).toBe(false);
    // El middleware traduce el RAISE del trigger: el código va aparte del mensaje.
    if (!ejecutar.ok) {
      expect(ejecutar.error.codigo).toBe('INT-07');
      expect(ejecutar.error.mensaje).toContain('acta del Comité');
    }
  });

  it('una propuesta que ya pasó por el Comité no se reescribe', async () => {
    const { propuestaId } = await conPropuesta();
    valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'EN_REVISION', observacionComite: null }));
    valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'APROBADO_COMITE', observacionComite: 'Aprobada' }));
    const r = await e.registro.invocar('baja:actualizar', { id: propuestaId, cambios: { causal: 'DESUSO' }, justificacion: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('PROPUESTA_NO_EDITABLE');
  });

  it('cada cambio de estado queda en la bitácora con su observación', async () => {
    const { propuestaId } = await conPropuesta();
    valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'EN_REVISION', observacionComite: null }));
    valor(await e.registro.invocar('baja:cambiarEstado', { id: propuestaId, nuevoEstado: 'APROBADO_COMITE', observacionComite: 'Acta 07 del 20/07/2025' }));
    const filas = e.sqlite.prepare(`SELECT accion, valor_anterior, valor_nuevo, justificacion FROM bitacora WHERE entidad_afectada = 'propuesta_baja' ORDER BY rowid`).all() as {
      accion: string;
      valor_anterior: string | null;
      valor_nuevo: string | null;
      justificacion: string | null;
    }[];
    expect(filas.map((f) => f.accion)).toEqual(['CREAR', 'APROBAR', 'APROBAR']);
    expect(filas[2]?.valor_anterior).toBe('EN_REVISION');
    expect(filas[2]?.justificacion).toContain('Acta 07');
  });
});

describe('resumen y validaciones del paso 09', () => {
  it('el resumen no suma las rechazadas: ese bien volvió al inventario', async () => {
    const b1 = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15', costoPesos: 10_000_000 });
    const b2 = sembrarBien(e, { codigo: 'B-2', fechaAdquisicion: '2000-01-15', costoPesos: 20_000_000 });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, b1));
    const p2 = valor(await proponer(e, b2));

    valor(await e.registro.invocar('baja:cambiarEstado', { id: p2.id, nuevoEstado: 'EN_REVISION', observacionComite: null }));
    valor(await e.registro.invocar('baja:cambiarEstado', { id: p2.id, nuevoEstado: 'RECHAZADO', observacionComite: 'Se repara' }));

    const r = valor(await e.registro.invocar('baja:resumen', { ejercicioId: e.ejercicioId }));
    expect(r.totalPropuestas).toBe(2);
    expect(r.porEstado.PROPUESTO).toBe(1);
    expect(r.porEstado.RECHAZADO).toBe(1);
    // Solo el bien de 10.000.000 sigue propuesto.
    expect(r.valorBrutoTotal).toBe(1_000_000_000);
    expect(r.candidatosSinProponer).toBe(1);
  });

  it('VAL-09-02 exige justificación individual y VAL-09-03 la cotización del inservible', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, bienId, { causal: 'INSERVIBLE' }));

    const v = valor(await e.registro.invocar('validaciones:evaluar', { paso: 9, entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(v.resultados.find((x) => x.codigo === 'VAL-09-02')?.cumple).toBe(true);
    // Inservible sin cotización: bloqueante.
    expect(v.resultados.find((x) => x.codigo === 'VAL-09-03')?.cumple).toBe(false);
    expect(v.puedeAvanzar).toBe(false);

    valor(await e.registro.invocar('baja:actualizar', { id: valor(await e.registro.invocar('baja:listar', { ejercicioId: e.ejercicioId }))[0]!.id, cambios: { costoReparacionEstimado: 900_000_000, valorReposicion: 1_000_000_000 }, justificacion: 'Cotización recibida' }));
    const v2 = valor(await e.registro.invocar('validaciones:evaluar', { paso: 9, entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    expect(v2.resultados.find((x) => x.codigo === 'VAL-09-03')?.cumple).toBe(true);
  });

  it('VAL-09-09 avisa del bien totalmente depreciado pero funcional', async () => {
    const bienId = sembrarBien(e, { codigo: 'B-1', fechaAdquisicion: '2000-01-15', estadoActual: 'BUENO' });
    await calcular(e);
    valor(await e.registro.invocar('bien:activarValidados', { ejercicioId: e.ejercicioId }));
    valor(await proponer(e, bienId));

    const v = valor(await e.registro.invocar('validaciones:evaluar', { paso: 9, entidadId: e.entidadId, ejercicioId: e.ejercicioId }));
    const aviso = v.resultados.find((x) => x.codigo === 'VAL-09-09');
    expect(aviso?.cumple).toBe(false);
    expect(aviso?.detalle).toContain('no es motivo de baja');
  });
});
