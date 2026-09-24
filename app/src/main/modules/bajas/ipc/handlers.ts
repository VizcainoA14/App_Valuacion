import type { RegistroIpc } from '../../../ipc/registroIpc';
import { anularBaja, listarBajas, listarCandidatos, registrarBaja } from '../casos-uso/bajas';

/** Canales de las bajas (MOD-11, ADR-028). */
export function registrarCanalesBajas(registro: RegistroIpc): void {
  registro.registrar('baja:candidatos', listarCandidatos);
  registro.registrar('baja:listar', listarBajas);
  registro.registrar('baja:registrar', registrarBaja);
  registro.registrar('baja:anular', anularBaja);
}
