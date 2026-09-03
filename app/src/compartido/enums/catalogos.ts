/**
 * Los 15 catálogos canónicos de `ANEXO_B`: los 14 de la tabla §5 más
 * `estado_registro` (§6.2), que el propio anexo declara "enum canónico" (CT-06).
 * Los valores son literalmente los de `/Teoria`; NUNCA se renombran ni se inventan.
 */
import { definirCatalogo, type ValoresDe } from './definirCatalogo';

export const ESTADO_ACTUAL = definirCatalogo('estado_actual', 'ANEXO_B §5', {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo',
  INSERVIBLE: 'Inservible',
});
export type EstadoActual = ValoresDe<typeof ESTADO_ACTUAL>;

export const CONDICION_TENENCIA = definirCatalogo('condicion_tenencia', 'ANEXO_B §5', {
  PROPIO: 'Propio',
  COMODATO: 'Comodato',
  ARRENDADO: 'Arrendado',
  TERCERO: 'De tercero',
});
export type CondicionTenencia = ValoresDe<typeof CONDICION_TENENCIA>;

export const ESTADO_OPERATIVO = definirCatalogo('estado_operativo', 'ANEXO_B §5', {
  OPERATIVO: 'Operativo',
  NO_OPERATIVO: 'No operativo',
  FUERA_SERVICIO: 'Fuera de servicio',
});
export type EstadoOperativo = ValoresDe<typeof ESTADO_OPERATIVO>;

export const FORMA_ADQUISICION = definirCatalogo('forma_adquisicion', 'ANEXO_B §5', {
  COMPRA: 'Compra',
  DONACION: 'Donación',
  COMODATO: 'Comodato',
  REPOSICION: 'Reposición',
  TRASLADO: 'Traslado',
});
export type FormaAdquisicion = ValoresDe<typeof FORMA_ADQUISICION>;

export const SEMAFORO = definirCatalogo('semaforo', 'ANEXO_B §5', {
  VERDE: 'Verde',
  AMARILLO: 'Amarillo',
  NARANJA: 'Naranja',
  ROJO: 'Rojo',
});
export type Semaforo = ValoresDe<typeof SEMAFORO>;

export const METODO_VALUACION = definirCatalogo('metodo_valuacion', 'ANEXO_B §5', {
  COSTO_REPOSICION_DEPRECIADO: 'Costo de reposición depreciado',
  COMPARACION_MERCADO: 'Comparación de mercado',
  VALOR_EN_LIBROS: 'Valor en libros',
  VALOR_RESIDUAL_CHATARRA: 'Valor residual (chatarra)',
  VALOR_CERO: 'Valor cero',
});
export type MetodoValuacion = ValoresDe<typeof METODO_VALUACION>;

export const TIPO_AJUSTE = definirCatalogo('tipo_ajuste', 'ANEXO_B §5', {
  VALORIZACION: 'Valorización',
  DESVALORIZACION: 'Desvalorización',
  SIN_CAMBIO: 'Sin cambio',
});
export type TipoAjuste = ValoresDe<typeof TIPO_AJUSTE>;

export const CAUSAL_BAJA = definirCatalogo('causal_baja', 'ANEXO_B §5', {
  OBSOLESCENCIA: 'Obsolescencia',
  INSERVIBLE: 'Inservible',
  CASO_FORTUITO: 'Caso fortuito',
  DESUSO: 'Desuso',
  DONACION_O_TRASLADO: 'Donación o traslado',
});
export type CausalBaja = ValoresDe<typeof CAUSAL_BAJA>;

export const TIPO_DIFERENCIA = definirCatalogo('tipo_diferencia', 'ANEXO_B §5', {
  SOBRANTE_FISICO: 'Sobrante físico',
  FALTANTE_FISICO: 'Faltante físico',
  DIFERENCIA_VALOR: 'Diferencia de valor',
  DIFERENCIA_FECHA: 'Diferencia de fecha',
  DIFERENCIA_DEPRECIACION: 'Diferencia de depreciación',
  CLASIFICACION_ERRONEA: 'Clasificación errónea',
  DUPLICADO_LIBROS: 'Duplicado en libros',
  BIEN_TERCERO: 'Bien de tercero',
});
export type TipoDiferencia = ValoresDe<typeof TIPO_DIFERENCIA>;

