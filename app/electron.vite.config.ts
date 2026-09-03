import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { CSP_PRODUCCION, CSP_DESARROLLO } from './src/main/seguridad/csp';

// Objetivos de compilación (plan FASE_3/3.2 §4):
//  - JS del renderer: el Chromium 152 real de Electron 44 (entorno [electron]).
//  - CSS: SIEMPRE el piso conservador R-05 (entorno por defecto): el CSS roto no
//    lanza errores, simplemente no se aplica.
const objetivoElectron = browserslistToEsbuild(['electron 44.0']);
const objetivoPiso = browserslistToEsbuild();

// Con carga por file:// no hay encabezados HTTP: la CSP viaja como <meta>.
// En desarrollo se relaja solo lo que exige el HMR de Vite (ver csp.ts).
function inyectarCsp(csp: string, aplicar: 'build' | 'serve'): Plugin {
  return {
    name: `inyectar-csp-${aplicar}`,
    apply: aplicar,
    transformIndexHtml: (html) =>
      html.replace(
        '<!--csp-->',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      ),
  };
}

const alias = {
  '@compartido': resolve(__dirname, 'src/compartido'),
  '@motor': resolve(__dirname, 'src/compartido/motor'),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { ...alias, '@main': resolve(__dirname, 'src/main') } },
    build: { sourcemap: true },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      sourcemap: true,
      // El preload corre con sandbox: true y el sandbox solo carga CommonJS.
      rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    plugins: [
      react(),
      inyectarCsp(CSP_PRODUCCION, 'build'),
      inyectarCsp(CSP_DESARROLLO, 'serve'),
    ],
    resolve: { alias: { ...alias, '@renderer': resolve(__dirname, 'src/renderer') } },
    build: {
      target: objetivoElectron,
      cssTarget: objetivoPiso,
      sourcemap: true,
      minify: 'esbuild',
    },
  },
});
