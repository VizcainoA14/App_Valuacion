/**
 * T-A-07 — Prueba de configuración segura de Electron (Fase 7).
 * Verifica las opciones de BrowserWindow, la CSP y el bloqueo de navegación
 * sin arrancar Electron: por eso son datos y funciones puras.
 */
import { describe, expect, it } from 'vitest';
import { crearPreferenciasWebSeguras } from './opcionesVentana';
import { CSP_PRODUCCION, CSP_DESARROLLO } from './csp';
import { esNavegacionPermitida } from './endurecerApp';

describe('crearPreferenciasWebSeguras (R-02)', () => {
  const prefs = crearPreferenciasWebSeguras(true);

  it('aísla el contexto', () => {
    expect(prefs.contextIsolation).toBe(true);
  });

  it('no integra Node en el renderer', () => {
    expect(prefs.nodeIntegration).toBe(false);
  });

  it('activa el sandbox', () => {
    expect(prefs.sandbox).toBe(true);
  });

  it('mantiene webSecurity y bloquea contenido inseguro', () => {
    expect(prefs.webSecurity).toBe(true);
    expect(prefs.allowRunningInsecureContent).toBe(false);
    expect(prefs.experimentalFeatures).toBe(false);
  });

  it('desactiva devTools en la app empaquetada y los permite en desarrollo', () => {
    expect(crearPreferenciasWebSeguras(true).devTools).toBe(false);
    expect(crearPreferenciasWebSeguras(false).devTools).toBe(true);
  });
});

describe('Content-Security-Policy', () => {
  it('producción: solo scripts propios, sin unsafe-inline ni unsafe-eval', () => {
    expect(CSP_PRODUCCION).toContain("default-src 'self'");
    expect(CSP_PRODUCCION).toMatch(/script-src 'self'(;|$)/);
    expect(CSP_PRODUCCION).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(CSP_PRODUCCION).not.toContain('unsafe-eval');
  });

  it('producción: bloquea objetos, formularios y base-uri (frame-ancestors no aplica en <meta>)', () => {
    expect(CSP_PRODUCCION).toContain("object-src 'none'");
    expect(CSP_PRODUCCION).toContain("form-action 'none'");
    expect(CSP_PRODUCCION).toContain("base-uri 'none'");
    expect(CSP_PRODUCCION).not.toContain('frame-ancestors');
  });

  it('desarrollo: relaja solo lo que exige el HMR de Vite', () => {
    expect(CSP_DESARROLLO).toContain("default-src 'self'");
    expect(CSP_DESARROLLO).toContain('ws://localhost:*');
    expect(CSP_DESARROLLO).not.toContain('unsafe-eval');
  });
});

describe('esNavegacionPermitida (bloqueo de navegación)', () => {
  it('permite el renderer empaquetado (file://)', () => {
    expect(esNavegacionPermitida('file:///C:/app/out/renderer/index.html')).toBe(true);
  });

  it('permite el servidor de desarrollo cuando está definido', () => {
    expect(esNavegacionPermitida('http://localhost:5173/', 'http://localhost:5173')).toBe(true);
  });

  it('bloquea cualquier URL externa', () => {
    expect(esNavegacionPermitida('https://ejemplo.com')).toBe(false);
    expect(esNavegacionPermitida('http://localhost:5173/', undefined)).toBe(false);
    expect(esNavegacionPermitida('javascript:alert(1)')).toBe(false);
  });
});
