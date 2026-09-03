/**
 * Semillas de arranque (plan 4.3 §4): sugerencias que se COPIAN a la base al
 * crear la entidad y desde entonces le pertenecen. Actualizar la aplicación no
 * altera los catálogos de un hospital ya configurado.
 */
import clasesJson from '../../../../recursos/semillas/clases_sugeridas.json';
import abreviaturasJson from '../../../../recursos/semillas/abreviaturas.json';
import subcuentasJson from '../../../../recursos/semillas/subcuentas.json';
import parametrosJson from '../../../../recursos/semillas/parametros_defecto.json';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../../../compartido/parametros/parametrosCalculo';

export interface ClaseSugerida {
  readonly codigo: string;
  readonly nombre: string;
  readonly subcuentaContable: string;
  readonly vidaUtilContableMeses: number | null;
  readonly vidaUtilTecnicaAnios: number | null;
  readonly esDepreciable: boolean;
  readonly requiereHojaVida: boolean;
  readonly requiereInvima: boolean;
  readonly responsableTecnico: string;
}

export const CLASES_SUGERIDAS: readonly ClaseSugerida[] = clasesJson.clases;
export const ABREVIATURAS_SUGERIDAS: readonly { abreviatura: string; descripcion: string }[] = abreviaturasJson.abreviaturas;
export const SUBCUENTAS_SUGERIDAS: readonly { codigo: string; nombre: string }[] = subcuentasJson.subcuentas;
export const PARAMETROS_SEMILLA: ParametrosCalculo = EsquemaParametrosCalculo.parse(parametrosJson.parametros);
