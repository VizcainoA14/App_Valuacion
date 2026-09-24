/**
 * Candidatos a baja de un corte y registro de las bajas (ADR-028).
 *
 * Lo que se comprueba aquí es que la app **señale sin decidir** —los motivos
 * del motor quedan con el corte— y **registre sin exigir el trámite externo**:
 * ni comité, ni acta, ni resolución. Lo que sí exige es una justificación
 * individual de verdad (RN-09-06), y que una baja equivocada se anule en vez
 * de borrarse.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { arnesPaso01, PROCESO_PRUEBA, valor } from '../configuracion/pruebas';
import type { Arnes } from '../configuracion/pruebas';
import { nuevoId } from '../../infraestructura/db/identificadores';

const FECHA_CORTE = '2025-06-30';

interface Escenario extends Arnes {
  procesoId: string;
  claseId: string;
  servicioId: string;
}

async function escenario(): Promise<Escenario> {
  const a = await arnesPaso01({ hoy: '2025-09-02' });
  const entidad = valor(await a.registro.invocar('proceso:crear', { ...PROCESO_PRUEBA, precargarSemillas: false }));
  const clase = valor(
    await a.registro.invocar('clase:crear', {
      procesoId: entidad.id,
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
  const sede = valor(await a.registro.invocar('sede:crear', { procesoId: entidad.id, codigo: '01', nombre: 'Principal', direccion: 'Calle 1', municipio: 'Popayán', activa: true }));
  const servicio = valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'LAB', nombre: 'Laboratorio', tipo: 'asistencial', responsable: null, activo: true }));
  return { ...a, procesoId: entidad.id, claseId: clase.id, servicioId: servicio.id };
}

/** Bien con hoja de vida, sembrado por SQL; el camino de importación ya tiene pruebas. */
function sembrarBien(e: Escenario, datos: { codigo: string; fechaAdquisicion?: string; estadoActual?: string; costoPesos?: number; estadoOperativo?: string }): string {
  const id = nuevoId();
  const sedeId = (e.sqlite.prepare('SELECT sede_id FROM servicio WHERE id = ?').get(e.servicioId) as { sede_id: string }).sede_id;
  const ahora = e.ctx.ahoraIso();
  e.sqlite
    .prepare(
      `INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id,
                         sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, fecha_toma,
                         funcionario_conteo, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, 'MONITOR DE SIGNOS VITALES', ?, ?, ?, 1, ?, 'PROPIO', ?, 'TECNICO', ?, ?)`,
    )
    .run(id, e.procesoId, datos.codigo, `P-${datos.codigo}`, e.claseId, sedeId, e.servicioId, datos.estadoActual ?? 'BUENO', FECHA_CORTE, ahora, ahora);
  e.sqlite
    .prepare(
      `INSERT INTO hoja_vida (id, bien_id, estado_operativo, forma_adquisicion, fecha_adquisicion,
                              costo_adquisicion_cent, adiciones_mejoras_cent, creado_en, actualizado_en)
       VALUES (?, ?, ?, 'COMPRA', ?, ?, 0, ?, ?)`,
    )
    .run(nuevoId(), id, datos.estadoOperativo ?? 'OPERATIVO', datos.fechaAdquisicion ?? '2010-01-15', Math.round((datos.costoPesos ?? 10_000_000) * 100), ahora, ahora);
  return id;
}

async function calcular(e: Escenario): Promise<string> {
  return valor(await e.registro.invocar('calculo:ejecutar', { procesoId: e.procesoId, fechaCorte: FECHA_CORTE, descripcion: null })).corte.id;
}

const JUSTIFICACION = 'Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición.';

let e: Escenario;
beforeEach(async () => {
  e = await escenario();
});

describe('baja:candidatos · lo que el motor señaló en un corte', () => {
  it('lista los candidatos del corte, los más obsoletos primero, con sus motivos', async () => {
    sembrarBien(e, { codigo: 'NUEVO', fechaAdquisicion: '2024-01-15' });
    sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2010-01-15' });
    sembrarBien(e, { codigo: 'ROTO', fechaAdquisicion: '2016-01-15', estadoActual: 'INSERVIBLE', estadoOperativo: 'FUERA_SERVICIO' });
    const corteId = await calcular(e);

    const c = valor(await e.registro.invocar('baja:candidatos', { corteId }));
    expect(c.map((x) => x.codigoInstitucional)).toEqual(['VIEJO', 'ROTO']);
    // Nunca "el sistema lo marcó": cada candidato trae por qué.
    for (const x of c) expect(x.motivos.length).toBeGreaterThan(0);
    expect(c.find((x) => x.codigoInstitucional === 'VIEJO')?.causalSugerida).toBe('OBSOLESCENCIA');
    expect(c.find((x) => x.codigoInstitucional === 'ROTO')?.causalSugerida).toBe('INSERVIBLE');
  });

  it('los motivos son los del día del corte, aunque el bien cambie después', async () => {
    const roto = sembrarBien(e, { codigo: 'ROTO', fechaAdquisicion: '2016-01-15', estadoActual: 'INSERVIBLE' });
    const corteId = await calcular(e);
    const antes = valor(await e.registro.invocar('baja:candidatos', { corteId }))[0]?.motivos;
    expect(antes?.join(' ')).toContain('INSERVIBLE');
    e.sqlite.prepare(`UPDATE bien SET estado_actual = 'BUENO' WHERE id = ?`).run(roto);
    expect(valor(await e.registro.invocar('baja:candidatos', { corteId }))[0]?.motivos).toEqual(antes);
  });

  it('por defecto oculta los que ya se dieron de baja', async () => {
    const viejo = sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2010-01-15' });
    const corteId = await calcular(e);
    valor(await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'OBSOLESCENCIA', justificacion: JUSTIFICACION, referencia: null }));
    expect(valor(await e.registro.invocar('baja:candidatos', { corteId }))).toHaveLength(0);
    const todos = valor(await e.registro.invocar('baja:candidatos', { corteId, incluirYaDadosDeBaja: true }));
    expect(todos[0]?.estadoRegistro).toBe('DADO_DE_BAJA');
  });
});

