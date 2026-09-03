/**
 * ANEXO_C §2 — edad, índice de obsolescencia y semáforo (paso 05).
 *
 * Dominio puro: sin `fs`, `electron`, `sqlite`, `react` ni `Date`. Quien llama
 * resuelve la base de datos y entrega aquí valores ya desnudos.
 *
 * El divisor 365,25 compensa los años bisiestos y es el que produce las cifras
 * de referencia. **No se cambia sin recalcular todo el histórico** (§2.2).
 */
import type { FechaIso } from '../tipos/basicos';
import type { Semaforo } from '../enums/catalogos';
import { decimal, redondear, type Decimal } from './dinero';
import { DIAS_POR_ANIO, compararFechas, diferenciaEnDias, sumarDias } from './fechas';
import { calculado, errorDatos, noCalculable, type Resultado } from './resultado';

/** Fracciones de índice, no porcentajes: ANEXO_B §2.5 las define entre 0 y 1. */
export interface UmbralesSemaforo {
  readonly verde: number;
  readonly amarillo: number;
  readonly naranja: number;
}

export interface EntradaObsolescencia {
  readonly fechaAdquisicion: FechaIso | null;
  readonly fechaCorte: FechaIso;
  /** Vida útil técnica del catálogo de clases (años, con decimales). */
  readonly vidaUtilTecnicaAniosClase: Decimal | null;
  /** Override a nivel de bien (RN-03-06); si existe, prevalece. */
  readonly vidaUtilTecnicaAniosOverride: Decimal | null;
  readonly umbrales: UmbralesSemaforo;
}

export interface Obsolescencia {
  readonly diasTranscurridos: number;
  /** RED-03: índices y factores con 4 decimales. */
  readonly edadActualAnios: Decimal;
  readonly indiceObsolescencia: Decimal;
  readonly porcentaje: Decimal;
  /** Negativo cuando el bien ya superó su vida útil; no se trunca (§2.4). */
  readonly aniosRestantes: Decimal;
  readonly fechaFinVidaUtil: FechaIso;
  readonly semaforo: Semaforo;
  readonly vidaUtilAplicadaAnios: Decimal;
  /** Para poder decir en el informe cuál vida útil se usó y por qué. */
  readonly vidaUtilOverrideAplicado: boolean;
}

const DECIMALES_INDICE = 4;

/**
 * ANEXO_C §2.6 con las fronteras `≤` que fijó CT-04: sin huecos entre rangos.
 *
 * Los tres umbrales son parámetros (CT-04: "los tres umbrales siguen siendo
 * parámetros configurables"), incluido el naranja. `validarUmbrales` obliga a
 * que el naranja sea menor que 1, así que un índice ≥ 1 siempre cae en ROJO,
 * que es lo que exige el pseudocódigo de §2.6 y el caso 1 de §11. Ver CT-20.
 */
export function clasificarSemaforo(indice: Decimal, umbrales: UmbralesSemaforo): Semaforo {
  if (indice.lte(umbrales.verde)) return 'VERDE';
  if (indice.lte(umbrales.amarillo)) return 'AMARILLO';
  if (indice.lte(umbrales.naranja)) return 'NARANJA';
  return 'ROJO';
}

export function calcularObsolescencia(e: EntradaObsolescencia): Resultado<Obsolescencia> {
  if (e.fechaAdquisicion === null) {
    return noCalculable('Falta la fecha de adquisición (RN-03-01).');
  }
  if (compararFechas(e.fechaAdquisicion, e.fechaCorte) > 0) {
    return errorDatos('La fecha de adquisición es posterior a la fecha de corte: no se calcula una edad negativa.');
  }

  const override = e.vidaUtilTecnicaAniosOverride;
  const vidaUtil = override ?? e.vidaUtilTecnicaAniosClase;
  if (vidaUtil === null || vidaUtil.lte(0)) {
    return noCalculable('La clase no tiene vida útil técnica y el bien no la sobrescribe.');
  }

  const dias = diferenciaEnDias(e.fechaAdquisicion, e.fechaCorte);
  // RED-01: la edad exacta alimenta el índice; el redondeo es solo de salida.
  const edadExacta = decimal(dias).div(DIAS_POR_ANIO);
  const indice = redondear(edadExacta.div(vidaUtil), DECIMALES_INDICE);

  // §2.3: 15 × 365,25 = 5.478,75 días cae a mitad de día; RED-06 desempata hacia arriba.
  const diasVidaUtil = redondear(vidaUtil.mul(DIAS_POR_ANIO), 0).toNumber();

  return calculado({
    diasTranscurridos: dias,
    edadActualAnios: redondear(edadExacta, DECIMALES_INDICE),
    indiceObsolescencia: indice,
    porcentaje: indice.mul(100),
    aniosRestantes: redondear(vidaUtil.minus(edadExacta), DECIMALES_INDICE),
    fechaFinVidaUtil: sumarDias(e.fechaAdquisicion, diasVidaUtil),
    semaforo: clasificarSemaforo(indice, e.umbrales),
    vidaUtilAplicadaAnios: vidaUtil,
    vidaUtilOverrideAplicado: override !== null,
  });
}
