/** Dobles de los diálogos del sistema para las pruebas (P-1: en producción los abre el main). */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DialogosMain } from '../registroIpc';

/** Las plantillas reales del repositorio; en el paquete van en `resources/plantillas`. */
export const RUTA_PLANTILLAS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'Plantillas_Valuacion_Activos');

export function dialogosNulos(): DialogosMain {
  return {
    elegirArchivoExcel: async () => null,
    elegirDondeGuardar: async () => null,
    elegirCarpeta: async () => null,
    revelarEnCarpeta: () => undefined,
  };
}
