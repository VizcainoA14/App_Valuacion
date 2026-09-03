/**
 * Catálogo de las 28 plantillas de `ANEXO_A` §1, con lo que la aplicación necesita
 * saber para entregarlas: qué hoja y qué columna recibe cada catálogo de la
 * entidad (ANEXO_A §6.1) y en qué etapa del núcleo se usan (ADR-026).
 */
import type { EtapaPlantilla, FormatoPlantilla } from '../../../../compartido/dtos/plantillas';

/** Catálogos que se pueden inyectar como lista desplegable en una columna. */
export type CatalogoInyectable = 'clases' | 'sedes' | 'servicios' | 'responsables';

export interface ColumnaConCatalogo {
  readonly hoja: string;
  /** Letra de la columna en el libro real, p. ej. 'D'. */
  readonly columna: string;
  readonly catalogo: CatalogoInyectable;
}

export interface DefinicionPlantillaEntregable {
  readonly codigo: string;
  readonly archivo: string;
  readonly formato: FormatoPlantilla;
  readonly nombre: string;
  readonly proposito: string;
  readonly paso: number;
  readonly etapa: EtapaPlantilla;
  readonly seDiligencia: boolean;
  readonly importable: boolean;
  readonly listas?: readonly ColumnaConCatalogo[];
}

/** Primera fila de datos de los libros reales (fila 6 = encabezados, 7 = ejemplo). */
export const PRIMERA_FILA_DATOS = 8;
export const FILA_EJEMPLO = 7;

