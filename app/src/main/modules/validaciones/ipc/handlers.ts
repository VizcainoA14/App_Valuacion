import type { RegistroIpc } from '../../../ipc/registroIpc';
import { evaluarPaso, registrarPredicados, type MapaPredicados } from '../motor';

let predicadosRegistrados = false;

/**
 * Registra el canal único de validaciones. Los predicados llegan **desde fuera**:
 * si este módulo importara los de cada dominio se formaría un ciclo
 * (dominio → motor → dominio) que deja `falla` sin definir en tiempo de carga.
 * La infraestructura (`ipc/registrarHandlers.ts`) es quien los reúne.
 */
export function registrarCanalesValidaciones(registro: RegistroIpc, predicados: readonly MapaPredicados[]): void {
  if (!predicadosRegistrados) {
    for (const mapa of predicados) registrarPredicados(mapa);
    predicadosRegistrados = true;
  }
  registro.registrar('validaciones:evaluar', (e, ctx) => evaluarPaso(e.paso, e.entidadId, e.ejercicioId ?? null, ctx));
}
