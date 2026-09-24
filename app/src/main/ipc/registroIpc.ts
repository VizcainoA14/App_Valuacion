/**
 * T-B-08 — Registro de handlers con la cadena de middleware de plan 2.3 §4.
 * Es la ÚNICA forma de crear un canal: nadie llama a `ipcMain.handle` directo.
 *
 *  1. ¿El canal existe en el contrato?           → si no, error registrado
 *  2. Validar la entrada con Zod                  → ErrorValidacion con campo
 *  3/4. (sin sesión ni permisos: ADR-016)
 *  5. (sin ejercicio que cerrar: la inmutabilidad la garantizan los triggers, ADR-028)
 *  6. Ejecutar el caso de uso (si `muta`, dentro de una transacción)
 *  7. Bitácora en la MISMA transacción (el caso de uso escribe con `ctx.bitacora`)
 *  8. Serializar la salida en un sobre `RespuestaIpc`
 *  9. Traducir errores a DTO, sin traza (P-4)
 */
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import {
  contrato,
  CANALES,
  type Canal,
  type EntradaValidadaDe,
  type SalidaDe,
  type RespuestaIpc,
} from '../../compartido/ipc/contrato';
import {
  aDtoError,
  ErrorInfraestructura,
  ErrorValidacion,
} from '../../compartido/errores';
import type { BaseDatos, ConexionSqlite } from '../infraestructura/db/conexion';
import { traducirErrorSqlite } from '../infraestructura/db/errores';
import type { Bitacora } from '../infraestructura/bitacora/registrador';
import type { Registro } from '../arranque/registro';

/** Diálogos del sistema: los abre el MAIN (P-1). En pruebas se sustituyen por dobles. */
export interface DialogosMain {
  /** Ruta elegida por el usuario o null si canceló. */
  elegirArchivoExcel(titulo: string): Promise<string | null>;
  /** Dónde guardar un archivo que la aplicación entrega; null si canceló. */
  elegirDondeGuardar(titulo: string, nombreSugerido: string): Promise<string | null>;
  /** Carpeta de destino para una entrega de varios archivos; null si canceló. */
  elegirCarpeta(titulo: string): Promise<string | null>;
  /** Muestra el archivo entregado en el explorador, para que el usuario lo encuentre. */
  revelarEnCarpeta(ruta: string): void;
}

export interface ContextoIpc {
  readonly sqlite: ConexionSqlite;
  readonly db: BaseDatos;
  readonly bitacora: Bitacora;
  /** ISO 8601 UTC del instante; inyectada para pruebas reproducibles. */
  readonly ahoraIso: () => string;
  /** Directorio de datos de la instalación (almacén de archivos importados, adjuntos). */
  readonly rutaDatos: string;
  readonly dialogos: DialogosMain;
  /** ANEXO_C §9.1: resuelve DD/MM frente a MM/DD al importar. Colombia: DD/MM. */
  readonly formatoFechaRegional?: 'DD/MM/AAAA' | 'MM/DD/AAAA';
  /** Carpeta con las plantillas empaquetadas (ANEXO_A §6.1). */
  readonly rutaPlantillas: string;
}

export interface EventoInvocacion {
  readonly webContents?: WebContents;
}

export type Manejador<C extends Canal> = (
  entrada: EntradaValidadaDe<C>,
  ctx: ContextoIpc,
  evento: EventoInvocacion,
) => SalidaDe<C> | Promise<SalidaDe<C>>;

/** Lo mínimo de `ipcMain` que se usa; en pruebas se sustituye por un doble. */
export interface ReceptorIpc {
  handle(canal: string, listener: (evento: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void;
}

export interface RegistroIpc {
  registrar<C extends Canal>(canal: C, manejador: Manejador<C>): void;
  canalesRegistrados(): readonly string[];
  /** Ejecuta la cadena completa sin pasar por Electron (pruebas). */
  invocar<C extends Canal>(canal: C, entrada: unknown, evento?: EventoInvocacion): Promise<RespuestaIpc<SalidaDe<C>>>;
}

export function crearRegistroIpc(deps: {
  readonly receptor: ReceptorIpc;
  readonly contexto: ContextoIpc;
  readonly registro: Registro;
}): RegistroIpc {
  const manejadores = new Map<string, Manejador<Canal>>();

  async function invocar<C extends Canal>(
    canal: C,
    crudo: unknown,
    evento: EventoInvocacion = {},
  ): Promise<RespuestaIpc<SalidaDe<C>>> {
    try {
      // 1
      const definicion = (contrato as Record<string, (typeof contrato)[Canal] | undefined>)[canal];
      const manejador = manejadores.get(canal);
      if (definicion === undefined || manejador === undefined) {
        deps.registro.warn('canal IPC desconocido o sin manejador', { canal });
        throw new ErrorInfraestructura('CANAL_DESCONOCIDO', `El canal "${canal}" no existe.`);
      }

      // 2
      const validacion = definicion.entrada.safeParse(crudo);
      if (!validacion.success) {
        const primero = validacion.error.issues[0];
        const campo = primero?.path.map(String).join('.') ?? '';
        throw new ErrorValidacion('ENTRADA_INVALIDA', primero?.message ?? 'Entrada inválida', {
          ...(campo !== '' ? { campo } : {}),
          detalle: validacion.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      }
      const entrada = validacion.data as EntradaValidadaDe<C>;

      // 6 + 7
      let valor: SalidaDe<C>;
      if (definicion.muta) {
        const transaccion = deps.contexto.sqlite.transaction(() => {
          const resultado = manejador(entrada, deps.contexto, evento);
          if (resultado instanceof Promise) {
            throw new ErrorInfraestructura(
              'MANEJADOR_ASINCRONO',
              `El canal "${canal}" muta y debe ser síncrono para correr en la transacción.`,
            );
          }
          return resultado as SalidaDe<C>;
        });
        valor = transaccion();
      } else {
        valor = (await manejador(entrada, deps.contexto, evento)) as SalidaDe<C>;
      }

      // 8
      return { ok: true, valor };
    } catch (e) {
      // 9
      const traducido = traducirErrorSqlite(e);
      const dto = aDtoError(traducido);
      if (dto.tipo === 'INFRAESTRUCTURA') {
        deps.registro.error('error de infraestructura en IPC', {
          canal,
          codigo: dto.codigo,
          mensaje: dto.mensaje,
        });
      } else {
        deps.registro.debug('canal IPC rechazado', { canal, tipo: dto.tipo, codigo: dto.codigo });
      }
      return { ok: false, error: dto };
    }
  }

  return {
    registrar(canal, manejador) {
      if (!(CANALES as string[]).includes(canal)) {
        throw new Error(`El canal "${canal}" no está en el contrato IPC.`);
      }
      if (manejadores.has(canal)) throw new Error(`El canal "${canal}" ya tiene manejador.`);
      manejadores.set(canal, manejador as Manejador<Canal>);
      deps.receptor.handle(canal, (evento, entrada) =>
        invocar(canal, entrada, { webContents: evento.sender }),
      );
    },
    canalesRegistrados: () => [...manejadores.keys()],
    invocar,
  };
}
