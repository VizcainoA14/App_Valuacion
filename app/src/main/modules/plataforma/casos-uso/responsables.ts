/**
 * TR-12 — Casos de uso del catálogo de responsables (T-B-07). Sin sesión ni
 * permisos (ADR-016): es un catálogo de personas para atribuir firmas.
 * Un responsable nunca se borra —lo citan bitácora y documentos—: se desactiva.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ResponsableDto } from '../../../../compartido/dtos/responsable';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { responsableRepo, type NuevoResponsable } from '../repositorio/responsable.repo';
import { validarPerfil } from '../validaciones/responsable';

const TABLA = 'responsable';

export function listarResponsables(
  entrada: EntradaValidadaDe<'responsable:listar'>,
  ctx: ContextoIpc,
): ResponsableDto[] {
  return responsableRepo.listar(ctx.db, entrada.entidadId, entrada.incluirInactivos);
}

export function crearResponsable(
  entrada: EntradaValidadaDe<'responsable:crear'>,
  ctx: ContextoIpc,
): ResponsableDto {
  validarPerfil(entrada.perfil, entrada.registroRaa);
  if (responsableRepo.porDocumento(ctx.db, entrada.entidadId, entrada.documentoIdentidad) !== null) {
    throw new ErrorReglaNegocio(
      'RESPONSABLE_DUPLICADO',
      `Ya existe un responsable con documento ${entrada.documentoIdentidad} en esta entidad.`,
      { campo: 'documentoIdentidad' },
    );
  }
  const ahora = ctx.ahoraIso();
  const creado = responsableRepo.insertar(ctx.db, {
    id: nuevoId(),
    entidadId: entrada.entidadId,
    nombreCompleto: entrada.nombreCompleto,
    documentoIdentidad: entrada.documentoIdentidad,
    perfil: entrada.perfil,
    cargo: entrada.cargo,
    tarjetaProfesional: entrada.tarjetaProfesional,
    registroRaa: entrada.registroRaa,
    esExterno: entrada.esExterno || entrada.perfil === 'PERITO',
    activo: true,
    creadoEn: ahora,
    actualizadoEn: ahora,
  });
  ctx.bitacora.registrar({
    entidadAfectada: TABLA,
    registroId: creado.id,
    accion: 'CREAR',
    valorNuevo: `${creado.nombreCompleto} (${creado.perfil})`,
  });
  return creado;
}

export function actualizarResponsable(
  entrada: EntradaValidadaDe<'responsable:actualizar'>,
  ctx: ContextoIpc,
): ResponsableDto {
  const actual = responsableRepo.porId(ctx.db, entrada.id);
  if (actual === null) {
    throw new ErrorValidacion('RESPONSABLE_INEXISTENTE', 'El responsable no existe.', { campo: 'id' });
  }
  const cambios = entrada.cambios;
  validarPerfil(cambios.perfil ?? actual.perfil, cambios.registroRaa === undefined ? actual.registroRaa : cambios.registroRaa);

  if (cambios.documentoIdentidad !== undefined && cambios.documentoIdentidad !== actual.documentoIdentidad) {
    const otro = responsableRepo.porDocumento(ctx.db, actual.entidadId, cambios.documentoIdentidad);
    if (otro !== null && otro.id !== actual.id) {
      throw new ErrorReglaNegocio('RESPONSABLE_DUPLICADO', 'Otro responsable ya tiene ese documento.', {
        campo: 'documentoIdentidad',
      });
    }
  }

  // Zod deja `undefined` en las claves ausentes del parcial; el repositorio solo recibe las presentes.
  const presentes = Object.fromEntries(
    Object.entries(cambios).filter(([, v]) => v !== undefined),
  ) as Partial<NuevoResponsable>;
  const actualizado = responsableRepo.actualizar(ctx.db, entrada.id, presentes, ctx.ahoraIso());
  ctx.bitacora.registrarCambios(
    { entidadAfectada: TABLA, registroId: actual.id, justificacion: entrada.justificacion },
    actual as unknown as Record<string, unknown>,
    proyectar(actualizado, Object.keys(cambios)),
  );
  return actualizado;
}

export function desactivarResponsable(
  entrada: EntradaValidadaDe<'responsable:desactivar'>,
  ctx: ContextoIpc,
): ResponsableDto {
  const actual = responsableRepo.porId(ctx.db, entrada.id);
  if (actual === null) {
    throw new ErrorValidacion('RESPONSABLE_INEXISTENTE', 'El responsable no existe.', { campo: 'id' });
  }
  if (!actual.activo) return actual;
  const actualizado = responsableRepo.actualizar(ctx.db, entrada.id, { activo: false }, ctx.ahoraIso());
  ctx.bitacora.registrar({
    entidadAfectada: TABLA,
    registroId: actual.id,
    accion: 'ACTUALIZAR',
    campo: 'activo',
    valorAnterior: 'true',
    valorNuevo: 'false',
    justificacion: entrada.justificacion,
  });
  return actualizado;
}

function proyectar(dto: ResponsableDto, campos: string[]): Record<string, unknown> {
  const fuente = dto as unknown as Record<string, unknown>;
  return Object.fromEntries(campos.map((c) => [c, fuente[c]]));
}
