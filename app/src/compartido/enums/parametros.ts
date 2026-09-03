/**
 * Valores de los parámetros de cálculo de `ANEXO_B` §2.5. En minúsculas,
 * exactamente como los declara el anexo (se persisten serializados en
 * `parametro_calculo.valor` y viajan a `ejercicio.parametros_congelados`).
 */
import { definirCatalogo, type ValoresDe } from './definirCatalogo';

/** ANEXO_C §3.3: el punto crítico del sistema; se fija por acta (CT-02). */
export const METODO_CONTEO_MESES = definirCatalogo('metodo_conteo_meses', 'ANEXO_B §2.5 · ANEXO_C §3.3', {
  mes_completo: 'Mes completo (método A)',
  dias_exactos: 'Días exactos (método B)',
  fraccion_anual: 'Fracción anual (método C)',
});
export type MetodoConteoMeses = ValoresDe<typeof METODO_CONTEO_MESES>;

export const METODO_DEPRECIACION = definirCatalogo('metodo_depreciacion', 'ANEXO_B §2.5', {
  linea_recta: 'Línea recta',
});
export type MetodoDepreciacion = ValoresDe<typeof METODO_DEPRECIACION>;

export const ENFOQUE_ADICIONES = definirCatalogo('enfoque_adiciones', 'ANEXO_B §2.5 · ANEXO_C §3.6', {
  simplificado: 'Simplificado',
  componente_separado: 'Componente separado',
});
export type EnfoqueAdiciones = ValoresDe<typeof ENFOQUE_ADICIONES>;

export const BASE_COMPARACION_AVALUO = definirCatalogo('base_comparacion_avaluo', 'ANEXO_B §2.5 · CT-03', {
  valor_neto_libros: 'Valor neto en libros',
  saldo_por_depreciar: 'Saldo por depreciar',
});
export type BaseComparacionAvaluo = ValoresDe<typeof BASE_COMPARACION_AVALUO>;

export const TIPO_DATO_PARAMETRO = definirCatalogo('tipo_dato_parametro', 'ANEXO_B §2.5', {
  texto: 'Texto',
  numero: 'Número',
  booleano: 'Booleano',
  enum: 'Enumeración',
});
export type TipoDatoParametro = ValoresDe<typeof TIPO_DATO_PARAMETRO>;
