import type { App } from 'electron';

/**
 * Una sola instancia por máquina (plan 2.1 §128): si ya hay una abierta, se
 * enfoca su ventana en lugar de abrir otra sobre la misma base.
 * Devuelve false cuando esta instancia debe salir.
 */
export function asegurarInstanciaUnica(aplicacion: App, enfocarVentana: () => void): boolean {
  if (!aplicacion.requestSingleInstanceLock()) return false;
  aplicacion.on('second-instance', () => enfocarVentana());
  return true;
}
