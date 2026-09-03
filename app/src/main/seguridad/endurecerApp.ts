import type { App, Session } from 'electron';

/**
 * ¿Se permite navegar a esta URL dentro de una ventana de la app?
 * Solo el propio renderer: file:// empaquetado o el servidor de Vite en desarrollo.
 * Función pura para poder probarla sin Electron (T-A-07).
 */
export function esNavegacionPermitida(urlDestino: string, urlDevServer?: string): boolean {
  if (urlDestino.startsWith('file://')) return true;
  if (urlDevServer !== undefined && urlDestino.startsWith(urlDevServer)) return true;
  return false;
}

/**
 * Endurecimiento global (Fase 7): sin navegación externa, sin ventanas nuevas,
 * sin permisos de plataforma. Se llama una sola vez antes de crear ventanas.
 */
export function endurecerApp(aplicacion: App, urlDevServer?: string): void {
  aplicacion.on('web-contents-created', (_evento, contenido) => {
    contenido.on('will-navigate', (evento, url) => {
      if (!esNavegacionPermitida(url, urlDevServer)) evento.preventDefault();
    });
    contenido.setWindowOpenHandler(() => ({ action: 'deny' }));
    contenido.on('will-attach-webview', (evento) => evento.preventDefault());
  });
}

/** Deniega toda solicitud de permiso del renderer (cámara, geolocalización, etc.). */
export function denegarPermisos(sesion: Session): void {
  sesion.setPermissionRequestHandler((_wc, _permiso, responder) => responder(false));
}