export const PLANTILLAS: readonly DefinicionPlantillaEntregable[] = [
  {
    codigo: 'PL-01',
    archivo: 'PL-01_parametros_entidad.xlsx',
    formato: 'xlsx',
    nombre: 'Parámetros de la entidad',
    proposito: 'Identificación de la E.S.E y los parámetros con los que se calculará: método de conteo de meses, valor residual y umbrales.',
    paso: 1,
    etapa: 'configurar',
    seDiligencia: true,
    importable: true,
  },
  {
    codigo: 'PL-02',
    archivo: 'PL-02_clases_vida_util.xlsx',
    formato: 'xlsx',
    nombre: 'Clases de activo y vida útil',
    proposito: 'La tabla que determina cuánto se deprecia cada tipo de bien. La valida el contador contra el Manual de Políticas Contables.',
    paso: 1,
    etapa: 'configurar',
    seDiligencia: true,
    importable: true,
  },
  {
    codigo: 'PL-02b',
    archivo: 'PL-02b_sedes_servicios.xlsx',
    formato: 'xlsx',
    nombre: 'Sedes y servicios',
    proposito: 'Dónde está cada bien: las sedes de la entidad y los servicios de cada una.',
    paso: 1,
    etapa: 'configurar',
    seDiligencia: true,
    importable: true,
  },
  {
    codigo: 'PL-03',
    archivo: 'PL-03_toma_inventario_fisico.xlsx',
    formato: 'xlsx',
    nombre: 'Toma de inventario físico',
    proposito: 'El listado de los bienes que existen físicamente. Es la entrada principal de la aplicación.',
    paso: 2,
    etapa: 'inventario',
    seDiligencia: true,
    importable: true,
    listas: [
      { hoja: 'INVENTARIO', columna: 'D', catalogo: 'clases' },
      { hoja: 'INVENTARIO', columna: 'H', catalogo: 'sedes' },
      { hoja: 'INVENTARIO', columna: 'I', catalogo: 'servicios' },
    ],
  },
  {
    codigo: 'PL-05',
    archivo: 'PL-05_hoja_de_vida.xlsx',
    formato: 'xlsx',
    nombre: 'Hoja de vida y datos económicos',
    proposito: 'Fecha y costo de adquisición de cada bien. SIN estos dos datos no se puede calcular la depreciación (RN-03-01).',
    paso: 3,
    etapa: 'datos-economicos',
    seDiligencia: true,
    importable: true,
  },
  { codigo: 'PL-04', archivo: 'PL-04_etiquetas_plaqueteo.xlsx', formato: 'xlsx', nombre: 'Etiquetas de plaqueteo', proposito: 'Insumo para imprimir las etiquetas. La genera la aplicación.', paso: 2, etapa: 'extension', seDiligencia: false, importable: false },
  { codigo: 'PL-06', archivo: 'PL-06_saldos_contables.xlsx', formato: 'xlsx', nombre: 'Saldos contables', proposito: 'Saldos de PPE que entrega contabilidad, para conciliar contra el inventario físico.', paso: 4, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-07', archivo: 'PL-07_conciliacion.xlsx', formato: 'xlsx', nombre: 'Matriz de conciliación', proposito: 'Comparación físico contra libros. La genera la aplicación.', paso: 4, etapa: 'extension', seDiligencia: false, importable: false },
  { codigo: 'PL-07b', archivo: 'PL-07b_partidas_conciliatorias.xlsx', formato: 'xlsx', nombre: 'Partidas conciliatorias', proposito: 'Detalle de cada diferencia encontrada y qué se propone hacer con ella.', paso: 4, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-08', archivo: 'PL-08_indice_obsolescencia.xlsx', formato: 'xlsx', nombre: 'Índice de obsolescencia', proposito: 'Resultado del cálculo de obsolescencia. La genera la aplicación.', paso: 5, etapa: 'calculo', seDiligencia: false, importable: false },
  { codigo: 'PL-08b', archivo: 'PL-08b_override_vida_util.xlsx', formato: 'xlsx', nombre: 'Ajuste de vida útil', proposito: 'Cuando el manual del fabricante fija una vida útil distinta a la del catálogo (RN-03-06).', paso: 5, etapa: 'calculo', seDiligencia: true, importable: false },
  { codigo: 'PL-09', archivo: 'PL-09_depreciacion.xlsx', formato: 'xlsx', nombre: 'Depreciación', proposito: 'Resultado del cálculo de depreciación. La genera la aplicación.', paso: 6, etapa: 'calculo', seDiligencia: false, importable: false },
  { codigo: 'PL-09b', archivo: 'PL-09b_deterioro.xlsx', formato: 'xlsx', nombre: 'Deterioro', proposito: 'Reconocimiento de deterioro cuando el valor recuperable es menor al valor en libros.', paso: 6, etapa: 'calculo', seDiligencia: true, importable: false },
  { codigo: 'PL-10', archivo: 'PL-10_valuacion_muebles.xlsx', formato: 'xlsx', nombre: 'Valuación de muebles', proposito: 'Avalúo técnico de bienes muebles.', paso: 7, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-10b', archivo: 'PL-10b_referencias_mercado.xlsx', formato: 'xlsx', nombre: 'Referencias de mercado', proposito: 'Cotizaciones que respaldan el avalúo de muebles.', paso: 7, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-11', archivo: 'PL-11_ficha_inmueble.xlsx', formato: 'xlsx', nombre: 'Ficha de inmueble', proposito: 'Datos del predio y su avalúo, diligenciada por el perito.', paso: 8, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-11b', archivo: 'PL-11b_estudio_mercado_inmueble.xlsx', formato: 'xlsx', nombre: 'Estudio de mercado de inmuebles', proposito: 'Ofertas comparables que respaldan el avalúo del predio.', paso: 8, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-13', archivo: 'PL-13_baja_de_bienes.xlsx', formato: 'xlsx', nombre: 'Baja de bienes', proposito: 'Los bienes que se propone dar de baja, con la justificación técnica de cada uno.', paso: 9, etapa: 'bajas', seDiligencia: true, importable: false },
  { codigo: 'PL-14', archivo: 'PL-14_consolidado_subcuentas.xlsx', formato: 'xlsx', nombre: 'Consolidado por subcuenta', proposito: 'Resumen contable por subcuenta. La genera la aplicación.', paso: 10, etapa: 'extension', seDiligencia: false, importable: false },
  { codigo: 'PL-19', archivo: 'PL-19_plan_capacitacion.xlsx', formato: 'xlsx', nombre: 'Plan de capacitación', proposito: 'Registro de las sesiones de capacitación al personal.', paso: 11, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-12', archivo: 'PL-12_acta_custodia.docx', formato: 'docx', nombre: 'Acta de custodia', proposito: 'Acta que firma cada jefe de servicio haciéndose responsable de los bienes a su cargo.', paso: 2, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-13b', archivo: 'PL-13b_certificacion_tecnica_baja.docx', formato: 'docx', nombre: 'Certificación técnica de baja', proposito: 'Concepto del especialista que sustenta por qué un bien no es recuperable.', paso: 9, etapa: 'bajas', seDiligencia: true, importable: false },
  { codigo: 'PL-13c', archivo: 'PL-13c_acta_disposicion_final.docx', formato: 'docx', nombre: 'Acta de disposición final', proposito: 'Constancia de qué se hizo con el bien dado de baja (venta, destrucción, gestor RAEE).', paso: 9, etapa: 'bajas', seDiligencia: true, importable: false },
  { codigo: 'PL-15', archivo: 'PL-15_resolucion_valuacion.docx', formato: 'docx', nombre: 'Resolución de valuación', proposito: 'Acto administrativo que adopta los resultados. Lo firma el Gerente.', paso: 10, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-16', archivo: 'PL-16_acta_comite.docx', formato: 'docx', nombre: 'Acta del Comité', proposito: 'Acta del Comité de Saneamiento Contable que aprueba las bajas.', paso: 10, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-17', archivo: 'PL-17_acta_entrega_final.docx', formato: 'docx', nombre: 'Acta de entrega final', proposito: 'Entrega formal de los productos del ejercicio.', paso: 11, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-18', archivo: 'PL-18_manual_activos.docx', formato: 'docx', nombre: 'Manual de activos fijos', proposito: 'Manual de procedimientos que queda en la entidad.', paso: 11, etapa: 'extension', seDiligencia: true, importable: false },
  { codigo: 'PL-20', archivo: 'PL-20_acta_liquidacion.docx', formato: 'docx', nombre: 'Acta de liquidación', proposito: 'Liquidación del contrato de consultoría.', paso: 11, etapa: 'extension', seDiligencia: true, importable: false },
];

export function plantillaPorCodigo(codigo: string): DefinicionPlantillaEntregable | undefined {
  return PLANTILLAS.find((p) => p.codigo === codigo);
}
