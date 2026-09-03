/**
 * ANEXO_A §6.1 — la aplicación entrega sus plantillas en blanco, **ya
 * parametrizadas con los catálogos de la entidad**: listas desplegables con las
 * clases, sedes y servicios reales del hospital, y el membrete con su razón social.
 *
 * Se parte de los libros reales de `Plantillas_Valuacion_Activos` (verificados con
 * 0 errores de fórmula) en vez de regenerarlos: `PL-08`, `PL-09`, `PL-10` y `PL-11`
 * llevan el motor de cálculo embebido en fórmulas y reescribirlas sería rehacer un
 * trabajo ya hecho y probado.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ExcelJS from 'exceljs';
import { ErrorInfraestructura } from '../../../../compartido/errores';
import type { ColumnaConCatalogo, DefinicionPlantillaEntregable } from './catalogoPlantillas';
import { PRIMERA_FILA_DATOS } from './catalogoPlantillas';

/** Catálogos del hospital que se inyectan como listas desplegables. */
export interface CatalogosEntidad {
  readonly clases: readonly string[];
  readonly sedes: readonly string[];
  readonly servicios: readonly string[];
  readonly responsables: readonly string[];
}

export interface DatosMembrete {
  readonly razonSocial: string;
  readonly fechaCorte: string | null;
}

/** Excel limita la lista literal a 255 caracteres; por encima se usa una hoja auxiliar. */
const LIMITE_LISTA_LITERAL = 250;
const HOJA_CATALOGOS = 'CATALOGOS';
const ULTIMA_FILA_VALIDACION = 2000;

function valoresDe(catalogos: CatalogosEntidad, cual: ColumnaConCatalogo['catalogo']): readonly string[] {
  return catalogos[cual];
}

/** Escapa las comillas para la fórmula de validación literal de Excel. */
function listaLiteral(valores: readonly string[]): string {
  return `"${valores.join(',').replace(/"/g, "'")}"`;
}

/**
 * Escribe los valores en una hoja auxiliar oculta y devuelve la referencia para
 * la validación. Es la única forma de tener listas largas (un hospital puede
 * tener cientos de servicios).
 */
function escribirEnHojaAuxiliar(libro: ExcelJS.Workbook, columna: number, valores: readonly string[]): string {
  let hoja = libro.getWorksheet(HOJA_CATALOGOS);
  if (hoja === undefined) {
    hoja = libro.addWorksheet(HOJA_CATALOGOS);
    hoja.state = 'veryHidden';
    hoja.getCell(1, 1).value = 'Catálogos de la entidad — generado por la aplicación, no modificar';
  }
  hoja.getCell(2, columna).value = `Catálogo ${columna}`;
  valores.forEach((v, i) => {
    hoja.getCell(3 + i, columna).value = v;
  });
  const letra = hoja.getColumn(columna).letter;
  return `${HOJA_CATALOGOS}!$${letra}$3:$${letra}$${2 + Math.max(valores.length, 1)}`;
}

function inyectarLista(libro: ExcelJS.Workbook, def: ColumnaConCatalogo, valores: readonly string[], indiceAuxiliar: number): boolean {
  const hoja = libro.getWorksheet(def.hoja);
  if (hoja === undefined || valores.length === 0) return false;

  const literal = listaLiteral(valores);
  const formula = literal.length <= LIMITE_LISTA_LITERAL ? literal : escribirEnHojaAuxiliar(libro, indiceAuxiliar, valores);

  for (let fila = PRIMERA_FILA_DATOS; fila <= ULTIMA_FILA_VALIDACION; fila++) {
    hoja.getCell(`${def.columna}${fila}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Valor fuera del catálogo',
      error: 'Elija uno de los valores de la lista. La aplicación rechaza los que no estén en el catálogo de la entidad.',
    };
  }
  return true;
}

/** Sustituye los marcadores `{{...}}` del membrete por los datos de la entidad. */
function aplicarMembrete(libro: ExcelJS.Workbook, membrete: DatosMembrete): void {
  const sustituciones: Record<string, string> = {
    '{{ENTIDAD_RAZON_SOCIAL}}': membrete.razonSocial,
    '{{FECHA_CORTE}}': membrete.fechaCorte ?? '',
  };
  for (const hoja of libro.worksheets) {
    for (let fila = 1; fila <= Math.min(hoja.rowCount, 6); fila++) {
      hoja.getRow(fila).eachCell({ includeEmpty: false }, (celda) => {
        if (typeof celda.value !== 'string') return;
        let texto = celda.value;
        for (const [marcador, valor] of Object.entries(sustituciones)) texto = texto.split(marcador).join(valor);
        if (texto !== celda.value) celda.value = texto;
      });
    }
  }
}

export interface ResultadoEntrega {
  readonly rutaDestino: string;
  readonly catalogosInyectados: readonly string[];
}

/**
 * Copia la plantilla al destino elegido por el usuario. Para los `.xlsx` con
 * catálogos declarados, inyecta las listas desplegables y el membrete; los
 * `.docx` se copian tal cual (sus marcadores los sustituye el generador Word).
 */
export async function entregarPlantilla(
  plantilla: DefinicionPlantillaEntregable,
  rutaOrigen: string,
  rutaDestino: string,
  catalogos: CatalogosEntidad,
  membrete: DatosMembrete,
): Promise<ResultadoEntrega> {
  if (!existsSync(rutaOrigen)) {
    throw new ErrorInfraestructura(
      'PLANTILLA_NO_DISPONIBLE',
      `No se encontró el archivo de la plantilla ${plantilla.codigo}.`,
      { detalle: rutaOrigen },
    );
  }
  await mkdir(dirname(rutaDestino), { recursive: true });

  if (plantilla.formato !== 'xlsx') {
    await copyFile(rutaOrigen, rutaDestino);
    return { rutaDestino, catalogosInyectados: [] };
  }

  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(rutaOrigen);

  const inyectados: string[] = [];
  let indiceAuxiliar = 1;
  for (const def of plantilla.listas ?? []) {
    if (inyectarLista(libro, def, valoresDe(catalogos, def.catalogo), indiceAuxiliar)) {
      inyectados.push(def.catalogo);
      indiceAuxiliar += 1;
    }
  }
  aplicarMembrete(libro, membrete);
  await libro.xlsx.writeFile(rutaDestino);

  return { rutaDestino, catalogosInyectados: [...new Set(inyectados)] };
}

/**
 * Localiza la carpeta de plantillas. Empaquetada está en `resources/plantillas`;
 * sin empaquetar depende de cómo se lanzó (`electron-vite dev`, `out/main/index.js`
 * o los E2E), así que se prueban las ubicaciones plausibles en vez de asumir una:
 * una ruta equivocada dejaría al hospital sin sus formatos y es lo que hay que evitar.
 */
export function rutaPlantillas(empaquetada: boolean, resourcesPath: string, raizProyecto: string): string {
  const candidatas = empaquetada
    ? [join(resourcesPath, 'plantillas')]
    : [
        join(raizProyecto, '..', 'Plantillas_Valuacion_Activos'),
        join(raizProyecto, '..', '..', 'Plantillas_Valuacion_Activos'),
        join(raizProyecto, '..', '..', '..', 'Plantillas_Valuacion_Activos'),
        join(process.cwd(), '..', 'Plantillas_Valuacion_Activos'),
        join(process.cwd(), 'Plantillas_Valuacion_Activos'),
        join(resourcesPath, 'plantillas'),
      ];
  return candidatas.find((c) => existsSync(join(c, 'excel'))) ?? candidatas[0] ?? '';
}
