import type { RegistroIpc } from '../../../ipc/registroIpc';
import { activarValidados, actualizarPropuesta, cambiarEstadoPropuesta, listarCandidatos, listarPropuestas, proponerBaja, resumenBajas } from '../casos-uso/propuestas';

/** Canales del paso 09 (MOD-11). */
export function registrarCanalesBajas(registro: RegistroIpc): void {
  registro.registrar('baja:candidatos', listarCandidatos);
  registro.registrar('baja:listar', listarPropuestas);
  registro.registrar('baja:resumen', resumenBajas);
  registro.registrar('baja:proponer', proponerBaja);
  registro.registrar('baja:actualizar', actualizarPropuesta);
  registro.registrar('baja:cambiarEstado', cambiarEstadoPropuesta);
  registro.registrar('bien:activarValidados', activarValidados);
}
