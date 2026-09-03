import type { RegistroIpc } from '../../../ipc/registroIpc';
import { calcularEjercicio } from '../casos-uso/calcularEjercicio';
import { listarCalculo, marcarObsolescenciaFuncional, resumenCalculo } from '../casos-uso/consultarCalculo';

/** Canales de los pasos 05 y 06 (MOD-07/08). */
export function registrarCanalesCalculo(registro: RegistroIpc): void {
  registro.registrar('calculo:ejecutar', calcularEjercicio);
  registro.registrar('calculo:resumen', resumenCalculo);
  registro.registrar('calculo:listar', listarCalculo);
  registro.registrar('calculo:marcarObsolescenciaFuncional', marcarObsolescenciaFuncional);
}
