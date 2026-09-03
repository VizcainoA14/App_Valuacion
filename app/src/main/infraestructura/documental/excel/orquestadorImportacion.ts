/**
 * TR-02 · orquestación común de TODA importación de plantilla.
 *
 * Previsualizar (async, el archivo lo elige el main: P-1) → informe fila por fila
 * (ANEXO_A §3.3) → confirmar (síncrono, dentro de la transacción) → escritura +
 * copia del original en el almacén + bitácora IMPORTAR.
 *
 * Lo que cambia de una plantilla a otra —cómo se lee, qué reglas de negocio la
 * gobiernan y dónde se escribe— lo aporta cada módulo de dominio registrando un
 * `ImportadorPlantilla`. Aquí no se sabe qué es una sede ni un bien.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { InformeImportacion, PlantillaImportable, ResultadoImportacion } from '../../../../compartido/dtos/importacion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../db/identificadores';
import type { LecturaNormalizada } from './importador';
import type { FormatoFechaRegional } from './normalizador';

/** A qué entidad —y, cuando la plantilla trae bienes, a qué ejercicio— se importa. */
export interface AmbitoImportacion {
  readonly entidadId: string;
  readonly ejercicioId: string | null;
}

export interface ResultadoAplicacion {
  readonly creados: number;
  readonly actualizados: number;
}

/**
 * El archivo tal como se conservó. Algunas plantillas lo necesitan como evidencia:
 * la hoja SIN_SOPORTE de PL-05 ES el acta del especialista que exige RN-03-04, así
 * que el soporte documental apunta al libro que se importó y a su huella.
 */
export interface ArchivoImportado {
  readonly nombre: string;
  /** Ruta relativa dentro del almacén (o la de origen si no hay almacén, en pruebas). */
  readonly conservado: string;
  readonly hashSha256: string;
}

export interface ImportadorPlantilla {
  readonly codigo: PlantillaImportable;
  /** Las plantillas que traen bienes escriben dentro de un ejercicio abierto. */
  readonly requiereEjercicio: boolean;
  leer(archivo: string, formatoFecha: FormatoFechaRegional): Promise<LecturaNormalizada>;
  /** Reglas que cruzan hojas o consultan la base; retira filas con `rechazarFila`. */
  validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void;
  aplicar(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc, archivo: ArchivoImportado): ResultadoAplicacion;
}

interface Previsualizacion {
  readonly ambito: AmbitoImportacion;
  readonly plantilla: PlantillaImportable;
  readonly archivo: string;
  readonly lectura: LecturaNormalizada;
  readonly errores: number;
  readonly creadaEn: number;
}

const VIGENCIA_MS = 30 * 60_000;
const previsualizaciones = new Map<string, Previsualizacion>();
const importadores = new Map<string, ImportadorPlantilla>();

/** Cada módulo de dominio aporta las plantillas que sabe escribir (se llama al arrancar). */
export function registrarImportadores(lista: readonly ImportadorPlantilla[]): void {
  for (const i of lista) importadores.set(i.codigo, i);
}

/** Solo para pruebas: vacía la caché de previsualizaciones. */
export function limpiarPrevisualizaciones(): void {
  previsualizaciones.clear();
}

function purgar(ahoraMs: number): void {
  for (const [token, p] of previsualizaciones) if (ahoraMs - p.creadaEn > VIGENCIA_MS) previsualizaciones.delete(token);
}

function exigirImportador(plantilla: PlantillaImportable): ImportadorPlantilla {
  const i = importadores.get(plantilla);
  if (i === undefined) throw new ErrorValidacion('PLANTILLA_NO_IMPORTABLE', `La aplicación todavía no importa ${plantilla}.`, { campo: 'plantilla' });
  return i;
}

/**
 * Comprobación de ámbito con SQL directo: la orquestación es infraestructura y no
 * debe depender de los repositorios de un módulo concreto.
 */
function resolverAmbito(ctx: ContextoIpc, entidadId: string, ejercicioId: string | null, importador: ImportadorPlantilla): AmbitoImportacion {
  const entidad = ctx.sqlite.prepare('SELECT id FROM entidad WHERE id = ?').get(entidadId) as { id: string } | undefined;
  if (entidad === undefined) throw new ErrorValidacion('ENTIDAD_INEXISTENTE', 'La entidad no existe.', { campo: 'entidadId' });

  if (!importador.requiereEjercicio) return { entidadId, ejercicioId: null };

  if (ejercicioId === null) {
    throw new ErrorValidacion('EJERCICIO_REQUERIDO', `${importador.codigo} se importa dentro de un ejercicio. Cree o seleccione uno antes.`, { campo: 'ejercicioId' });
  }
  const ej = ctx.sqlite.prepare('SELECT id, entidad_id, estado FROM ejercicio WHERE id = ?').get(ejercicioId) as
    | { id: string; entidad_id: string; estado: string }
    | undefined;
  if (ej === undefined || ej.entidad_id !== entidadId) {
    throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe o no pertenece a la entidad.', { campo: 'ejercicioId' });
  }
  // INT-09 lo vuelve a comprobar al confirmar; aquí se evita que el usuario
  // recorra todo el informe para que le rechacen la escritura al final.
  if (ej.estado === 'CERRADO') {
    throw new ErrorReglaNegocio('EJERCICIO_CERRADO', 'El ejercicio está cerrado: no admite importaciones.');
  }
  return { entidadId, ejercicioId };
}

