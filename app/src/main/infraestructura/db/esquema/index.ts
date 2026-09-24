/**
 * Esquema completo (ADR-028): configuración, inventario vivo con sus barridos,
 * hojas de vida, cortes de cálculo, registro de bajas y bitácora.
 * Es la fuente de los tipos y del SQL de migración (`npm run db:generar`).
 * La búsqueda FTS5 y los triggers no los expresa Drizzle: viven en migraciones SQL propias.
 */
export * from './configuracion';
export * from './inventario';
export * from './hojasVida';
export * from './calculo';
export * from './bajas';
export * from './bitacora';
