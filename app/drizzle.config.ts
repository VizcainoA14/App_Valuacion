import { defineConfig } from 'drizzle-kit';

// drizzle-kit solo GENERA el SQL (npm run db:generar). Aplicarlo es tarea del
// migrador propio (src/main/infraestructura/db/migrador.ts), que respalda antes
// y lleva la versión en PRAGMA user_version (plan 2.4 §7).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/infraestructura/db/esquema/index.ts',
  out: './src/main/infraestructura/db/migraciones',
  strict: true,
  verbose: true,
});
