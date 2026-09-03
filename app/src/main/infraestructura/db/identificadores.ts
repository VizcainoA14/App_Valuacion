import { randomBytes } from 'node:crypto';
import { comoUuid, type Uuid } from '../../../compartido/tipos/basicos';

/**
 * UUID v7 (RFC 9562): 48 bits de marca de tiempo en milisegundos + 74 bits
 * aleatorios; ordenable por tiempo, índices sanos (plan 2.4 §2).
 * Implementado sobre `node:crypto` para no depender del paquete `uuid`
 * (solo ESM), que el main empaquetado no resolvía dentro del asar (2026-09-02).
 */
export function nuevoId(ahoraMs: number = Date.now()): Uuid {
  const bytes = randomBytes(16);
  const ms = BigInt(ahoraMs);
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70; // versión 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC
  const hex = bytes.toString('hex');
  return comoUuid(`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`);
}
