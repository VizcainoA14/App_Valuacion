/** RF-01-01 — sedes y servicios (IN-01-02, IN-01-03). */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { SedeDto, ServicioDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { sedeRepo, type NuevaSede } from '../repositorio/sede.repo';
import { servicioRepo, type NuevoServicio } from '../repositorio/servicio.repo';
import { exigirProceso } from './procesos';

/** Zod deja `undefined` en las claves ausentes del parcial; el repositorio solo recibe las presentes. */
function soloPresentes<T>(cambios: object): T {
  return Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)) as T;
}

function proyectar(dto: object, claves: string[]): Record<string, unknown> {
  const f = dto as Record<string, unknown>;
  return Object.fromEntries(claves.map((k) => [k, f[k]]));
}

export function listarSedes(e: EntradaValidadaDe<'sede:listar'>, ctx: ContextoIpc): SedeDto[] {
  return sedeRepo.listar(ctx.db, e.procesoId, e.incluirInactivas);
}

export function crearSede(e: EntradaValidadaDe<'sede:crear'>, ctx: ContextoIpc): SedeDto {
  exigirProceso(ctx, e.procesoId);
  if (sedeRepo.porCodigo(ctx.db, e.procesoId, e.codigo) !== null) {
    throw new ErrorReglaNegocio('SEDE_DUPLICADA', `Ya existe una sede con código ${e.codigo}.`, { campo: 'codigo' });
  }
  const ahora = ctx.ahoraIso();
  const creada = sedeRepo.insertar(ctx.db, { id: nuevoId(), ...e, creadoEn: ahora, actualizadoEn: ahora });
  ctx.bitacora.registrar({ entidadAfectada: 'sede', registroId: creada.id, accion: 'CREAR', valorNuevo: `${creada.codigo} ${creada.nombre}` });
  return creada;
}

export function actualizarSede(e: EntradaValidadaDe<'sede:actualizar'>, ctx: ContextoIpc): SedeDto {
  const actual = sedeRepo.porId(ctx.db, e.id);
  if (actual === null) throw new ErrorValidacion('SEDE_INEXISTENTE', 'La sede no existe.', { campo: 'id' });
  const presentes = soloPresentes<Partial<NuevaSede>>(e.cambios);
  if (presentes.codigo !== undefined && presentes.codigo !== actual.codigo && sedeRepo.porCodigo(ctx.db, actual.procesoId, presentes.codigo) !== null) {
    throw new ErrorReglaNegocio('SEDE_DUPLICADA', 'Otra sede ya tiene ese código.', { campo: 'codigo' });
  }
  const actualizada = sedeRepo.actualizar(ctx.db, e.id, presentes, ctx.ahoraIso());
  ctx.bitacora.registrarCambios({ entidadAfectada: 'sede', registroId: e.id }, actual as unknown as Record<string, unknown>, proyectar(actualizada, Object.keys(presentes)));
  return actualizada;
}

export function listarServicios(e: EntradaValidadaDe<'servicio:listar'>, ctx: ContextoIpc): ServicioDto[] {
  return servicioRepo.listarPorProceso(ctx.db, e.procesoId, e.incluirInactivos);
}

export function crearServicio(e: EntradaValidadaDe<'servicio:crear'>, ctx: ContextoIpc): ServicioDto {
  if (sedeRepo.porId(ctx.db, e.sedeId) === null) throw new ErrorValidacion('SEDE_INEXISTENTE', 'La sede no existe.', { campo: 'sedeId' });
  if (servicioRepo.porCodigo(ctx.db, e.sedeId, e.codigo) !== null) {
    throw new ErrorReglaNegocio('SERVICIO_DUPLICADO', `Ya existe un servicio con código ${e.codigo} en esa sede.`, { campo: 'codigo' });
  }
  const ahora = ctx.ahoraIso();
  const creado = servicioRepo.insertar(ctx.db, { id: nuevoId(), ...e, creadoEn: ahora, actualizadoEn: ahora });
  ctx.bitacora.registrar({ entidadAfectada: 'servicio', registroId: creado.id, accion: 'CREAR', valorNuevo: `${creado.codigo} ${creado.nombre}` });
  return creado;
}

export function actualizarServicio(e: EntradaValidadaDe<'servicio:actualizar'>, ctx: ContextoIpc): ServicioDto {
  const actual = servicioRepo.porId(ctx.db, e.id);
  if (actual === null) throw new ErrorValidacion('SERVICIO_INEXISTENTE', 'El servicio no existe.', { campo: 'id' });
  const presentes = soloPresentes<Partial<NuevoServicio>>(e.cambios);
  if (presentes.codigo !== undefined && presentes.codigo !== actual.codigo && servicioRepo.porCodigo(ctx.db, actual.sedeId, presentes.codigo) !== null) {
    throw new ErrorReglaNegocio('SERVICIO_DUPLICADO', 'Otro servicio de la sede ya tiene ese código.', { campo: 'codigo' });
  }
  const actualizado = servicioRepo.actualizar(ctx.db, e.id, presentes, ctx.ahoraIso());
  ctx.bitacora.registrarCambios({ entidadAfectada: 'servicio', registroId: e.id }, actual as unknown as Record<string, unknown>, proyectar(actualizado, Object.keys(presentes)));
  return actualizado;
}
