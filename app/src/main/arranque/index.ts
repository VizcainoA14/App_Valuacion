/**
 * T-B-06 — Arranque de la aplicación (plan 2.2, 4.3; riesgo RG-10).
 *
 * Orden: registro técnico → config.json → ruta de datos → bloqueo de unidad de
 * red → base migrada (con respaldo previo si hace falta) → respaldo diario.
 *
 * Si la base no es de esta aplicación (más nueva, o de una versión de desarrollo
 * con otro esquema), se pregunta: apartarla —se renombra, no se borra— y
 * empezar con una en blanco, o salir. Nunca se cierra sin decir por qué.
 * Todo lo que toca Electron o el sistema llega inyectado, así que se prueba
 * sin arrancar Electron.
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { leerConfigInstalacion, type ConfigInstalacion } from './configInstalacion';
import { crearRegistro, interpretarNivel, type Registro } from './registro';
import {
  esUnidadDeRed,
  leerArgumento,
  resolverRutaDatos,
  MENSAJE_BLOQUEO_RED,
  type Ejecutor,
  type RutaDatos,
} from './rutaDatos';
import { respaldoDiario } from './respaldoDiario';
import { prepararBaseDatos, type BaseDatosAbierta } from '../infraestructura/db';
import { ErrorInfraestructura } from '../../compartido/errores';

export const CODIGO_SALIDA_UNIDAD_DE_RED = 3;
export const CODIGO_SALIDA_BASE_INCOMPATIBLE = 4;

const CODIGOS_BASE_INCOMPATIBLE = new Set(['ESQUEMA_MAS_NUEVO', 'ESQUEMA_INCOMPATIBLE']);

export interface DependenciasArranque {
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly plataforma: NodeJS.Platform;
  readonly userData: string;
  readonly versionApp: string;
  readonly ahora: () => Date;
  readonly ejecutar: Ejecutor;
  /** Diálogo bloqueante (o registro, en pruebas). */
  readonly mostrarBloqueo: (titulo: string, mensaje: string) => void;
  /**
   * La base no es de esta aplicación: `true` = apartarla y empezar en blanco,
   * `false` = salir sin tocar nada. Recibe el motivo y dónde quedaría la base apartada.
   */
  readonly preguntarBaseIncompatible: (motivo: string, destino: string) => boolean;
}

export interface ContextoAplicacion {
  readonly registro: Registro;
  readonly config: ConfigInstalacion;
  readonly rutaDatos: RutaDatos;
  readonly baseDatos: BaseDatosAbierta;
}

export type ResultadoArranque =
  | { readonly estado: 'listo'; readonly contexto: ContextoAplicacion }
  | { readonly estado: 'salir'; readonly codigo: number; readonly registro: Registro };

export async function arrancar(deps: DependenciasArranque): Promise<ResultadoArranque> {
  const nivel = interpretarNivel(leerArgumento(deps.argv, 'log') ?? deps.env['LOG_NIVEL']);
  const registro = crearRegistro(join(deps.userData, 'logs'), nivel, deps.ahora);
  registro.info('arranque', { version: deps.versionApp, plataforma: deps.plataforma, nivel });

  const { config, advertencia } = leerConfigInstalacion(join(deps.userData, 'config.json'));
  if (advertencia !== undefined) registro.warn(advertencia);

  const rutaDatos = resolverRutaDatos(deps.argv, config, deps.userData);
  registro.info('ruta de datos', { ruta: rutaDatos.ruta, origen: rutaDatos.origen });

  const red = await esUnidadDeRed(rutaDatos.ruta, deps.plataforma, deps.ejecutar);
  if (red.esRed) {
    registro.error('ruta de datos en unidad de red: se bloquea el arranque (RG-10)', {
      ruta: rutaDatos.ruta,
      detalle: red.detalle,
    });
    deps.mostrarBloqueo('La ruta de datos no es válida', MENSAJE_BLOQUEO_RED);
    return { estado: 'salir', codigo: CODIGO_SALIDA_UNIDAD_DE_RED, registro };
  }
  if (red.tipo === 'desconocido') registro.warn('tipo de unidad no determinado', { detalle: red.detalle });

  mkdirSync(rutaDatos.ruta, { recursive: true });
  const dirRespaldos = join(rutaDatos.ruta, 'respaldos');
  const archivoBase = join(rutaDatos.ruta, 'valuacion.db');
  const preparar = (): Promise<BaseDatosAbierta> => prepararBaseDatos(archivoBase, dirRespaldos, () => deps.ahora().toISOString());
  let baseDatos: BaseDatosAbierta;
  try {
    baseDatos = await preparar();
  } catch (e) {
    if (!(e instanceof ErrorInfraestructura) || !CODIGOS_BASE_INCOMPATIBLE.has(e.codigo)) throw e;
    const marca = deps.ahora().toISOString().replace(/[:.]/g, '-');
    const apartada = join(rutaDatos.ruta, `valuacion-incompatible-${marca}.db`);
    registro.error('la base de datos no es de esta aplicación', { codigo: e.codigo, mensaje: e.message });
    if (!deps.preguntarBaseIncompatible(e.message, apartada)) {
      return { estado: 'salir', codigo: CODIGO_SALIDA_BASE_INCOMPATIBLE, registro };
    }
    // Se aparta, no se borra: la base y sus archivos de WAL quedan juntos con otro nombre.
    for (const sufijo of ['', '-wal', '-shm']) {
      if (existsSync(archivoBase + sufijo)) renameSync(archivoBase + sufijo, apartada + sufijo);
    }
    registro.warn('base incompatible apartada; se empieza con una en blanco', { apartada });
    baseDatos = await preparar();
  }
  registro.info('base de datos lista', {
    version: baseDatos.migracion.hasta,
    migradaDesde: baseDatos.migracion.desde,
    aplicadas: baseDatos.migracion.aplicadas,
  });

  if (config.respaldos.diario) {
    const destino = config.respaldos.rutaExterna ?? dirRespaldos;
    try {
      const r = await respaldoDiario(baseDatos.sqlite, destino, deps.ahora().toISOString().slice(0, 10));
      if (r.creado) registro.info('respaldo diario creado', { ruta: r.ruta, eliminados: r.eliminados });
    } catch (e) {
      // Un respaldo externo inaccesible no impide trabajar; queda registrado.
      registro.warn('no se pudo crear el respaldo diario', { destino, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { estado: 'listo', contexto: { registro, config, rutaDatos, baseDatos } };
}
