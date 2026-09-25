import { getTableColumns, getTableName, type Table } from 'drizzle-orm';
import { ErrorInfraestructura } from '../../../compartido/errores';
import { abrirSqlite, crearBaseDatos, type BaseDatos, type ConexionSqlite } from './conexion';
import * as definiciones from './esquema';
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
  try {
    const migracion = await migrar(sqlite, MIGRACIONES, {
      antesDeMigrar: async (desde, hasta) => {
        const destino = rutaRespaldo(directorioRespaldos, `pre-migracion-v${desde}-a-v${hasta}`, ahoraIso());
        await crearRespaldoVerificado(sqlite, destino);
      },
    });
    exigirEsquemaCompatible(sqlite);
    return { sqlite, db: crearBaseDatos(sqlite), migracion };
  } catch (e) {
    // Cerrada, para que quien la reciba pueda apartar el archivo (Windows no deja
    // renombrar un archivo abierto).
    sqlite.close();
    throw e;
  }
}

/**
 * Lo que falta en la base para que sea la de esta aplicación: tablas y columnas
 * del esquema que no existen. `user_version` solo cuenta migraciones; una base
 * de una versión de desarrollo anterior, con sus migraciones regeneradas desde
 * cero (ADR-028, ADR-029), puede tener el mismo número y otras tablas.
 */
export function faltantesDelEsquema(sqlite: ConexionSqlite): string[] {
  const faltantes: string[] = [];
  const tablas = Object.values(definiciones as Record<string, unknown>).filter(
    (v): v is Table => typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in v,
  );
  for (const tabla of tablas) {
    const nombre = getTableName(tabla);
    const columnas = new Set((sqlite.prepare(`PRAGMA table_info("${nombre}")`).all() as { name: string }[]).map((c) => c.name));
    if (columnas.size === 0) {
      faltantes.push(nombre);
      continue;
    }
    for (const c of Object.values(getTableColumns(tabla))) if (!columnas.has(c.name)) faltantes.push(`${nombre}.${c.name}`);
  }
  return faltantes;
}

function exigirEsquemaCompatible(sqlite: ConexionSqlite): void {
  const faltantes = faltantesDelEsquema(sqlite);
  if (faltantes.length > 0) {
    throw new ErrorInfraestructura(
      'ESQUEMA_INCOMPATIBLE',
      `La base de datos es de una versión anterior de la aplicación y no es compatible con esta (le falta: ${faltantes.slice(0, 5).join(', ')}${faltantes.length > 5 ? '…' : ''}).`,
    );
  }
}
