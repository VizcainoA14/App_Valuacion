/**
 * Registro técnico de eventos (plan 4.3 §5): `userData/logs/app-AAAA-MM-DD.log`,
 * rotación de 14 días. Es técnico y se borra; NO es la bitácora (ANEXO_B §7.1),
 * que es evidencia de auditoría, vive en la base y nunca se borra.
 * Nunca registra contenido de campos económicos ni datos personales.
 */
import { appendFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const NIVELES = ['error', 'warn', 'info', 'debug'] as const;
export type NivelRegistro = (typeof NIVELES)[number];

const PESO: Record<NivelRegistro, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const RETENCION_DIAS = 14;

export interface Registro {
  readonly ruta: string;
  error(mensaje: string, datos?: Record<string, unknown>): void;
  warn(mensaje: string, datos?: Record<string, unknown>): void;
  info(mensaje: string, datos?: Record<string, unknown>): void;
  debug(mensaje: string, datos?: Record<string, unknown>): void;
}

export function interpretarNivel(valor: string | undefined): NivelRegistro {
  return (NIVELES as readonly string[]).includes(valor ?? '') ? (valor as NivelRegistro) : 'info';
}

function fechaDe(instante: Date): string {
  return instante.toISOString().slice(0, 10);
}

/** Borra `app-AAAA-MM-DD.log` con más de 14 días respecto a `hoy` (por día civil UTC). */
export function rotarRegistros(directorio: string, hoy: Date): string[] {
  const inicioHoy = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const limite = inicioHoy - RETENCION_DIAS * 86_400_000;
  const borrados: string[] = [];
  for (const archivo of readdirSync(directorio)) {
    const m = /^app-(\d{4}-\d{2}-\d{2})\.log$/.exec(archivo);
    if (m?.[1] === undefined) continue;
    if (Date.parse(`${m[1]}T00:00:00.000Z`) < limite) {
      unlinkSync(join(directorio, archivo));
      borrados.push(archivo);
    }
  }
  return borrados;
}

export function crearRegistro(
  directorio: string,
  nivel: NivelRegistro,
  ahora: () => Date = () => new Date(),
): Registro {
  mkdirSync(directorio, { recursive: true });
  rotarRegistros(directorio, ahora());
  const ruta = join(directorio, `app-${fechaDe(ahora())}.log`);

  const escribir = (n: NivelRegistro, mensaje: string, datos?: Record<string, unknown>): void => {
    if (PESO[n] > PESO[nivel]) return;
    const extra = datos === undefined ? '' : ` ${JSON.stringify(datos)}`;
    appendFileSync(ruta, `${ahora().toISOString()} ${n.toUpperCase().padEnd(5)} ${mensaje}${extra}\n`, 'utf8');
  };

  return {
    ruta,
    error: (m, d) => escribir('error', m, d),
    warn: (m, d) => escribir('warn', m, d),
    info: (m, d) => escribir('info', m, d),
    debug: (m, d) => escribir('debug', m, d),
  };
}
