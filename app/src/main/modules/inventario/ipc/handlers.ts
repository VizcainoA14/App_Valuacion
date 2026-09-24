import type { RegistroIpc } from '../../../ipc/registroIpc';
import { listarBienes, bienPorId, idsDelFiltro, coberturaInventario, listarBarridos, marcarObsolescenciaFuncional } from '../casos-uso/listarBienes';

/** Canales del inventario vivo (MOD-03, ADR-028). */
export function registrarCanalesInventario(registro: RegistroIpc): void {
  registro.registrar('bien:listar', listarBienes);
  registro.registrar('bien:porId', bienPorId);
  registro.registrar('bien:idsDelFiltro', idsDelFiltro);
  registro.registrar('bien:cobertura', coberturaInventario);
  registro.registrar('bien:marcarObsolescenciaFuncional', marcarObsolescenciaFuncional);
  registro.registrar('barrido:listar', listarBarridos);
}
