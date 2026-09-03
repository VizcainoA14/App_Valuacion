import { abrirSqlite, crearBaseDatos, type BaseDatos, type ConexionSqlite } from './conexion';
import { migrar, type ResultadoMigracion } from './migrador';
import { MIGRACIONES } from './migraciones';
import { crearRespaldoVerificado, rutaRespaldo } from './respaldo';

export * from './conexion';
export * from './migrador';
export * from './respaldo';
export * from './identificadores';
export { MIGRACIONES } from './migraciones';
export * as esquema from './esquema';

export interface BaseDatosAbierta {
  readonly sqlite: ConexionSqlite;
  readonly db: BaseDatos;
  readonly migracion: ResultadoMigracion;
}

/**
 * Abre la base y la lleva a la versión de la aplicación. Si ya tenía datos y hay
 * migraciones pendientes, primero deja un respaldo verificado (RG-11).
 * `ahoraIso` se inyecta para que el nombre del respaldo sea reproducible en pruebas.
 */
export async function prepararBaseDatos(
  rutaArchivo: string,
  directorioRespaldos: string,
  ahoraIso: () => string,
): Promise<BaseDatosAbierta> {
  const sqlite = abrirSqlite(rutaArchivo);
  const migracion = await migrar(sqlite, MIGRACIONES, {
    antesDeMigrar: async (desde, hasta) => {
      const destino = rutaRespaldo(directorioRespaldos, `pre-migracion-v${desde}-a-v${hasta}`, ahoraIso());
      await crearRespaldoVerificado(sqlite, destino);
    },
  });
  return { sqlite, db: crearBaseDatos(sqlite), migracion };
}
