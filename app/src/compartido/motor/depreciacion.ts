/**
 * ANEXO_C §3 — depreciación en línea recta (paso 06).
 *
 * Dominio puro. El dinero entra y sale en **centavos** (ADR-006); los cálculos
 * intermedios van en `Decimal` a máxima precisión (RED-01) y solo se redondea al
 * persistir (RED-02, RED-06 desempata hacia arriba).
 *
 * El método de conteo de meses es "el punto crítico de todo el sistema" (§3.3):
 * el resultado registra cuál se aplicó, porque cambiarlo obliga a recalcular el
 * ejercicio completo y las cifras dejan de cuadrar con contabilidad.
 */
import { comoCentavos, type Centavos, type FechaIso } from '../tipos/basicos';
import type { MetodoConteoMeses } from '../enums/parametros';
import { aCentavos, decimal, pesos, redondear, type Decimal } from './dinero';
import { compararFechas, contarMeses, primerDiaMesSiguiente } from './fechas';
import { calculado, errorDatos, noAplica, noCalculable, type Resultado } from './resultado';

/** El subconjunto de `ParametrosCalculo` que la depreciación necesita. */
export interface ParametrosDepreciacion {
  readonly metodoConteoMeses: MetodoConteoMeses;
  readonly depreciaMesAdquisicion: boolean;
  readonly usaPuestaEnServicio: boolean;
  readonly valorResidualPct: number;
  readonly decimalesCalculo: number;
}

export interface EntradaDepreciacion {
  readonly esDepreciable: boolean;
  readonly costoAdquisicion: Centavos | null;
  readonly adicionesMejoras: Centavos;
  readonly vidaUtilContableMeses: number | null;
  readonly fechaAdquisicion: FechaIso | null;
  readonly fechaPuestaServicio: FechaIso | null;
  readonly fechaCorte: FechaIso;
  /** Ya reconocido en ejercicios anteriores; resta al valor neto, no a la depreciación (§4). */
  readonly deterioroAcumulado: Centavos;
  readonly parametros: ParametrosDepreciacion;
}

export interface Depreciacion {
  readonly saldoFinalAjustado: Centavos;
  readonly valorResidual: Centavos;
  readonly baseDepreciable: Centavos;
  /** En pesos y sin redondear: es un intermedio (RED-01), no un importe contable. */
  readonly depreciacionMensual: Decimal;
  readonly mesesTranscurridos: Decimal;
  readonly metodoConteoAplicado: MetodoConteoMeses;
  readonly fechaInicioDepreciacion: FechaIso;
  readonly depreciacionAcumulada: Centavos;
  readonly saldoPorDepreciar: Centavos;
  readonly valorNetoLibros: Centavos;
  readonly porcentajeDepreciado: Decimal;
  readonly totalmenteDepreciado: boolean;
}

/** ANEXO_C §3.2. */
export function fechaInicioDepreciacion(
  bien: { readonly fechaAdquisicion: FechaIso; readonly fechaPuestaServicio: FechaIso | null },
  parametros: { readonly usaPuestaEnServicio: boolean; readonly depreciaMesAdquisicion: boolean },
): FechaIso {
  const base = parametros.usaPuestaEnServicio && bien.fechaPuestaServicio !== null ? bien.fechaPuestaServicio : bien.fechaAdquisicion;
  return parametros.depreciaMesAdquisicion ? base : primerDiaMesSiguiente(base);
}

export function calcularDepreciacion(e: EntradaDepreciacion): Resultado<Depreciacion> {
  const p = e.parametros;

  if (!e.esDepreciable) {
    // Un terreno no se deprecia, pero sí entra en la consolidación patrimonial
    // (§3.4, §11 caso 7): por eso NO_APLICA y no un cero indistinguible.
    return noAplica('La clase no es depreciable.');
  }
  if (e.costoAdquisicion === null || e.costoAdquisicion <= 0) {
    // RN-03-02: el cero es dato faltante, no un bien gratuito.
    return noCalculable('Falta el costo de adquisición (RN-03-01, RN-03-02).');
  }
  if (e.fechaAdquisicion === null) {
    return noCalculable('Falta la fecha de adquisición (RN-03-01).');
  }
  if (e.vidaUtilContableMeses === null || e.vidaUtilContableMeses <= 0) {
    // Esto no lo arregla el hospital corrigiendo el bien: hay que corregir la clase.
    return errorDatos('La clase no tiene vida útil contable en meses.');
  }

  const saldoAjustado = comoCentavos(e.costoAdquisicion + e.adicionesMejoras);
  // El residual se calcula sobre el saldo AJUSTADO, no sobre el costo pelado (§3.1).
  const valorResidual = aCentavos(pesos(saldoAjustado).mul(p.valorResidualPct).div(100));
  const baseDepreciable = comoCentavos(saldoAjustado - valorResidual);
  const basePesos = pesos(baseDepreciable);
  const depreciacionMensual = basePesos.div(e.vidaUtilContableMeses);

  const inicio = fechaInicioDepreciacion({ fechaAdquisicion: e.fechaAdquisicion, fechaPuestaServicio: e.fechaPuestaServicio }, p);

  // §3.5: si la depreciación arranca después del corte, todavía no hay nada que depreciar.
  const meses = compararFechas(inicio, e.fechaCorte) > 0 ? decimal(0) : contarMeses(inicio, e.fechaCorte, p.metodoConteoMeses);

  // §3.4: tope en la base depreciable; nunca se deprecia por debajo del residual.
  const sinTope = depreciacionMensual.mul(meses);
  const acumuladaExacta = sinTope.gt(basePesos) ? basePesos : sinTope;
  const depreciacionAcumulada = aCentavos(redondear(acumuladaExacta, p.decimalesCalculo));
  const saldoPorDepreciar = comoCentavos(saldoAjustado - depreciacionAcumulada);

  return calculado({
    saldoFinalAjustado: saldoAjustado,
    valorResidual,
    baseDepreciable,
    depreciacionMensual,
    mesesTranscurridos: meses,
    metodoConteoAplicado: p.metodoConteoMeses,
    fechaInicioDepreciacion: inicio,
    depreciacionAcumulada,
    saldoPorDepreciar,
    // §4: el deterioro reduce el valor neto pero NO la depreciación acumulada.
    valorNetoLibros: comoCentavos(saldoAjustado - depreciacionAcumulada - e.deterioroAcumulado),
    // Con residual del 100 % no hay base: se considera agotada, sin dividir por cero.
    porcentajeDepreciado: baseDepreciable === 0 ? decimal(1) : pesos(depreciacionAcumulada).div(basePesos),
    totalmenteDepreciado: depreciacionAcumulada >= baseDepreciable,
  });
}