describe('baja:registrar · la app anota lo que el hospital decidió', () => {
  it('registra sin comité ni acta, y el bien sale de los cortes siguientes', async () => {
    sembrarBien(e, { codigo: 'OTRO', fechaAdquisicion: '2020-01-15' });
    const viejo = sembrarBien(e, { codigo: 'VIEJO', fechaAdquisicion: '2010-01-15' });
    const baja = valor(
      await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'OBSOLESCENCIA', justificacion: JUSTIFICACION, referencia: 'Resolución 045 de 2025' }),
    );
    expect(baja).toMatchObject({ codigoInstitucional: 'VIEJO', causal: 'OBSOLESCENCIA', referencia: 'Resolución 045 de 2025', anuladaEn: null });
    expect(valor(await e.registro.invocar('bien:porId', { id: viejo }))?.estadoRegistro).toBe('DADO_DE_BAJA');

    const r = valor(await e.registro.invocar('calculo:ejecutar', { procesoId: e.procesoId, fechaCorte: FECHA_CORTE, descripcion: null }));
    expect(r.resumen.bienesConsiderados).toBe(1);
    expect(valor(await e.registro.invocar('baja:listar', { procesoId: e.procesoId }))).toHaveLength(1);
  });

  it('exige una justificación individual (RN-09-06)', async () => {
    const viejo = sembrarBien(e, { codigo: 'VIEJO' });
    for (const generica of ['Obsoleto', 'dañado', 'N/A', 'no sirve']) {
      const r = await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'OBSOLESCENCIA', justificacion: generica, referencia: null });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.codigo).toBe('JUSTIFICACION_GENERICA');
    }
  });

  it('no registra dos veces el mismo bien ni una fecha futura', async () => {
    const viejo = sembrarBien(e, { codigo: 'VIEJO' });
    const futura = await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2099-01-01', causal: 'DESUSO', justificacion: JUSTIFICACION, referencia: null });
    expect(futura.ok).toBe(false);
    valor(await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'DESUSO', justificacion: JUSTIFICACION, referencia: null }));
    const otra = await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-16', causal: 'DESUSO', justificacion: JUSTIFICACION, referencia: null });
    expect(otra.ok).toBe(false);
    if (!otra.ok) expect(otra.error.codigo).toBe('BIEN_YA_DADO_DE_BAJA');
  });
});

describe('baja:anular · un error se deshace, no se borra', () => {
  it('el bien vuelve a ACTIVO y la baja anulada queda en el historial', async () => {
    const viejo = sembrarBien(e, { codigo: 'VIEJO' });
    const baja = valor(await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'DESUSO', justificacion: JUSTIFICACION, referencia: null }));
    const anulada = valor(await e.registro.invocar('baja:anular', { id: baja.id, motivo: 'Se registró sobre el bien equivocado' }));
    expect(anulada.anuladaEn).not.toBeNull();
    expect(valor(await e.registro.invocar('bien:porId', { id: viejo }))?.estadoRegistro).toBe('ACTIVO');

    expect(valor(await e.registro.invocar('baja:listar', { procesoId: e.procesoId }))).toHaveLength(0);
    expect(valor(await e.registro.invocar('baja:listar', { procesoId: e.procesoId, incluirAnuladas: true }))).toHaveLength(1);

    const otra = await e.registro.invocar('baja:anular', { id: baja.id, motivo: 'Otra vez' });
    expect(otra.ok).toBe(false);
  });

  it('registrar y anular quedan en la bitácora con su justificación', async () => {
    const viejo = sembrarBien(e, { codigo: 'VIEJO' });
    const baja = valor(await e.registro.invocar('baja:registrar', { bienId: viejo, fecha: '2025-07-15', causal: 'DESUSO', justificacion: JUSTIFICACION, referencia: null }));
    valor(await e.registro.invocar('baja:anular', { id: baja.id, motivo: 'Se registró sobre el bien equivocado' }));
    const filas = e.sqlite.prepare(`SELECT accion, justificacion FROM bitacora WHERE registro_id = ? ORDER BY rowid`).all(baja.id) as { accion: string; justificacion: string }[];
    expect(filas.map((f) => f.accion)).toEqual(['CREAR', 'ACTUALIZAR']);
    expect(filas[1]?.justificacion).toContain('equivocado');
  });
});
