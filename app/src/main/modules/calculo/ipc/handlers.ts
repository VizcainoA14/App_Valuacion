import type { RegistroIpc } from '../../../ipc/registroIpc';
import { calcularCorte } from '../casos-uso/calcularCorte';
import { corteActual, cortePorId, listarCalculo, listarExclusiones, resumenCalculo } from '../casos-uso/consultarCalculo';

/** Canales del cálculo del proceso (MOD-07/08, ADR-029). */
export function registrarCanalesCalculo(registro: RegistroIpc): void {
  registro.registrar('corte:actual', corteActual);
  registro.registrar('corte:porId', cortePorId);
  registro.registrar('calculo:ejecutar', calcularCorte);
  registro.registrar('calculo:resumen', resumenCalculo);
  registro.registrar('calculo:listar', listarCalculo);
  registro.registrar('calculo:exclusiones', listarExclusiones);
}
