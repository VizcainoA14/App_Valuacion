/** MOD-07/08 cálculo (pasos 05 y 06) — única superficie pública del módulo (regla D-6). */
export { registrarCanalesCalculo } from './ipc/handlers';
export { calcularEjercicio } from './casos-uso/calcularEjercicio';
export { resumenCalculo, listarCalculo } from './casos-uso/consultarCalculo';
export { PREDICADOS_PASO_05, PREDICADOS_PASO_06 } from './validaciones/val-05-06';
