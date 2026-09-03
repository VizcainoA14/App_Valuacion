/**
 * TR-02 · fase 1 RECONOCER (plan 5.3): lee un libro .xlsx y localiza la fila de
 * encabezados por el conjunto de nombres esperados, no por número fijo (CT-07:
 * ANEXO_A dice fila 4, las plantillas reales usan la 6). Detecta la fila de
 * ejemplo por su relleno azul claro (DDEBF7, LEEME §2) y la marca para omitirla.
 */
import ExcelJS from 'exceljs';

export interface FilaLeida {
  readonly numero: number;
  /** Clave = nombre de columna esperado (normalizado); valor crudo de la celda. */
  readonly celdas: Readonly<Record<string, unknown>>;
  readonly esEjemplo: boolean;
}

export interface HojaLeida {
  readonly nombre: string;
  readonly filaEncabezados: number;
  /** Columnas esperadas que NO se encontraron en la fila de encabezados. */
  readonly columnasFaltantes: readonly string[];
  readonly filas: readonly FilaLeida[];
}

export interface HojaEsperada {
  readonly nombre: string;
  readonly columnas: readonly string[];
}

const RELLENO_EJEMPLO = /DDEBF7$/i;
const MAX_FILAS_BUSQUEDA_ENCABEZADO = 30;

/** Quita tildes, pasa a minúsculas, colapsa espacios: `Dirección ` → `direccion`. */
export function normalizarClave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Extrae el valor primitivo de una celda de exceljs (fórmulas, texto enriquecido, hipervínculos). */
export function valorPrimitivo(valor: ExcelJS.CellValue): unknown {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'object') {
    if (valor instanceof Date) return valor;
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('');
    if ('formula' in valor || 'sharedFormula' in valor) return valorPrimitivo((valor as { result?: ExcelJS.CellValue }).result ?? null);
    if ('hyperlink' in valor) return valorPrimitivo(valor.text as ExcelJS.CellValue);
    if ('error' in valor) return null;
    return String(valor);
  }
  return valor;
}

function textoDeCelda(celda: ExcelJS.Cell): string {
  const v = valorPrimitivo(celda.value);
  return v === null || v === undefined ? '' : String(v);
}

function esFilaEjemplo(fila: ExcelJS.Row): boolean {
  const relleno = fila.getCell(1).fill;
  return relleno?.type === 'pattern' && RELLENO_EJEMPLO.test(relleno.fgColor?.argb ?? '');
}

function localizarEncabezados(hoja: ExcelJS.Worksheet, columnasEsperadas: readonly string[]) {
  const esperadas = new Set(columnasEsperadas.map(normalizarClave));
  let mejor: { fila: number; mapa: Map<string, number>; aciertos: number } | null = null;

  for (let r = 1; r <= Math.min(hoja.rowCount, MAX_FILAS_BUSQUEDA_ENCABEZADO); r++) {
    const fila = hoja.getRow(r);
    const mapa = new Map<string, number>();
    fila.eachCell({ includeEmpty: false }, (celda, n) => {
      const clave = normalizarClave(textoDeCelda(celda));
      if (esperadas.has(clave) && !mapa.has(clave)) mapa.set(clave, n);
    });
    if (mapa.size > (mejor?.aciertos ?? 0)) mejor = { fila: r, mapa, aciertos: mapa.size };
    if (mapa.size === esperadas.size) break;
  }
  return mejor !== null && mejor.aciertos >= Math.ceil(esperadas.size * 0.6) ? mejor : null;
}

export async function leerLibro(
  rutaArchivo: string,
  hojasEsperadas: readonly HojaEsperada[],
): Promise<{ hojas: HojaLeida[]; hojasFaltantes: string[] }> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(rutaArchivo);

  const hojas: HojaLeida[] = [];
  const hojasFaltantes: string[] = [];

  for (const esperada of hojasEsperadas) {
    const hoja = libro.worksheets.find((h) => normalizarClave(h.name) === normalizarClave(esperada.nombre));
    if (hoja === undefined) {
      hojasFaltantes.push(esperada.nombre);
      continue;
    }
    const encabezado = localizarEncabezados(hoja, esperada.columnas);
    if (encabezado === null) {
      hojas.push({ nombre: esperada.nombre, filaEncabezados: 0, columnasFaltantes: [...esperada.columnas], filas: [] });
      continue;
    }
    const columnasFaltantes = esperada.columnas.filter((c) => !encabezado.mapa.has(normalizarClave(c)));

    const filas: FilaLeida[] = [];
    for (let r = encabezado.fila + 1; r <= hoja.rowCount; r++) {
      const fila = hoja.getRow(r);
      const celdas: Record<string, unknown> = {};
      let vacia = true;
      for (const columna of esperada.columnas) {
        const indice = encabezado.mapa.get(normalizarClave(columna));
        const valor = indice === undefined ? null : valorPrimitivo(fila.getCell(indice).value);
        const limpio = typeof valor === 'string' && valor.trim() === '' ? null : valor;
        if (limpio !== null && limpio !== undefined) vacia = false;
        celdas[normalizarClave(columna)] = limpio ?? null;
      }
      if (vacia) continue;
      filas.push({ numero: r, celdas, esEjemplo: esFilaEjemplo(fila) });
    }
    hojas.push({ nombre: esperada.nombre, filaEncabezados: encabezado.fila, columnasFaltantes, filas });
  }
  return { hojas, hojasFaltantes };
}
