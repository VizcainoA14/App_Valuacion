/**
 * Nivel 2 de configuración (plan 4.3 §3): `userData/config.json`.
 * Se lee ANTES de abrir la base, por eso no puede vivir en ella. Nunca contiene
 * parámetros de negocio (esos van en la base y se congelan por ejercicio).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

export const EsquemaConfigInstalacion = z.object({
  version: z.literal(1).default(1),
  /** null = `userData`. Se valida contra unidades de red al arrancar (RG-10). */
  rutaDatos: z.string().min(1).nullable().default(null),
  tema: z.enum(['claro', 'oscuro', 'sistema']).default('sistema'),
  densidad: z.enum(['compacta', 'comoda']).default('comoda'),
  idiomaFecha: z.string().default('es-CO'),
  respaldos: z
    .object({
      diario: z.boolean().default(true),
      retencionDias: z.number().int().min(1).default(30),
      /** Esta SÍ puede estar en la red: base local, respaldos copiados (ADR-016). */
      rutaExterna: z.string().min(1).nullable().default(null),
    })
    .prefault({}),
  importacion: z
    .object({
      /** ANEXO_C §9.1: resuelve la ambigüedad DD vs MM al importar. */
      formatoFechaRegional: z.enum(['DD/MM/AAAA', 'MM/DD/AAAA']).default('DD/MM/AAAA'),
    })
    .prefault({}),
  ultimoEjercicioAbierto: z.string().nullable().default(null),
  ventana: z
    .object({
      ancho: z.number().int().min(800).default(1440),
      alto: z.number().int().min(600).default(900),
      maximizada: z.boolean().default(false),
    })
    .prefault({}),
});

export type ConfigInstalacion = z.infer<typeof EsquemaConfigInstalacion>;

export interface ConfigLeida {
  readonly config: ConfigInstalacion;
  /** Presente si el archivo existía pero no era válido: se usan los valores por defecto. */
  readonly advertencia?: string;
}

export const CONFIG_POR_DEFECTO: ConfigInstalacion = EsquemaConfigInstalacion.parse({});

export function leerConfigInstalacion(rutaArchivo: string): ConfigLeida {
  if (!existsSync(rutaArchivo)) return { config: CONFIG_POR_DEFECTO };

  let crudo: unknown;
  try {
    crudo = JSON.parse(readFileSync(rutaArchivo, 'utf8'));
  } catch (e) {
    return {
      config: CONFIG_POR_DEFECTO,
      advertencia: `config.json no es JSON válido (${e instanceof Error ? e.message : String(e)}); se usan valores por defecto.`,
    };
  }

  const resultado = EsquemaConfigInstalacion.safeParse(crudo);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return {
      config: CONFIG_POR_DEFECTO,
      advertencia: `config.json tiene valores inválidos (${problemas}); se usan valores por defecto.`,
    };
  }
  return { config: resultado.data };
}

export function guardarConfigInstalacion(rutaArchivo: string, config: ConfigInstalacion): void {
  mkdirSync(dirname(rutaArchivo), { recursive: true });
  writeFileSync(rutaArchivo, `${JSON.stringify(EsquemaConfigInstalacion.parse(config), null, 2)}\n`, 'utf8');
}
