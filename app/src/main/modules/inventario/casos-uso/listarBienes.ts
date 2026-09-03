import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { BienDto, BienListadoDto, Cobertura, Pagina } from '../../../../compartido/dtos/inventario';
import { bienRepo } from '../repositorio/bien.repo';

export function listarBienes(e: EntradaValidadaDe<'bien:listar'>, ctx: ContextoIpc): Pagina<BienListadoDto> {
  return bienRepo.listar(ctx.sqlite, e.ejercicioId, e.filtros, e.orden, e.pagina, e.tamano);
}

export function bienPorId(e: EntradaValidadaDe<'bien:porId'>, ctx: ContextoIpc): BienDto | null {
  return bienRepo.porId(ctx.sqlite, e.id);
}

/** "Seleccionar todo lo que cumple el filtro", no solo la página visible (TR-10). */
export function idsDelFiltro(e: EntradaValidadaDe<'bien:idsDelFiltro'>, ctx: ContextoIpc): string[] {
  return bienRepo.idsDelFiltro(ctx.sqlite, e.ejercicioId, e.filtros);
}

export function coberturaInventario(e: EntradaValidadaDe<'bien:cobertura'>, ctx: ContextoIpc): Cobertura {
  return bienRepo.cobertura(ctx.sqlite, e.entidadId, e.ejercicioId);
}
