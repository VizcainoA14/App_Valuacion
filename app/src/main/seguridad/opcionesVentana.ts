import type { BrowserWindowConstructorOptions } from 'electron';

type PreferenciasWeb = NonNullable<BrowserWindowConstructorOptions['webPreferences']>;

/**
 * Configuración segura de toda BrowserWindow de la aplicación (Fase 7; R-02).
 * Es una función pura —recibe si la app está empaquetada, no lo consulta— para
 * que T-A-07 la verifique con un test unitario sin arrancar Electron.
 * Ninguna ventana se crea con otras opciones.
 */
export function crearPreferenciasWebSeguras(esEmpaquetada: boolean): PreferenciasWeb {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    devTools: !esEmpaquetada,
  };
}
