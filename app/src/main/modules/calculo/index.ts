/** MOD-07/08 cálculo por cortes — única superficie pública del módulo (regla D-6). */
export { registrarCanalesCalculo } from './ipc/handlers';
export { calcularCorte } from './casos-uso/calcularCorte';
export { exigirCorte, resumenCalculo, listarCalculo } from './casos-uso/consultarCalculo';
