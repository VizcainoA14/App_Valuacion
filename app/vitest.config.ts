import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

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
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/integracion/**/*.test.ts'],
    // Las mediciones de rendimiento van aparte: en paralelo compiten por CPU y no
    // miden lo que dicen medir. Ver `npm run test:rendimiento`.
    exclude: ['**/node_modules/**', '**/*.perf.test.ts'],
    environment: 'node',
  },
});
