/**
 * ANEXO_C §4 — deterioro.
 *
 * Aquí solo vive la aritmética. Las tres condiciones para **reconocerlo** —indicio
 * objetivo documentado, concepto de especialista con soporte y valor recuperable
 * estimado, no supuesto— son de proceso y las comprueba el caso de uso, no el
 * motor: son documentos, no números.
 *
 * El deterioro **no revierte automáticamente**: quien tenga que revertirlo lo hace
 * con un registro nuevo y su justificación.
 */
import { comoCentavos, type Centavos } from '../tipos/basicos';

export interface EntradaDeterioro {
  /** Saldo ajustado menos depreciación acumulada, antes de aplicar deterioro. */
  readonly valorNetoAntes: Centavos;
  /** Lo que la entidad espera recuperar del bien, estimado por un especialista. */
  readonly valorRecuperable: Centavos;
}

export interface Deterioro {
  readonly deterioroReconocido: Centavos;
  /** Más de la mitad del valor neto: la app advierte, no bloquea. */
  readonly superaMitadDelValorNeto: boolean;
}

export function calcularDeterioro(e: EntradaDeterioro): Deterioro {
  const diferencia = e.valorNetoAntes - e.valorRecuperable;
  const deterioroReconocido = comoCentavos(diferencia > 0 ? diferencia : 0);
  return {
    deterioroReconocido,
    // Estrictamente mayor: un deterioro de exactamente la mitad no dispara el aviso.
    superaMitadDelValorNeto: deterioroReconocido * 2 > e.valorNetoAntes,
  };
}
