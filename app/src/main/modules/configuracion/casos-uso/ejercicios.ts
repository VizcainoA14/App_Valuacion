/** RF-01-05, RN-01-01, RN-01-06 — el ejercicio congela los parámetros al abrirse. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { EjercicioDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { ejercicioRepo } from '../repositorio/ejercicio.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { firmanteRepo } from '../repositorio/firmante.repo';
import { exigirEntidad } from './entidades';

export function listarEjercicios(e: EntradaValidadaDe<'ejercicio:listar'>, ctx: ContextoIpc): EjercicioDto[] {
  return ejercicioRepo.listar(ctx.db, e.entidadId);
}

export function ejercicioPorId(e: EntradaValidadaDe<'ejercicio:porId'>, ctx: ContextoIpc): EjercicioDto | null {
  return ejercicioRepo.porId(ctx.db, e.id);
}

export function hoyIso(ctx: ContextoIpc): string {
  return ctx.ahoraIso().slice(0, 10);
}

export function crearEjercicio(e: EntradaValidadaDe<'ejercicio:crear'>, ctx: ContextoIpc): EjercicioDto {
  const entidad = exigirEntidad(ctx, e.entidadId);
  // ADR-027: ya no se elige a nadie. Quien abre el ejercicio es el
  // representante legal de la entidad, y sus datos ya están en la entidad.
  const firmanteId = firmanteRepo.sincronizar(
    ctx.db,
    e.entidadId,
    { nombreGerente: entidad.nombreGerente, nombreContador: entidad.nombreContador, tarjetaProfesionalContador: entidad.tarjetaProfesionalContador },
    ctx.ahoraIso(),
  );
  if (e.fechaCorte > hoyIso(ctx)) {
    throw new ErrorReglaNegocio('VAL-01-06', 'La fecha de corte no puede ser futura.', { campo: 'fechaCorte' });
  }
  // RN-01-01: copia íntegra de los parámetros vigentes; el motor leerá de aquí.
  const congelados = parametroRepo.obtener(ctx.db, e.entidadId);
  const creado = ejercicioRepo.insertar(ctx.db, {
    id: nuevoId(),
    entidadId: e.entidadId,
    nombre: e.nombre,
    fechaCorte: e.fechaCorte,
    parametrosCongeladosJson: JSON.stringify(congelados),
    contratoNumero: e.contratoNumero,
    creadoPorResponsableId: firmanteId,
    creadoEn: ctx.ahoraIso(),
  });
  ctx.bitacora.registrar({
    ejercicioId: creado.id,
    entidadAfectada: 'ejercicio',
    registroId: creado.id,
    accion: 'CREAR',
    responsableId: firmanteId,
    valorNuevo: `${creado.nombre} · corte ${creado.fechaCorte} · parámetros congelados`,
  });
  return creado;
}

/** RN-01-06: una sola fecha de corte; cambiarla exige justificación y obliga a recalcular todo. */
export function cambiarFechaCorte(e: EntradaValidadaDe<'ejercicio:cambiarFechaCorte'>, ctx: ContextoIpc): EjercicioDto {
  const actual = ejercicioRepo.porId(ctx.db, e.id);
  if (actual === null) throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe.', { campo: 'id' });
  if (e.fechaCorte > hoyIso(ctx)) throw new ErrorReglaNegocio('VAL-01-06', 'La fecha de corte no puede ser futura.', { campo: 'fechaCorte' });
  if (e.fechaCorte === actual.fechaCorte) return actual;

  const actualizado = ejercicioRepo.actualizar(ctx.db, e.id, { fechaCorte: e.fechaCorte });
  ctx.bitacora.registrarCambios(
    { ejercicioId: e.id, entidadAfectada: 'ejercicio', registroId: e.id, justificacion: e.justificacion },
    { fecha_corte: actual.fechaCorte },
    { fecha_corte: actualizado.fechaCorte },
  );
  return actualizado;
}
