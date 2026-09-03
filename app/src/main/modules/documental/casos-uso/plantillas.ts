/**
 * TR-03 — Entrega de plantillas (ANEXO_A §6.1, ADR-026 etapa 2).
 * El hospital obtiene aquí los Excel que debe diligenciar, ya con sus propias
 * clases, sedes y servicios como listas desplegables.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { PlantillaDto, ResultadoDescargaPlantilla } from '../../../../compartido/dtos/plantillas';
import { ErrorValidacion } from '../../../../compartido/errores';
import { PLANTILLAS, plantillaPorCodigo, type DefinicionPlantillaEntregable } from '../../../infraestructura/documental/excel/catalogoPlantillas';
import { entregarPlantilla, type CatalogosEntidad, type DatosMembrete } from '../../../infraestructura/documental/excel/entregarPlantilla';

function rutaOrigen(ctx: ContextoIpc, plantilla: DefinicionPlantillaEntregable): string {
  return join(ctx.rutaPlantillas, plantilla.formato === 'xlsx' ? 'excel' : 'word', plantilla.archivo);
}

function aDto(ctx: ContextoIpc, p: DefinicionPlantillaEntregable): PlantillaDto {
  return {
    codigo: p.codigo,
    archivo: p.archivo,
    formato: p.formato,
    nombre: p.nombre,
    proposito: p.proposito,
    paso: p.paso,
    etapa: p.etapa,
    seDiligencia: p.seDiligencia,
    importable: p.importable,
    catalogosInyectados: [...new Set((p.listas ?? []).map((l) => l.catalogo))],
    disponible: existsSync(rutaOrigen(ctx, p)),
  };
}

export function listarPlantillas(_e: EntradaValidadaDe<'plantilla:listar'>, ctx: ContextoIpc): PlantillaDto[] {
  return PLANTILLAS.map((p) => aDto(ctx, p));
}

/** Catálogos reales del hospital; vacíos si aún no hay entidad configurada. */
function catalogosDe(ctx: ContextoIpc, entidadId: string | null): CatalogosEntidad {
  if (entidadId === null) return { clases: [], sedes: [], servicios: [], responsables: [] };
  const columna = (sql: string): string[] => (ctx.sqlite.prepare(sql).all(entidadId) as { v: string }[]).map((f) => f.v);
  return {
    clases: columna(`SELECT nombre AS v FROM clase_activo WHERE entidad_id = ? AND activo = 1 ORDER BY codigo`),
    sedes: columna(`SELECT codigo AS v FROM sede WHERE entidad_id = ? AND activa = 1 ORDER BY codigo`),
    servicios: columna(`SELECT DISTINCT v.nombre AS v FROM servicio v JOIN sede s ON s.id = v.sede_id WHERE s.entidad_id = ? AND v.activo = 1 AND s.activa = 1 ORDER BY v.nombre`),
    responsables: columna(`SELECT nombre_completo AS v FROM responsable WHERE entidad_id = ? AND activo = 1 ORDER BY nombre_completo`),
  };
}

function membreteDe(ctx: ContextoIpc, entidadId: string | null, ejercicioId: string | null): DatosMembrete {
  const entidad = entidadId === null ? undefined : (ctx.sqlite.prepare('SELECT razon_social FROM entidad WHERE id = ?').get(entidadId) as { razon_social: string } | undefined);
  const ejercicio = ejercicioId === null ? undefined : (ctx.sqlite.prepare('SELECT fecha_corte FROM ejercicio WHERE id = ?').get(ejercicioId) as { fecha_corte: string } | undefined);
  return { razonSocial: entidad?.razon_social ?? '', fechaCorte: ejercicio?.fecha_corte ?? null };
}

function exigirPlantilla(codigo: string): DefinicionPlantillaEntregable {
  const p = plantillaPorCodigo(codigo);
  if (p === undefined) throw new ErrorValidacion('PLANTILLA_DESCONOCIDA', `No existe la plantilla ${codigo}.`, { campo: 'codigo' });
  return p;
}

export async function descargarPlantilla(e: EntradaValidadaDe<'plantilla:descargar'>, ctx: ContextoIpc): Promise<ResultadoDescargaPlantilla | null> {
  const plantilla = exigirPlantilla(e.codigo);
  const destino = await ctx.dialogos.elegirDondeGuardar(`Guardar ${plantilla.codigo} — ${plantilla.nombre}`, plantilla.archivo);
  if (destino === null) return null;

  const r = await entregarPlantilla(plantilla, rutaOrigen(ctx, plantilla), destino, catalogosDe(ctx, e.entidadId ?? null), membreteDe(ctx, e.entidadId ?? null, e.ejercicioId ?? null));
  ctx.dialogos.revelarEnCarpeta(r.rutaDestino);
  return { codigo: plantilla.codigo, ruta: r.rutaDestino, catalogosInyectados: r.catalogosInyectados, filasEjemploConservadas: plantilla.formato === 'xlsx' };
}

export async function descargarPaquetePlantillas(
  e: EntradaValidadaDe<'plantilla:descargarPaquete'>,
  ctx: ContextoIpc,
): Promise<{ carpeta: string; entregadas: ResultadoDescargaPlantilla[] } | null> {
  const plantillas = e.codigos.map(exigirPlantilla);
  const carpeta = await ctx.dialogos.elegirCarpeta('Elija dónde guardar las plantillas');
  if (carpeta === null) return null;

  const catalogos = catalogosDe(ctx, e.entidadId ?? null);
  const membrete = membreteDe(ctx, e.entidadId ?? null, e.ejercicioId ?? null);
  const entregadas: ResultadoDescargaPlantilla[] = [];
  for (const plantilla of plantillas) {
    const r = await entregarPlantilla(plantilla, rutaOrigen(ctx, plantilla), join(carpeta, plantilla.archivo), catalogos, membrete);
    entregadas.push({ codigo: plantilla.codigo, ruta: r.rutaDestino, catalogosInyectados: r.catalogosInyectados, filasEjemploConservadas: plantilla.formato === 'xlsx' });
  }
  ctx.dialogos.revelarEnCarpeta(entregadas[0]?.ruta ?? carpeta);
  return { carpeta, entregadas };
}
