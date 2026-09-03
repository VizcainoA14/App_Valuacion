/**
 * Content-Security-Policy de la aplicación (Fase 7 §CSP; verificada por T-A-07).
 *
 * La política de producción se inyecta como <meta> en el index.html durante la
 * construcción (electron.vite.config.ts): con carga por file:// los encabezados
 * HTTP no existen, la etiqueta meta es el mecanismo efectivo.
 *
 * La de desarrollo relaja solo lo que Vite/HMR necesita (script inline del
 * preámbulo de react-refresh y websocket del servidor de desarrollo).
 */

export const CSP_PRODUCCION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // `frame-ancestors` no aplica en una <meta> (Chromium lo ignora y avisa); el
  // enmarcado lo impide `will-attach-webview` + ventana sin navegación externa.
].join('; ');

export const CSP_DESARROLLO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* http://localhost:*",
].join('; ');
