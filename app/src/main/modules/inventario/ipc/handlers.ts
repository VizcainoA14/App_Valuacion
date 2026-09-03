import type { RegistroIpc } from '../../../ipc/registroIpc';
import { listarBienes, bienPorId, idsDelFiltro, coberturaInventario } from '../casos-uso/listarBienes';

/** Canales `bien:*` del paso 02 (MOD-03). */
export function registrarCanalesInventario(registro: RegistroIpc): void {
  registro.registrar('bien:listar', listarBienes);
  registro.registrar('bien:porId', bienPorId);
  registro.registrar('bien:idsDelFiltro', idsDelFiltro);
  registro.registrar('bien:cobertura', coberturaInventario);
}
