/**
 * T-D-01 — Casos de prueba del motor, ESCRITOS ANTES QUE EL MOTOR.
 *
 * Mitigación de `RG-01`: todos los valores esperados de este archivo salen de
 * `/Teoria` (`ANEXO_C` §2.3, §2.4, §2.6, §2.7, §3.3, §3.4, §4 y la tabla de §11),
 * NUNCA de ejecutar el código. Si un valor esperado se ajusta al resultado del
 * motor, el motor queda validado contra sí mismo y sus errores llegan a
 * resoluciones firmadas por el Gerente de una entidad pública.
 *
 * **Ningún valor esperado se modifica sin una entrada en la bitácora que lo
 * justifique.** Es una regla del proyecto, no una convención de estilo.
 */
import { describe, expect, it } from 'vitest';
import { comoCentavos, comoFechaIso, type Centavos, type FechaIso } from '../tipos/basicos';
import { decimal } from './dinero';
import { calcularObsolescencia, clasificarSemaforo, type UmbralesSemaforo } from './obsolescencia';
import { calcularDepreciacion, fechaInicioDepreciacion, type ParametrosDepreciacion } from './depreciacion';
import { calcularDeterioro } from './deterioro';
import { esCandidatoBaja } from './candidatoBaja';

const f = (iso: string): FechaIso => comoFechaIso(iso);
/** Los importes de `/Teoria` están en pesos; la base y el motor usan centavos. */
const pesos = (v: number): Centavos => comoCentavos(Math.round(v * 100));

/** Los umbrales por defecto de ANEXO_B §2.5. */
const UMBRALES: UmbralesSemaforo = { verde: 0.5, amarillo: 0.8, naranja: 0.99 };

const PARAMETROS: ParametrosDepreciacion = {
  metodoConteoMeses: 'dias_exactos',
  depreciaMesAdquisicion: true,
  usaPuestaEnServicio: false,
  valorResidualPct: 0,
  decimalesCalculo: 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// ANEXO_C §2 — obsolescencia
// ─────────────────────────────────────────────────────────────────────────────

describe('ANEXO_C §2.3 · caso de verificación de obsolescencia', () => {
  const entrada = {
    fechaAdquisicion: f('2015-02-23'),
    fechaCorte: f('2025-06-30'),
    vidaUtilTecnicaAniosClase: decimal(15),
    vidaUtilTecnicaAniosOverride: null,
    umbrales: UMBRALES,
  };

  it('reproduce exactamente las cifras publicadas', () => {
    const r = calcularObsolescencia(entrada);
    if (r.estado !== 'CALCULADO') throw new Error(`se esperaba CALCULADO, llegó ${r.estado}`);

    expect(r.valor.diasTranscurridos).toBe(3_780);
    expect(r.valor.edadActualAnios.toFixed(4)).toBe('10.3491');
    expect(r.valor.indiceObsolescencia.toFixed(4)).toBe('0.6899');
    expect(r.valor.porcentaje.toFixed(2)).toBe('68.99');
    expect(r.valor.aniosRestantes.toFixed(4)).toBe('4.6509');
    // 15 × 365,25 = 5.478,75 días, a mitad del 2030-02-22; RED-06 desempata hacia arriba.
    expect(r.valor.fechaFinVidaUtil).toBe('2030-02-23');
    expect(r.valor.semaforo).toBe('AMARILLO');
    expect(r.valor.vidaUtilAplicadaAnios.toString()).toBe('15');
    expect(r.valor.vidaUtilOverrideAplicado).toBe(false);
  });
});

describe('ANEXO_C §2.4 · casos borde de obsolescencia', () => {
  const base = { fechaCorte: f('2025-06-30'), vidaUtilTecnicaAniosClase: decimal(15), vidaUtilTecnicaAniosOverride: null, umbrales: UMBRALES };

  it('sin fecha de adquisición no calcula', () => {
    const r = calcularObsolescencia({ ...base, fechaAdquisicion: null });
    expect(r.estado).toBe('NO_CALCULABLE');
  });

  it('adquisición posterior al corte es error de datos, no una edad negativa', () => {
    const r = calcularObsolescencia({ ...base, fechaAdquisicion: f('2025-07-01') });
    expect(r.estado).toBe('ERROR_DATOS');
  });

  it('sin vida útil técnica, o con vida útil cero, no es evaluable', () => {
    expect(calcularObsolescencia({ ...base, fechaAdquisicion: f('2015-02-23'), vidaUtilTecnicaAniosClase: null }).estado).toBe('NO_CALCULABLE');
    expect(calcularObsolescencia({ ...base, fechaAdquisicion: f('2015-02-23'), vidaUtilTecnicaAniosClase: decimal(0) }).estado).toBe('NO_CALCULABLE');
  });

  it('el índice mayor que 1 NO se trunca: indica exceso de vida útil', () => {
    // ANEXO_C §11 caso 3: 20 años de edad sobre una vida útil de 15 → ≈ 1,33.
    const r = calcularObsolescencia({ ...base, fechaAdquisicion: f('2005-06-30'), fechaCorte: f('2025-06-30') });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(Number(r.valor.indiceObsolescencia.toFixed(2))).toBeCloseTo(1.33, 2);
    expect(r.valor.semaforo).toBe('ROJO');
    expect(r.valor.aniosRestantes.isNegative()).toBe(true);
  });

  it('el override de vida útil del bien prevalece y queda registrado (RN-03-06)', () => {
    const r = calcularObsolescencia({ ...base, fechaAdquisicion: f('2015-02-23'), vidaUtilTecnicaAniosOverride: decimal(10) });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.vidaUtilAplicadaAnios.toString()).toBe('10');
    expect(r.valor.vidaUtilOverrideAplicado).toBe(true);
    // 10,3491 / 10 = 1,0349 → ROJO, mientras que con la vida útil de la clase era AMARILLO.
    expect(r.valor.indiceObsolescencia.toFixed(4)).toBe('1.0349');
    expect(r.valor.semaforo).toBe('ROJO');
  });
});

