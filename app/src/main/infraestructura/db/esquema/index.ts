/**
 * Esquema completo (T-B-03): las 44 entidades de ANEXO_B §1 más el sello de cierre.
 * Es la fuente de los tipos y del SQL de migración (`npm run db:generar`).
 * La búsqueda FTS5 y los triggers no los expresa Drizzle: viven en migraciones SQL propias.
 */
export * from './configuracion';
export * from './inventario';
export * from './hojasVida';
export * from './conciliacion';
export * from './calculo';
export * from './valuacion';
export * from './inmuebles';
export * from './bajas';
export * from './consolidacion';
export * from './cierre';
export * from './bitacora';