function vistaPrevia(lectura: LecturaNormalizada): InformeImportacion['vistaPrevia'] {
  return Object.fromEntries(Object.entries(lectura.hojas).map(([hoja, filas]) => [hoja, filas.slice(0, 200).map((f) => ({ fila: f.numero, ...f.datos }))]));
}

export async function previsualizarImportacion(
  e: { entidadId: string; plantilla: PlantillaImportable; ejercicioId?: string | null | undefined },
  ctx: ContextoIpc,
): Promise<InformeImportacion | null> {
  const importador = exigirImportador(e.plantilla);
  const ambito = resolverAmbito(ctx, e.entidadId, e.ejercicioId ?? null, importador);

  const archivo = await ctx.dialogos.elegirArchivoExcel(`Seleccione el archivo ${e.plantilla}`);
  if (archivo === null) return null;

  const lectura = await importador.leer(archivo, ctx.formatoFechaRegional ?? 'DD/MM/AAAA');
  importador.validarNegocio(ambito, lectura, ctx);

  const errores = lectura.incidencias.filter((i) => i.severidad === 'ERROR').length;
  const advertencias = lectura.incidencias.length - errores;
  const ahoraMs = Date.parse(ctx.ahoraIso());
  purgar(ahoraMs);
  const token = nuevoId();
  previsualizaciones.set(token, { ambito, plantilla: e.plantilla, archivo, lectura, errores, creadaEn: ahoraMs });

  return {
    token,
    plantilla: e.plantilla,
    archivo: basename(archivo),
    hojas: lectura.resumen,
    incidencias: lectura.incidencias,
    normalizaciones: lectura.normalizaciones,
    vistaPrevia: vistaPrevia(lectura),
    errores,
    advertencias,
    importable: errores === 0,
  };
}

/** ANEXO_A §3.3 regla 6: el archivo que se importó se conserva tal cual llegó. */
function conservarArchivo(ctx: ContextoIpc, entidadId: string, plantilla: PlantillaImportable, origen: string): string {
  if (ctx.rutaDatos === '') return origen;
  const dir = join(ctx.rutaDatos, 'almacen', 'importaciones', entidadId);
  mkdirSync(dir, { recursive: true });
  const marca = ctx.ahoraIso().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const destino = join(dir, `${marca}_${plantilla}_${basename(origen)}`);
  copyFileSync(origen, destino);
  return join('almacen', 'importaciones', entidadId, basename(destino));
}

export function confirmarImportacion(e: { token: string; aceptarConErrores: boolean }, ctx: ContextoIpc): ResultadoImportacion {
  const p = previsualizaciones.get(e.token);
  if (p === undefined) throw new ErrorValidacion('PREVISUALIZACION_INEXISTENTE', 'La previsualización caducó o no existe; vuelva a seleccionar el archivo.', { campo: 'token' });
  if (p.errores > 0 && !e.aceptarConErrores) {
    throw new ErrorReglaNegocio('IMPORTACION_CON_ERRORES', `El archivo tiene ${p.errores} filas con error. Corríjalas o confirme explícitamente importar solo las válidas (ANEXO_A §3.3).`);
  }
  const importador = exigirImportador(p.plantilla);
  resolverAmbito(ctx, p.ambito.entidadId, p.ambito.ejercicioId, importador);

  // Se conserva ANTES de escribir: la evidencia debe existir para que las filas
  // que la citan (SIN_SOPORTE de PL-05) puedan apuntar a ella.
  const conservado = conservarArchivo(ctx, p.ambito.entidadId, p.plantilla, p.archivo);
  const archivo: ArchivoImportado = {
    nombre: basename(p.archivo),
    conservado,
    hashSha256: createHash('sha256').update(readFileSync(p.archivo)).digest('hex'),
  };
  const r = importador.aplicar(p.ambito, p.lectura, ctx, archivo);
  const omitidos = p.lectura.resumen.reduce((acc, h) => acc + h.filasConError, 0);

  ctx.bitacora.registrar({
    entidadAfectada: 'entidad',
    registroId: p.ambito.entidadId,
    accion: 'IMPORTAR',
    campo: p.plantilla,
    valorNuevo: `${basename(p.archivo)} → ${r.creados} creados, ${r.actualizados} actualizados, ${omitidos} omitidos. Copia: ${conservado}`,
  });
  previsualizaciones.delete(e.token);
  return { plantilla: p.plantilla, creados: r.creados, actualizados: r.actualizados, omitidos, archivoConservado: conservado };
}
