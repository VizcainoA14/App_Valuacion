/**
 * TR-02 · importador genérico: RECONOCER (lector) → NORMALIZAR (normalizador) →
 * VALIDAR por fila. Devuelve un informe fila por fila (ANEXO_A §3.3) y las filas
 * normalizadas; cada plantilla añade después sus reglas de negocio y su escritura.
 */
import type {
  IncidenciaImportacion,
  NormalizacionAplicada,
  ResumenHojaImportada,
} from '../../../../compartido/dtos/importacion';
import { leerLibro, normalizarClave, type FilaLeida } from './lector';
import { normalizar, type FormatoFechaRegional, type TipoColumna, type ValorNormalizado } from './normalizador';

export interface ColumnaPlantilla {
  readonly nombre: string;
  readonly tipo: TipoColumna;
  readonly obligatoria: boolean;
  readonly catalogo?: readonly string[];
  readonly noNegativo?: boolean;
}

export interface HojaPlantilla {
  readonly nombre: string;
  readonly columnas: readonly ColumnaPlantilla[];
  /** Columnas cuya combinación no puede repetirse dentro de la hoja. */
  readonly claveUnica?: readonly string[];
}

export interface DefinicionPlantilla {
  readonly hojas: readonly HojaPlantilla[];
}

export type FilaDatos = Readonly<Record<string, ValorNormalizado>>;

export interface FilaNormalizada {
  readonly numero: number;
  readonly datos: FilaDatos;
}

export interface LecturaNormalizada {
  /** Mutable a propósito: las reglas de negocio de cada plantilla retiran filas después. */
  readonly hojas: Record<string, FilaNormalizada[]>;
  readonly resumen: ResumenHojaImportada[];
  readonly incidencias: IncidenciaImportacion[];
  readonly normalizaciones: NormalizacionAplicada[];
}

/** Retira una fila que una regla de negocio rechazó y actualiza el resumen de su hoja. */
export function rechazarFila(lectura: LecturaNormalizada, hoja: string, numero: number, incidencia: IncidenciaImportacion): void {
  const filas = lectura.hojas[hoja];
  if (filas === undefined) return;
  const indice = filas.findIndex((f) => f.numero === numero);
  if (indice === -1) return;
  filas.splice(indice, 1);
  lectura.incidencias.push(incidencia);
  const i = lectura.resumen.findIndex((r) => r.hoja === hoja);
  const r = lectura.resumen[i];
  if (r !== undefined) lectura.resumen[i] = { ...r, filasValidas: r.filasValidas - 1, filasConError: r.filasConError + 1 };
}

