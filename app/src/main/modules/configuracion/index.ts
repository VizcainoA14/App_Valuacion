/** MOD-02 configuración (paso 01) — única superficie pública del módulo (regla D-6). */
export { registrarCanalesConfiguracion } from './ipc/handlers';
export { PREDICADOS_PASO_01 } from './validaciones/val-01';
export { IMPORTADORES_PASO_01 } from './importacion/importarPaso01';
/** ADR-027: quien deba atribuir una firma pregunta aquí, no al catálogo. */
export { firmanteRepo } from './repositorio/firmante.repo';
