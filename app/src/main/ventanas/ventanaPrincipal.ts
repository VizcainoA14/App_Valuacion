import { BrowserWindow, app } from 'electron';
import { join } from 'node:path';
import { crearPreferenciasWebSeguras } from '../seguridad/opcionesVentana';

/** Segunda instancia (T-B-06): se trae al frente la ventana existente. */
export function enfocarVentanaPrincipal(): void {
  const ventana = BrowserWindow.getAllWindows()[0];
  if (ventana === undefined) return;
  if (ventana.isMinimized()) ventana.restore();
  ventana.focus();
}

export function crearVentanaPrincipal(): BrowserWindow {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Valuación de Activos',
    webPreferences: {
      ...crearPreferenciasWebSeguras(app.isPackaged),
      preload: join(import.meta.dirname, '../preload/index.cjs'),
    },
  });

  ventana.on('ready-to-show', () => ventana.show());

  const urlDev = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && urlDev !== undefined) {
    void ventana.loadURL(urlDev);
  } else {
    void ventana.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  }

  return ventana;
}
