import type { RegistroIpc } from '../../../ipc/registroIpc';
import {
  listarResponsables,
  crearResponsable,
  actualizarResponsable,
  desactivarResponsable,
} from '../casos-uso/responsables';

/** Canales `responsable:*` (TR-12). Cada uno es solo su caso de uso: el middleware pone el resto. */
export function registrarCanalesPlataforma(registro: RegistroIpc): void {
  registro.registrar('responsable:listar', listarResponsables);
  registro.registrar('responsable:crear', crearResponsable);
  registro.registrar('responsable:actualizar', actualizarResponsable);
  registro.registrar('responsable:desactivar', desactivarResponsable);
}
