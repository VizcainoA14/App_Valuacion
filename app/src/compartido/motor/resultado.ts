/**
 * Los cuatro desenlaces que distingue `ANEXO_C` (§2.5, §3.5). Se separan porque
 * significan cosas distintas para el hospital y no deben colapsarse en un cero:
 *
 *   NO_APLICA      la regla no le corresponde a este bien (un terreno no se deprecia)
 *   NO_CALCULABLE  falta un dato del bien (RN-03-01: sin fecha o sin costo)
 *   ERROR_DATOS    hay un dato imposible o mal parametrizado (adquisición posterior
 *                  al corte; una clase sin vida útil)
 *
 * Un bien NO_CALCULABLE se excluye de los totales y aparece en el listado de
 * pendientes; uno con ERROR_DATOS exige corregir la parametrización antes de
 * cerrar. Devolver 0 en cualquiera de los dos casos escondería el problema dentro
 * de una cifra que después se firma.
 */
export type MotivoNoCalculado = 'NO_APLICA' | 'NO_CALCULABLE' | 'ERROR_DATOS';

export type Resultado<T> =
  | { readonly estado: 'CALCULADO'; readonly valor: T }
  | { readonly estado: MotivoNoCalculado; readonly motivo: string };

export function calculado<T>(valor: T): Resultado<T> {
  return { estado: 'CALCULADO', valor };
}

export function noAplica<T>(motivo: string): Resultado<T> {
  return { estado: 'NO_APLICA', motivo };
}

export function noCalculable<T>(motivo: string): Resultado<T> {
  return { estado: 'NO_CALCULABLE', motivo };
}

export function errorDatos<T>(motivo: string): Resultado<T> {
  return { estado: 'ERROR_DATOS', motivo };
}
