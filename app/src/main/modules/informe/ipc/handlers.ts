import type { RegistroIpc } from '../../../ipc/registroIpc';
import { generarInformePdf, previsualizarInforme } from '../casos-uso/generarInforme';

/** Canales de la entrega (etapa 6 de ADR-026). */
export function registrarCanalesInforme(registro: RegistroIpc): void {
  registro.registrar('informe:previsualizar', previsualizarInforme);
  registro.registrar('informe:generar', generarInformePdf);
}
