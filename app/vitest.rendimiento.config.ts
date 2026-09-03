import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Mediciones de rendimiento (`RNF-01`, `RNF-02`). Configuración independiente —no
 * `mergeConfig`, que concatenaría los `include` de la base y arrastraría toda la
 * suite— y sin paralelismo entre archivos: una medición que compite por CPU con
 * el resto de los tests no mide lo que dice medir.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@compartido': resolve(import.meta.dirname, 'src/compartido'),
      '@motor': resolve(import.meta.dirname, 'src/compartido/motor'),
      '@main': resolve(import.meta.dirname, 'src/main'),
      '@renderer': resolve(import.meta.dirname, 'src/renderer'),
    },
  },
  test: {
    include: ['src/**/*.perf.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 180_000,
  },
});
