/**
 * Esquemas Zod compartidos por IPC, formularios e importación (plan 2.3 §2).
 * Reutilizan los guardas de `tipos/basicos.ts`: una sola definición de qué es
 * un UUID, una fecha o un importe válido.
 */
import { z } from 'zod';
import { esCentavos, esFechaIso, esUuid, type Centavos, type FechaIso, type Uuid } from '../tipos/basicos';
import type { Catalogo } from '../enums/definirCatalogo';

export const zUuid = z
  .string()
  .refine(esUuid, 'Debe ser un UUID válido')
  .transform((v) => v as Uuid);

export const zFechaIso = z
  .string()
  .refine(esFechaIso, 'Debe ser una fecha AAAA-MM-DD válida')
  .transform((v) => v as FechaIso);

/** Dinero en el IPC: entero de centavos, nunca number de pesos (RG-02). */
export const zCentavos = z
  .number()
  .refine(esCentavos, 'Debe ser un entero de centavos')
  .transform((v) => v as Centavos);

export const zTexto = (max: number, min = 1) => z.string().trim().min(min).max(max);

/** Cadena opcional que, si viene vacía, se normaliza a null. */
export const zTextoNulable = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v));

export function zCatalogo<V extends string>(catalogo: Catalogo<V>) {
  return z.enum(catalogo.valores as unknown as [V, ...V[]]);
}

/** Canales sin parámetros: el renderer puede invocar sin argumento. */
export const zSinEntrada = z.object({}).optional().transform(() => ({}));