export async function leerYNormalizar(
  rutaArchivo: string,
  definicion: DefinicionPlantilla,
  formatoFecha: FormatoFechaRegional,
): Promise<LecturaNormalizada> {
  const { hojas, hojasFaltantes } = await leerLibro(
    rutaArchivo,
    definicion.hojas.map((h) => ({ nombre: h.nombre, columnas: h.columnas.map((c) => c.nombre) })),
  );

  const incidencias: IncidenciaImportacion[] = [];
  const normalizaciones: NormalizacionAplicada[] = [];
  const resumen: ResumenHojaImportada[] = [];
  const resultado: Record<string, FilaNormalizada[]> = {};

  for (const nombre of hojasFaltantes) {
    incidencias.push({ hoja: nombre, fila: 0, columna: null, valorRecibido: null, motivo: `No existe la hoja "${nombre}" en el archivo`, severidad: 'ERROR' });
  }

  for (const def of definicion.hojas) {
    const hoja = hojas.find((h) => h.nombre === def.nombre);
    if (hoja === undefined) continue;

    if (hoja.filaEncabezados === 0) {
      incidencias.push({ hoja: def.nombre, fila: 0, columna: null, valorRecibido: null, motivo: 'No se encontró la fila de encabezados con los nombres de columna de la plantilla', severidad: 'ERROR' });
      resumen.push({ hoja: def.nombre, filaEncabezados: 0, filasLeidas: 0, filasValidas: 0, filasConError: 0, filasEjemploOmitidas: 0 });
      continue;
    }
    for (const c of hoja.columnasFaltantes) {
      const obligatoria = def.columnas.find((x) => x.nombre === c)?.obligatoria === true;
      incidencias.push({ hoja: def.nombre, fila: hoja.filaEncabezados, columna: c, valorRecibido: null, motivo: `Falta la columna "${c}"`, severidad: obligatoria ? 'ERROR' : 'ADVERTENCIA' });
    }

    const filasValidas: FilaNormalizada[] = [];
    let filasConError = 0;
    let filasEjemplo = 0;
    const clavesVistas = new Map<string, number>();

    for (const fila of hoja.filas) {
      if (fila.esEjemplo) {
        filasEjemplo += 1;
        normalizaciones.push({ hoja: def.nombre, fila: fila.numero, columna: '*', recibido: 'fila de ejemplo (azul claro)', interpretado: 'omitida', regla: 'LEEME §1: la fila de ejemplo no se importa' });
        continue;
      }
      const { datos, errores } = normalizarFila(def, fila, formatoFecha, normalizaciones);
      if (errores.length > 0) {
        filasConError += 1;
        incidencias.push(...errores);
        continue;
      }
      if (def.claveUnica !== undefined) {
        const clave = def.claveUnica.map((c) => String(datos[normalizarClave(c)] ?? '')).join('|').toUpperCase();
        const anterior = clavesVistas.get(clave);
        if (anterior !== undefined) {
          filasConError += 1;
          incidencias.push({ hoja: def.nombre, fila: fila.numero, columna: def.claveUnica.join('+'), valorRecibido: clave, motivo: `Duplicado de la fila ${anterior}`, severidad: 'ERROR' });
          continue;
        }
        clavesVistas.set(clave, fila.numero);
      }
      filasValidas.push({ numero: fila.numero, datos });
    }

    resultado[def.nombre] = filasValidas;
    resumen.push({
      hoja: def.nombre,
      filaEncabezados: hoja.filaEncabezados,
      filasLeidas: hoja.filas.length - filasEjemplo,
      filasValidas: filasValidas.length,
      filasConError,
      filasEjemploOmitidas: filasEjemplo,
    });
  }

  return { hojas: resultado, resumen, incidencias, normalizaciones };
}

function normalizarFila(
  def: HojaPlantilla,
  fila: FilaLeida,
  formatoFecha: FormatoFechaRegional,
  normalizaciones: NormalizacionAplicada[],
): { datos: FilaDatos; errores: IncidenciaImportacion[] } {
  const datos: Record<string, ValorNormalizado> = {};
  const errores: IncidenciaImportacion[] = [];

  for (const columna of def.columnas) {
    const clave = normalizarClave(columna.nombre);
    const crudo = fila.celdas[clave];
    const r = normalizar(crudo, columna.tipo, {
      formatoFecha,
      ...(columna.catalogo !== undefined ? { catalogo: columna.catalogo } : {}),
      ...(columna.noNegativo !== undefined ? { noNegativo: columna.noNegativo } : {}),
    });
    if (!r.ok) {
      errores.push({ hoja: def.nombre, fila: fila.numero, columna: columna.nombre, valorRecibido: crudo === null ? null : String(crudo), motivo: r.motivo, severidad: 'ERROR' });
      continue;
    }
    if (r.valor === null && columna.obligatoria) {
      errores.push({ hoja: def.nombre, fila: fila.numero, columna: columna.nombre, valorRecibido: null, motivo: 'Campo obligatorio vacío', severidad: 'ERROR' });
      continue;
    }
    if (r.nota !== undefined) {
      normalizaciones.push({ hoja: def.nombre, fila: fila.numero, columna: columna.nombre, recibido: String(crudo), interpretado: r.nota.interpretado, regla: r.nota.regla });
    }
    datos[clave] = r.valor;
  }
  return { datos, errores };
}