export const ACCION_PROPUESTA = definirCatalogo('accion_propuesta', 'ANEXO_B §5', {
  INCORPORAR: 'Incorporar',
  DAR_DE_BAJA: 'Dar de baja',
  AJUSTAR_VALOR: 'Ajustar valor',
  AJUSTAR_DEPRECIACION: 'Ajustar depreciación',
  RECLASIFICAR: 'Reclasificar',
});
export type AccionPropuesta = ValoresDe<typeof ACCION_PROPUESTA>;

export const INDICIO_DETERIORO = definirCatalogo('indicio_deterioro', 'ANEXO_B §5', {
  DANO_FISICO: 'Daño físico',
  OBSOLESCENCIA: 'Obsolescencia',
  DESUSO: 'Desuso',
  CAMBIO_NORMATIVO: 'Cambio normativo',
});
export type IndicioDeterioro = ValoresDe<typeof INDICIO_DETERIORO>;

export const DESTINO_FINAL = definirCatalogo('destino_final', 'ANEXO_B §5', {
  VENTA: 'Venta',
  REMATE: 'Remate',
  DESTRUCCION: 'Destrucción',
  DONACION: 'Donación',
  RECICLAJE_RAEE: 'Reciclaje RAEE',
  GESTOR_AMBIENTAL: 'Gestor ambiental',
});
export type DestinoFinal = ValoresDe<typeof DESTINO_FINAL>;

export const ESTADO_LEGALIZACION = definirCatalogo('estado_legalizacion', 'ANEXO_B §5', {
  LEGALIZADO: 'Legalizado',
  EN_TRAMITE: 'En trámite',
  SIN_TITULO: 'Sin título',
});
export type EstadoLegalizacion = ValoresDe<typeof ESTADO_LEGALIZACION>;

export const ESTADO_CONSERVACION = definirCatalogo('estado_conservacion', 'ANEXO_B §5', {
  '1_NUEVO': '1 · Nuevo',
  '2_BUENO': '2 · Bueno',
  '3_REGULAR': '3 · Regular',
  '4_DEFICIENTE': '4 · Deficiente',
  '5_INSERVIBLE': '5 · Inservible',
});
export type EstadoConservacion = ValoresDe<typeof ESTADO_CONSERVACION>;

/** Seis estados; la transición de regreso `PROPUESTO_BAJA → ACTIVO` es de RN-09-04 (CT-06). */
export const ESTADO_REGISTRO = definirCatalogo('estado_registro', 'ANEXO_B §6.2', {
  BORRADOR: 'Borrador',
  VALIDADO: 'Validado',
  ACTIVO: 'Activo',
  INCOMPLETO: 'Incompleto',
  PROPUESTO_BAJA: 'Propuesto para baja',
  DADO_DE_BAJA: 'Dado de baja',
});
export type EstadoRegistro = ValoresDe<typeof ESTADO_REGISTRO>;

/** Los 15 catálogos canónicos, en el orden de `ANEXO_B`. */
export const CATALOGOS_CANONICOS = Object.freeze([
  ESTADO_ACTUAL,
  CONDICION_TENENCIA,
  ESTADO_OPERATIVO,
  FORMA_ADQUISICION,
  SEMAFORO,
  METODO_VALUACION,
  TIPO_AJUSTE,
  CAUSAL_BAJA,
  TIPO_DIFERENCIA,
  ACCION_PROPUESTA,
  INDICIO_DETERIORO,
  DESTINO_FINAL,
  ESTADO_LEGALIZACION,
  ESTADO_CONSERVACION,
  ESTADO_REGISTRO,
] as const);
