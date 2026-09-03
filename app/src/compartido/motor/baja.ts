/**
 * Paso 09 §RN-09-03 y §RN-09-05 — la aritmética de la baja.
 *
 * Dominio puro. Aquí no se decide ninguna baja: se calcula lo que el Comité
 * necesita para decidir. La app registra estados; no ejecuta bajas por sí sola
 * (RN-09-04).
 */
import { comoCentavos, type Centavos } from '../tipos/basicos';
import { decimal, pesos, redondear, type Decimal } from './dinero';
import { calculado, noCalculable, type Resultado } from './resultado';

export interface EntradaReparacion {
  readonly costoReparacionEstimado: Centavos | null;
  readonly valorReposicion: Centavos | null;
  /** `umbral_reparacion_baja_pct` de ANEXO_B §2.5; sugerido 50 %. */
  readonly umbralPct: number;
}

export interface EvaluacionReparacion {
  /** RED-03: se persiste con 4 decimales (`relacion_reparacion_reposicion_x10k`). */
  readonly relacion: Decimal;
  readonly porcentaje: Decimal;
  /** `true` = reparar cuesta tanto que procede la baja por inservible. */
  readonly procedeBaja: boolean;
  readonly recomendacion: string;
}

/**
 * RN-09-03. La frontera es `≥`: con el umbral en 50 %, una reparación que cuesta
 * exactamente la mitad de reponer el bien ya justifica la baja, tal como está
 * escrito. La decisión siempre queda soportada con la cotización, así que sin
 * cotización no hay evaluación: NO_CALCULABLE, nunca un cero que parezca "barato".
 */
export function evaluarReparacion(e: EntradaReparacion): Resultado<EvaluacionReparacion> {
  if (e.costoReparacionEstimado === null) {
    return noCalculable('Falta la cotización de reparación (VAL-09-03).');
  }
  if (e.valorReposicion === null || e.valorReposicion <= 0) {
    return noCalculable('Falta el valor de reposición del bien, o es cero: sin él la relación no significa nada.');
  }
  const relacion = redondear(pesos(e.costoReparacionEstimado).div(pesos(e.valorReposicion)), 4);
  const umbral = decimal(e.umbralPct).div(100);
  const procedeBaja = relacion.gte(umbral);
  return calculado({
    relacion,
    porcentaje: relacion.mul(100),
    procedeBaja,
    recomendacion: procedeBaja
      ? `Repararlo cuesta el ${relacion.mul(100).toFixed(2)} % de reponerlo, por encima del umbral del ${e.umbralPct} %: procede la baja por inservible.`
      : `Repararlo cuesta el ${relacion.mul(100).toFixed(2)} % de reponerlo, por debajo del umbral del ${e.umbralPct} %: se recomienda reparar.`,
  });
}

export interface EntradaEfectoContable {
  /** Saldo final ajustado del paso 06. */
  readonly valorBruto: Centavos;
  readonly depreciacionAsociada: Centavos;
  readonly deterioroAsociado: Centavos;
  /** Lo que la entidad espera recuperar (venta, remate, chatarra). */
  readonly valorSalvamento: Centavos;
}

export interface EfectoContable {
  readonly valorBruto: Centavos;
  readonly depreciacionAsociada: Centavos;
  readonly deterioroAsociado: Centavos;
  readonly valorNeto: Centavos;
  readonly valorRecuperado: Centavos;
  readonly perdidaReconocida: Centavos;
}

/**
 * RN-09-05. El valor neto en libros se reconoce como pérdida, salvo lo que se
 * recupere por salvamento. La pérdida nunca es negativa: si el salvamento supera
 * el valor neto, no hay pérdida —hay una utilidad que el paso 10 trata aparte—.
 */
export function calcularEfectoContableBaja(e: EntradaEfectoContable): EfectoContable {
  const valorNeto = comoCentavos(e.valorBruto - e.depreciacionAsociada - e.deterioroAsociado);
  const perdida = valorNeto - e.valorSalvamento;
  return {
    valorBruto: e.valorBruto,
    depreciacionAsociada: e.depreciacionAsociada,
    deterioroAsociado: e.deterioroAsociado,
    valorNeto,
    valorRecuperado: e.valorSalvamento,
    perdidaReconocida: comoCentavos(perdida > 0 ? perdida : 0),
  };
}
