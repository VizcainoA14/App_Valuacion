/** RF-01-01, RF-01-03, RN-01-03 — clases de activo con vidas útiles independientes. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ClaseActivoDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { claseRepo, aniosAX10k, type NuevaClase } from '../repositorio/clase.repo';
import { exigirProceso, precargarClasesSugeridas } from './procesos';

export function listarClases(e: EntradaValidadaDe<'clase:listar'>, ctx: ContextoIpc): ClaseActivoDto[] {
  return claseRepo.listar(ctx.db, e.procesoId, e.incluirInactivas);
}

export function crearClase(e: EntradaValidadaDe<'clase:crear'>, ctx: ContextoIpc): ClaseActivoDto {
  exigirProceso(ctx, e.procesoId);
  if (claseRepo.porCodigo(ctx.db, e.procesoId, e.codigo) !== null) {
    throw new ErrorReglaNegocio('CLASE_DUPLICADA', `Ya existe una clase con código ${e.codigo}.`, { campo: 'codigo' });
  }
  const ahora = ctx.ahoraIso();
  const { vidaUtilTecnicaAnios, ...resto } = e;
  const creada = claseRepo.insertar(ctx.db, { id: nuevoId(), ...resto, vidaUtilTecnicaAnios: aniosAX10k(vidaUtilTecnicaAnios), creadoEn: ahora, actualizadoEn: ahora });
  ctx.bitacora.registrar({ entidadAfectada: 'clase_activo', registroId: creada.id, accion: 'CREAR', valorNuevo: `${creada.codigo} ${creada.nombre}` });
  return creada;
}

export function actualizarClase(e: EntradaValidadaDe<'clase:actualizar'>, ctx: ContextoIpc): ClaseActivoDto {
  const actual = claseRepo.porId(ctx.db, e.id);
  if (actual === null) throw new ErrorValidacion('CLASE_INEXISTENTE', 'La clase no existe.', { campo: 'id' });
  const presentes = Object.fromEntries(Object.entries(e.cambios).filter(([, v]) => v !== undefined)) as Partial<typeof e.cambios>;
  if (presentes.codigo !== undefined && presentes.codigo !== actual.codigo && claseRepo.porCodigo(ctx.db, actual.procesoId, presentes.codigo) !== null) {
    throw new ErrorReglaNegocio('CLASE_DUPLICADA', 'Otra clase ya tiene ese código.', { campo: 'codigo' });
  }
  const cambiosFisicos: Partial<NuevaClase> = { ...presentes } as Partial<NuevaClase>;
  if ('vidaUtilTecnicaAnios' in presentes) cambiosFisicos.vidaUtilTecnicaAnios = aniosAX10k(presentes.vidaUtilTecnicaAnios);

  const actualizada = claseRepo.actualizar(ctx.db, e.id, cambiosFisicos, ctx.ahoraIso());
  // Cambiar una vida útil vale para los cortes que vengan; los ya calculados conservan la suya (ANEXO_C §10). Queda en bitácora.
  ctx.bitacora.registrarCambios(
    { entidadAfectada: 'clase_activo', registroId: e.id, justificacion: e.justificacion },
    actual as unknown as Record<string, unknown>,
    Object.fromEntries(Object.keys(presentes).map((k) => [k, (actualizada as unknown as Record<string, unknown>)[k]])),
  );
  return actualizada;
}

export function precargarSugeridas(e: EntradaValidadaDe<'clase:precargarSugeridas'>, ctx: ContextoIpc): { creadas: number; omitidas: number } {
  exigirProceso(ctx, e.procesoId);
  const r = precargarClasesSugeridas(ctx, e.procesoId);
  if (r.creadas > 0) {
    ctx.bitacora.registrar({ entidadAfectada: 'clase_activo', registroId: e.procesoId, accion: 'IMPORTAR', valorNuevo: `Catálogo sugerido: ${r.creadas} clases creadas, ${r.omitidas} ya existían` });
  }
  return r;
}
