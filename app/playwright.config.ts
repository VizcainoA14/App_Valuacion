import { defineConfig } from '@playwright/test';

// E2E sobre la aplicación construida (out/) o empaquetada (dist/win-unpacked)
// cuando PROBAR_PAQUETE=1. CI empaqueta primero y prueba el paquete real (RG-06).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
  },
});
