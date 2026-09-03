/**
 * Los 16 parámetros de cálculo de ANEXO_B §2.5 (claves obligatorias), tipados.
 * Se persisten en `parametro_calculo` (clave/valor/tipo_dato) y se congelan por
 * ejercicio en `ejercicio.parametros_congelados_json` (RN-01-01): el motor lee
 * SIEMPRE del congelado, nunca del catálogo vigente (plan 4.3 §4).
 *
 * `metodo_conteo_meses` trae el valor SUGERIDO `dias_exactos`, pero VAL-01-07 no
 * se cumple hasta que el contador lo confirme por acta (CT-02): por eso existe
 * `metodo_conteo_meses_confirmado`, que no es de ANEXO_B pero es la única forma de
 * distinguir "sugerido" de "adoptado".
 */
import { z } from 'zod';
import { zCatalogo } from '../esquemas/basicos';
import {
  METODO_CONTEO_MESES,
  METODO_DEPRECIACION,
  ENFOQUE_ADICIONES,
  BASE_COMPARACION_AVALUO,
  type TipoDatoParametro,
} from '../enums/parametros';

const porcentaje = z.number().min(0).max(100);
const fraccion = z.number().min(0).max(1);

export const EsquemaParametrosCalculo = z.object({
  metodo_depreciacion: zCatalogo(METODO_DEPRECIACION).default('linea_recta'),
  metodo_conteo_meses: zCatalogo(METODO_CONTEO_MESES).default('dias_exactos'),
  metodo_conteo_meses_confirmado: z.boolean().default(false),
  deprecia_mes_adquisicion: z.boolean().default(true),
  usa_puesta_en_servicio: z.boolean().default(false),
  enfoque_adiciones: zCatalogo(ENFOQUE_ADICIONES).default('simplificado'),
  base_comparacion_avaluo: zCatalogo(BASE_COMPARACION_AVALUO).default('valor_neto_libros'),
  valor_residual_pct: porcentaje.default(0),
  decimales_calculo: z.number().int().min(0).max(4).default(2),
  /** Pesos. "Según manual": sin valor por defecto real, 0 hasta que se fije. */
  umbral_capitalizacion: z.number().min(0).default(0),
  umbral_semaforo_verde: fraccion.default(0.5),
  umbral_semaforo_amarillo: fraccion.default(0.8),
  umbral_semaforo_naranja: fraccion.default(0.99),
  umbral_reparacion_baja_pct: porcentaje.default(50),
  tolerancia_cruce_valor_pct: porcentaje.default(5),
  vigencia_avaluo_meses: z.number().int().min(1).default(12),
  moneda: z.string().trim().min(3).max(3).default('COP'),
});

export type ParametrosCalculo = z.infer<typeof EsquemaParametrosCalculo>;
export type ClaveParametro = keyof ParametrosCalculo;

export const PARAMETROS_POR_DEFECTO: ParametrosCalculo = EsquemaParametrosCalculo.parse({});
export const CLAVES_PARAMETRO = Object.keys(PARAMETROS_POR_DEFECTO) as ClaveParametro[];

/** Tipo físico de cada clave para la columna `tipo_dato` de `parametro_calculo`. */
export const TIPO_DATO_PARAMETRO_DE: Readonly<Record<ClaveParametro, TipoDatoParametro>> = {
  metodo_depreciacion: 'enum',
  metodo_conteo_meses: 'enum',
  metodo_conteo_meses_confirmado: 'booleano',
  deprecia_mes_adquisicion: 'booleano',
  usa_puesta_en_servicio: 'booleano',
  enfoque_adiciones: 'enum',
  base_comparacion_avaluo: 'enum',
  valor_residual_pct: 'numero',
  decimales_calculo: 'numero',
  umbral_capitalizacion: 'numero',
  umbral_semaforo_verde: 'numero',
  umbral_semaforo_amarillo: 'numero',
  umbral_semaforo_naranja: 'numero',
  umbral_reparacion_baja_pct: 'numero',
  tolerancia_cruce_valor_pct: 'numero',
  vigencia_avaluo_meses: 'numero',
  moneda: 'texto',
};

/** Serializa un valor para la columna `valor` (texto). */
export function serializarParametro(clave: ClaveParametro, valor: ParametrosCalculo[ClaveParametro]): string {
  switch (TIPO_DATO_PARAMETRO_DE[clave]) {
    case 'booleano':
      return valor === true ? 'true' : 'false';
    case 'numero':
      return String(valor);
    default:
      return String(valor);
  }
}

/** Reconstruye el objeto desde filas clave/valor; lo que falte toma el valor por defecto. */
export function parametrosDesdeFilas(filas: readonly { clave: string; valor: string }[]): ParametrosCalculo {
  const crudo: Record<string, unknown> = {};
  for (const { clave, valor } of filas) {
    if (!(clave in TIPO_DATO_PARAMETRO_DE)) continue;
    const tipo = TIPO_DATO_PARAMETRO_DE[clave as ClaveParametro];
    crudo[clave] = tipo === 'booleano' ? valor === 'true' : tipo === 'numero' ? Number(valor) : valor;
  }
  return EsquemaParametrosCalculo.parse(crudo);
}

/** Umbrales coherentes: verde ≤ amarillo ≤ naranja < 1 (RN-01-05). */
export function validarUmbrales(p: ParametrosCalculo): string | null {
  if (p.umbral_semaforo_verde > p.umbral_semaforo_amarillo) return 'El umbral verde no puede superar al amarillo.';
  if (p.umbral_semaforo_amarillo > p.umbral_semaforo_naranja) return 'El umbral amarillo no puede superar al naranja.';
  if (p.umbral_semaforo_naranja >= 1) return 'El umbral naranja debe ser menor que 1 (rojo = índice ≥ 1).';
  return null;
}
