import type { RegistroIpc } from '../../../ipc/registroIpc';
import { listarPlantillas, descargarPlantilla, descargarPaquetePlantillas } from '../casos-uso/plantillas';

/** Canales `plantilla:*` (TR-03). Ninguno muta: solo leen catálogos y escriben fuera de la base. */
export function registrarCanalesDocumental(registro: RegistroIpc): void {
  registro.registrar('plantilla:listar', listarPlantillas);
  registro.registrar('plantilla:descargar', descargarPlantilla);
  registro.registrar('plantilla:descargarPaquete', descargarPaquetePlantillas);
}