describe('ANEXO_C §2.6 · semáforo con fronteras `≤` y sin huecos (CT-04)', () => {
  const casos: readonly [number, string][] = [
    [0, 'VERDE'],
    [0.5, 'VERDE'],
    // 0,5043 quedaba sin semáforo con los rangos publicados en RN-01-05: ese fue el defecto de CT-04.
    [0.5043, 'AMARILLO'],
    [0.8, 'AMARILLO'],
    [0.8001, 'NARANJA'],
    [0.99, 'NARANJA'],
    [1, 'ROJO'],
    [1.33, 'ROJO'],
  ];
  it.each(casos)('índice %s → %s', (indice, esperado) => {
    expect(clasificarSemaforo(decimal(indice), UMBRALES)).toBe(esperado);
  });

  it('los umbrales son parámetros: subirlos cambia la clasificación', () => {
    expect(clasificarSemaforo(decimal(0.7), { verde: 0.75, amarillo: 0.9, naranja: 0.99 })).toBe('VERDE');
  });
});

describe('ANEXO_C §11 casos 1 y 2 · extremos del índice', () => {
  it('caso 1 · adquirido hace exactamente 15 años con vida útil 15 → índice 1,0000 y ROJO', () => {
    // 15 años exactos = 15 × 365,25 = 5.478,75 días; el día 5.479 desde la adquisición.
    const r = calcularObsolescencia({
      fechaAdquisicion: f('2010-06-15'),
      fechaCorte: f('2025-06-15'),
      vidaUtilTecnicaAniosClase: decimal(15),
      vidaUtilTecnicaAniosOverride: null,
      umbrales: UMBRALES,
    });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    // 5.479 días / 365,25 = 15,0007 años → índice 1,0000 al cuarto decimal.
    expect(r.valor.indiceObsolescencia.toFixed(4)).toBe('1.0000');
    expect(r.valor.semaforo).toBe('ROJO');
  });

  it('caso 2 · adquirido en la fecha de corte → índice 0 y VERDE', () => {
    const r = calcularObsolescencia({
      fechaAdquisicion: f('2025-06-30'),
      fechaCorte: f('2025-06-30'),
      vidaUtilTecnicaAniosClase: decimal(15),
      vidaUtilTecnicaAniosOverride: null,
      umbrales: UMBRALES,
    });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.diasTranscurridos).toBe(0);
    expect(r.valor.indiceObsolescencia.isZero()).toBe(true);
    expect(r.valor.semaforo).toBe('VERDE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANEXO_C §3 — depreciación
// ─────────────────────────────────────────────────────────────────────────────

/** El bien de ANEXO_C §3.3: costo 23.739.280, vida útil 180 meses, residual 0 %. */
const BIEN_3_3 = {
  esDepreciable: true,
  costoAdquisicion: pesos(23_739_280),
  adicionesMejoras: comoCentavos(0),
  vidaUtilContableMeses: 180,
  fechaAdquisicion: f('2018-04-27'),
  fechaPuestaServicio: null,
  fechaCorte: f('2025-06-30'),
  deterioroAcumulado: comoCentavos(0),
};

describe('ANEXO_C §3.3 · los tres métodos de conteo sobre el mismo bien', () => {
  it('mes_completo → 86 meses, 11.342.100,44 acumulada, 12.397.179,56 por depreciar', () => {
    const r = calcularDepreciacion({ ...BIEN_3_3, parametros: { ...PARAMETROS, metodoConteoMeses: 'mes_completo' } });
    if (r.estado !== 'CALCULADO') throw new Error(`se esperaba CALCULADO, llegó ${r.estado}`);
    expect(r.valor.mesesTranscurridos.toString()).toBe('86');
    expect(r.valor.depreciacionAcumulada).toBe(pesos(11_342_100.44));
    expect(r.valor.saldoPorDepreciar).toBe(pesos(12_397_179.56));
  });

  it('dias_exactos (por defecto) → 86,1109 meses, 11.356.724,23 acumulada, 12.382.555,77 por depreciar', () => {
    const r = calcularDepreciacion({ ...BIEN_3_3, parametros: PARAMETROS });
    if (r.estado !== 'CALCULADO') throw new Error(`se esperaba CALCULADO, llegó ${r.estado}`);
    expect(r.valor.mesesTranscurridos.toFixed(4)).toBe('86.1109');
    expect(r.valor.depreciacionAcumulada).toBe(pesos(11_356_724.23));
    expect(r.valor.saldoPorDepreciar).toBe(pesos(12_382_555.77));
    // 23.739.280 / 180 = 131.884,89 (§3.3)
    expect(r.valor.depreciacionMensual.toFixed(2)).toBe('131884.89');
    expect(r.valor.baseDepreciable).toBe(pesos(23_739_280));
  });

  it('fraccion_anual da lo mismo que dias_exactos, pero registra su propio método', () => {
    const b = calcularDepreciacion({ ...BIEN_3_3, parametros: { ...PARAMETROS, metodoConteoMeses: 'dias_exactos' } });
    const c = calcularDepreciacion({ ...BIEN_3_3, parametros: { ...PARAMETROS, metodoConteoMeses: 'fraccion_anual' } });
    if (b.estado !== 'CALCULADO' || c.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(c.valor.depreciacionAcumulada).toBe(b.valor.depreciacionAcumulada);
    expect(c.valor.metodoConteoAplicado).toBe('fraccion_anual');
  });

  it('la diferencia entre métodos es la que publica /Teoria: 14.623,79', () => {
    const completo = calcularDepreciacion({ ...BIEN_3_3, parametros: { ...PARAMETROS, metodoConteoMeses: 'mes_completo' } });
    const exactos = calcularDepreciacion({ ...BIEN_3_3, parametros: PARAMETROS });
    if (completo.estado !== 'CALCULADO' || exactos.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(exactos.valor.depreciacionAcumulada - completo.valor.depreciacionAcumulada).toBe(pesos(14_623.79));
  });
});

describe('ANEXO_C §3.2 · fecha de inicio de la depreciación', () => {
  const bien = { fechaAdquisicion: f('2018-04-27'), fechaPuestaServicio: f('2018-09-15') };

  it('por defecto es la fecha de adquisición', () => {
    expect(fechaInicioDepreciacion(bien, { usaPuestaEnServicio: false, depreciaMesAdquisicion: true })).toBe('2018-04-27');
  });

  it('con `usa_puesta_en_servicio` usa la puesta en servicio cuando existe', () => {
    expect(fechaInicioDepreciacion(bien, { usaPuestaEnServicio: true, depreciaMesAdquisicion: true })).toBe('2018-09-15');
    expect(fechaInicioDepreciacion({ ...bien, fechaPuestaServicio: null }, { usaPuestaEnServicio: true, depreciaMesAdquisicion: true })).toBe('2018-04-27');
  });

  it('si NO deprecia el mes de adquisición, arranca el primer día del mes siguiente', () => {
    expect(fechaInicioDepreciacion(bien, { usaPuestaEnServicio: false, depreciaMesAdquisicion: false })).toBe('2018-05-01');
  });
});

describe('ANEXO_C §3.4 · casos borde de depreciación', () => {
  it('clase no depreciable (terreno) → NO_APLICA, no un cero silencioso (§11 caso 7)', () => {
    const r = calcularDepreciacion({ ...BIEN_3_3, esDepreciable: false, parametros: PARAMETROS });
    expect(r.estado).toBe('NO_APLICA');
  });

  it('sin costo, o con costo cero, no se calcula (§11 casos 5 y 6)', () => {
    expect(calcularDepreciacion({ ...BIEN_3_3, costoAdquisicion: null, parametros: PARAMETROS }).estado).toBe('NO_CALCULABLE');
    expect(calcularDepreciacion({ ...BIEN_3_3, costoAdquisicion: comoCentavos(0), parametros: PARAMETROS }).estado).toBe('NO_CALCULABLE');
  });

  it('sin fecha de adquisición no se calcula', () => {
    expect(calcularDepreciacion({ ...BIEN_3_3, fechaAdquisicion: null, parametros: PARAMETROS }).estado).toBe('NO_CALCULABLE');
  });

  it('sin vida útil contable es error de parametrización de la clase, no falta de dato del bien', () => {
    expect(calcularDepreciacion({ ...BIEN_3_3, vidaUtilContableMeses: null, parametros: PARAMETROS }).estado).toBe('ERROR_DATOS');
    expect(calcularDepreciacion({ ...BIEN_3_3, vidaUtilContableMeses: 0, parametros: PARAMETROS }).estado).toBe('ERROR_DATOS');
  });

  it('bien totalmente depreciado: tope en la base y saldo igual al residual (§11 caso 4)', () => {
    // 240 meses de vida útil, adquirido hace 30 años, con 10 % de residual.
    const r = calcularDepreciacion({
      ...BIEN_3_3,
      vidaUtilContableMeses: 240,
      fechaAdquisicion: f('1995-06-30'),
      parametros: { ...PARAMETROS, valorResidualPct: 10 },
    });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.totalmenteDepreciado).toBe(true);
    expect(r.valor.depreciacionAcumulada).toBe(r.valor.baseDepreciable);
    // saldo por depreciar = saldo ajustado − base = valor residual
    expect(r.valor.saldoPorDepreciar).toBe(r.valor.valorResidual);
    expect(r.valor.valorResidual).toBe(pesos(2_373_928));
    expect(r.valor.porcentajeDepreciado.toFixed(4)).toBe('1.0000');
  });

  it('bien adquirido en la fecha de corte: 0 meses si deprecia el mes, ninguno si no (§11 caso 2)', () => {
    const mismoDia = { ...BIEN_3_3, fechaAdquisicion: f('2025-06-30') };
    const conMes = calcularDepreciacion({ ...mismoDia, parametros: { ...PARAMETROS, metodoConteoMeses: 'mes_completo' } });
    if (conMes.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(conMes.valor.mesesTranscurridos.toString()).toBe('0');
    expect(conMes.valor.depreciacionAcumulada).toBe(0);

    // Sin depreciar el mes de adquisición, el inicio cae después del corte.
    const sinMes = calcularDepreciacion({ ...mismoDia, parametros: { ...PARAMETROS, depreciaMesAdquisicion: false } });
    if (sinMes.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(sinMes.valor.depreciacionAcumulada).toBe(0);
    expect(sinMes.valor.saldoPorDepreciar).toBe(sinMes.valor.saldoFinalAjustado);
  });

  it('adiciones y mejoras entran a la base depreciable (§3.6 simplificado, §11 caso 11)', () => {
    const r = calcularDepreciacion({ ...BIEN_3_3, adicionesMejoras: pesos(1_260_720), parametros: PARAMETROS });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.saldoFinalAjustado).toBe(pesos(25_000_000));
    expect(r.valor.baseDepreciable).toBe(pesos(25_000_000));
  });

  it('el valor residual sale del saldo ajustado, no del costo pelado', () => {
    const r = calcularDepreciacion({ ...BIEN_3_3, adicionesMejoras: pesos(1_260_720), parametros: { ...PARAMETROS, valorResidualPct: 10 } });
    if (r.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(r.valor.valorResidual).toBe(pesos(2_500_000));
    expect(r.valor.baseDepreciable).toBe(pesos(22_500_000));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANEXO_C §4 — deterioro
// ─────────────────────────────────────────────────────────────────────────────

describe('ANEXO_C §4 · deterioro', () => {
  it('es la diferencia contra el valor recuperable, y nunca negativo', () => {
    expect(calcularDeterioro({ valorNetoAntes: pesos(10_000_000), valorRecuperable: pesos(6_000_000) }).deterioroReconocido).toBe(pesos(4_000_000));
    expect(calcularDeterioro({ valorNetoAntes: pesos(10_000_000), valorRecuperable: pesos(12_000_000) }).deterioroReconocido).toBe(0);
  });

  it('un deterioro superior al 50 % del valor neto genera advertencia', () => {
    expect(calcularDeterioro({ valorNetoAntes: pesos(10_000_000), valorRecuperable: pesos(4_000_000) }).superaMitadDelValorNeto).toBe(true);
    expect(calcularDeterioro({ valorNetoAntes: pesos(10_000_000), valorRecuperable: pesos(5_000_000) }).superaMitadDelValorNeto).toBe(false);
  });

  it('reduce el valor neto en libros pero NO toca la depreciación acumulada (§11 caso 12)', () => {
    const sin = calcularDepreciacion({ ...BIEN_3_3, parametros: PARAMETROS });
    const con = calcularDepreciacion({ ...BIEN_3_3, deterioroAcumulado: pesos(1_000_000), parametros: PARAMETROS });
    if (sin.estado !== 'CALCULADO' || con.estado !== 'CALCULADO') throw new Error('se esperaba CALCULADO');
    expect(con.valor.depreciacionAcumulada).toBe(sin.valor.depreciacionAcumulada);
    expect(con.valor.valorNetoLibros).toBe(sin.valor.valorNetoLibros - pesos(1_000_000));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANEXO_C §2.7 — candidato a baja
// ─────────────────────────────────────────────────────────────────────────────

describe('ANEXO_C §2.7 · criterio de candidato a baja', () => {
  const base = {
    indiceObsolescencia: decimal(0.5),
    estadoActual: 'BUENO' as const,
    estadoOperativo: 'OPERATIVO' as const,
    obsolescenciaFuncional: false,
    tieneMantenimientoCorrectivoFallido: false,
    umbralAmarillo: 0.8,
  };

  it('un bien nuevo y en buen estado no es candidato', () => {
    expect(esCandidatoBaja(base).esCandidato).toBe(false);
  });

  it('el índice ≥ 1 lo hace candidato por sí solo', () => {
    const r = esCandidatoBaja({ ...base, indiceObsolescencia: decimal(1) });
    expect(r.esCandidato).toBe(true);
    expect(r.motivos.join(' ')).toContain('vida útil');
  });

  it('pasado el umbral amarillo, el mal estado lo hace candidato', () => {
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: decimal(0.85), estadoActual: 'MALO' }).esCandidato).toBe(true);
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: decimal(0.85), estadoActual: 'INSERVIBLE' }).esCandidato).toBe(true);
    // Mismo índice, buen estado: no basta.
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: decimal(0.85) }).esCandidato).toBe(false);
    // Mal estado pero por debajo del umbral: tampoco.
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: decimal(0.7), estadoActual: 'MALO' }).esCandidato).toBe(false);
  });

  it('la obsolescencia funcional basta, aunque el índice sea bajo', () => {
    expect(esCandidatoBaja({ ...base, obsolescenciaFuncional: true }).esCandidato).toBe(true);
  });

  it('no operativo con correctivo fallido es candidato; no operativo a secas, no', () => {
    expect(esCandidatoBaja({ ...base, estadoOperativo: 'NO_OPERATIVO', tieneMantenimientoCorrectivoFallido: true }).esCandidato).toBe(true);
    expect(esCandidatoBaja({ ...base, estadoOperativo: 'NO_OPERATIVO' }).esCandidato).toBe(false);
  });

  it('sin índice calculado, los demás criterios siguen aplicando', () => {
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: null }).esCandidato).toBe(false);
    expect(esCandidatoBaja({ ...base, indiceObsolescencia: null, obsolescenciaFuncional: true }).esCandidato).toBe(true);
  });

  it('acumula todos los motivos que se cumplen, no solo el primero', () => {
    const r = esCandidatoBaja({
      ...base,
      indiceObsolescencia: decimal(1.2),
      estadoActual: 'INSERVIBLE',
      estadoOperativo: 'NO_OPERATIVO',
      tieneMantenimientoCorrectivoFallido: true,
    });
    expect(r.motivos.length).toBeGreaterThanOrEqual(3);
  });
});
