/**
 * Cliente IPC tipado del renderer (plan 2.3 §7). Desenvuelve `RespuestaIpc` y
 * convierte el DTO de error en una excepción con la misma información.
 */
import type {
  ApiRenderer,
  Canal,
  DatosDeEvento,
  EntradaDe,
  Evento,
  SalidaDe,
} from '@compartido/ipc/contrato';
import type { DtoError, TipoError } from '@compartido/errores';

export class ErrorIpc extends Error {
  readonly tipo: TipoError;
  readonly codigo: string;
  readonly campo: string | undefined;
  readonly detalle: string | undefined;

  constructor(dto: DtoError) {
    super(dto.mensaje);
    this.name = 'ErrorIpc';
    this.tipo = dto.tipo;
    this.codigo = dto.codigo;
    this.campo = dto.campo;
    this.detalle = dto.detalle;
  }
}

export interface ClienteIpc {
  invocar<C extends Canal>(canal: C, entrada?: EntradaDe<C>): Promise<SalidaDe<C>>;
  suscribir<E extends Evento>(evento: E, callback: (datos: DatosDeEvento[E]) => void): () => void;
}

export function crearCliente(api: ApiRenderer): ClienteIpc {
  return {
    async invocar(canal, entrada) {
      const respuesta = await api.invocar(canal, entrada);
      if (!respuesta.ok) throw new ErrorIpc(respuesta.error);
      return respuesta.valor;
    },
    suscribir: (evento, callback) => api.suscribir(evento, callback),
  };
}
