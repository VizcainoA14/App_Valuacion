/**
 * Las plantillas de `ANEXO_A` §1 que el hospital diligencia e importa, con lo que
 * la aplicación necesita saber para entregarlas: qué hoja y qué columna recibe
 * cada catálogo de la entidad (ANEXO_A §6.1).
 *
 * ADR-028: de las 28 del anexo solo se entregan estas cinco. Las demás eran
 * formatos que la aplicación genera (su contenido ya está en el informe) o
 * documentos de trámites que ocurren fuera de ella —actas, resoluciones,
 * avalúos, conciliación— y ofrecerlas sugería que la aplicación los gestiona.
 */
import type { EtapaPlantilla, FormatoPlantilla } from '../../../../compartido/dtos/plantillas';

/** Catálogos que se pueden inyectar como lista desplegable en una columna. */
export type CatalogoInyectable = 'clases' | 'sedes' | 'servicios';

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
    etapa: 'inventario',
    seDiligencia: true,
    importable: true,
  },
];

export function plantillaPorCodigo(codigo: string): DefinicionPlantillaEntregable | undefined {
  return PLANTILLAS.find((p) => p.codigo === codigo);
}
