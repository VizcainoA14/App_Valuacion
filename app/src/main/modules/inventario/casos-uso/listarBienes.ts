import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { BarridoDto, BienDto, BienListadoDto, Cobertura, Pagina } from '../../../../compartido/dtos/inventario';
import { ErrorValidacion } from '../../../../compartido/errores';
import { bienRepo } from '../repositorio/bien.repo';

export function listarBienes(e: EntradaValidadaDe<'bien:listar'>, ctx: ContextoIpc): Pagina<BienListadoDto> {
  return bienRepo.listar(ctx.sqlite, e.procesoId, e.filtros, e.orden, e.pagina, e.tamano);
}

export function bienPorId(e: EntradaValidadaDe<'bien:porId'>, ctx: ContextoIpc): BienDto | null {
  return bienRepo.porId(ctx.sqlite, e.id);
}

/** "Seleccionar todo lo que cumple el filtro", no solo la página visible (TR-10). */
export function idsDelFiltro(e: EntradaValidadaDe<'bien:idsDelFiltro'>, ctx: ContextoIpc): string[] {
  return bienRepo.idsDelFiltro(ctx.sqlite, e.procesoId, e.filtros);
}

export function coberturaInventario(e: EntradaValidadaDe<'bien:cobertura'>, ctx: ContextoIpc): Cobertura {
  return bienRepo.cobertura(ctx.sqlite, e.procesoId);
}

export function listarBarridos(e: EntradaValidadaDe<'barrido:listar'>, ctx: ContextoIpc): BarridoDto[] {
  return bienRepo.barridos(ctx.sqlite, e.procesoId);
}

/**
 * RN-05-03 — la obsolescencia funcional la declara una persona (el ingeniero
 * biomédico, el de sistemas): el equipo funciona pero ya no sirve para lo que
 * se necesita. No la calcula el motor; la usa. Vale para los cortes que vengan.
 */
export function marcarObsolescenciaFuncional(e: EntradaValidadaDe<'bien:marcarObsolescenciaFuncional'>, ctx: ContextoIpc): BienDto {
  const antes = bienRepo.porId(ctx.sqlite, e.bienId);
  if (antes === null) throw new ErrorValidacion('BIEN_INEXISTENTE', 'El bien no existe.', { campo: 'bienId' });
  bienRepo.marcarObsolescenciaFuncional(ctx.sqlite, e.bienId, e.funcional, e.justificacion, ctx.ahoraIso());
  ctx.bitacora.registrar({
    entidadAfectada: 'bien',
    registroId: e.bienId,
    accion: 'ACTUALIZAR',
    campo: 'obsolescencia_funcional',
    valorAnterior: antes.obsolescenciaFuncional ? 'true' : 'false',
    valorNuevo: e.funcional ? 'true' : 'false',
    justificacion: e.justificacion,
  });
  const despues = bienRepo.porId(ctx.sqlite, e.bienId);
  if (despues === null) throw new ErrorValidacion('BIEN_INEXISTENTE', 'El bien no existe.', { campo: 'bienId' });
  return despues;
}
