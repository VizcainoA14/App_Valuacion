/**
 * Respaldo diario al primer arranque del día, rotativo (plan 2.4 §8: últimos 10).
 * Usa el respaldo verificado de T-B-03; un respaldo que no verifica no cuenta.
 */
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { ConexionSqlite } from '../infraestructura/db/conexion';
import { crearRespaldoVerificado } from '../infraestructura/db/respaldo';

const PATRON = /^valuacion-diario-(\d{8})\.db$/;

export interface ResultadoRespaldoDiario {
  readonly creado: boolean;
  readonly ruta: string;
  readonly eliminados: readonly string[];
}

export function nombreRespaldoDiario(fechaIso: string): string {
  return `valuacion-diario-${fechaIso.replace(/-/g, '')}.db`;
}

export async function respaldoDiario(
  db: ConexionSqlite,
  directorio: string,
  fechaIso: string,
  retener = 10,
): Promise<ResultadoRespaldoDiario> {
  const ruta = join(directorio, nombreRespaldoDiario(fechaIso));
  if (existsSync(ruta)) return { creado: false, ruta, eliminados: [] };

  await crearRespaldoVerificado(db, ruta);

  const diarios = readdirSync(directorio)
    .filter((a) => PATRON.test(a))
    .sort();
  const sobrantes = diarios.slice(0, Math.max(0, diarios.length - retener));
  for (const a of sobrantes) unlinkSync(join(directorio, a));

  return { creado: true, ruta, eliminados: sobrantes };
}
