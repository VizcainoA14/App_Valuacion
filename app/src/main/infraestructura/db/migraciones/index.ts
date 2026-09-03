/**
 * Las migraciones se incrustan en el paquete del proceso main como texto
 * (`import.meta.glob` con `?raw`): en la app instalada no hay archivos .sql
 * sueltos que puedan faltar o editarse. Los scripts de consola usan
 * `cargarMigracionesDesdeDisco` sobre este mismo directorio.
 */
import { ordenarMigraciones, type Migracion } from '../migrador';

const archivos = import.meta.glob('./*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const MIGRACIONES: readonly Migracion[] = ordenarMigraciones(
  Object.entries(archivos).map(([ruta, sql]) => ({
    nombre: ruta.split('/').pop() ?? ruta,
    sql,
  })),
);
