import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ApiRenderer, RespuestaIpc } from '@compartido/ipc/contrato';
import { esCanalPermitido, esEventoPermitido } from '@compartido/ipc/canales';

/**
 * La única puerta del renderer (R-02, plan 2.3 §9): dos funciones, ambas con
 * lista blanca. Nada de `sendSync` (P-5) ni canales genéricos. Solo importa
 * `canales.ts` en ejecución: con sandbox, el preload no puede cargar Zod.
 */
const api: ApiRenderer = {
  invocar: (canal, entrada) => {
    if (!esCanalPermitido(canal)) {
      const rechazo: RespuestaIpc<never> = {
        ok: false,
        error: { tipo: 'INFRAESTRUCTURA', codigo: 'CANAL_NO_PERMITIDO', mensaje: `Canal no permitido: ${canal}` },
      };
      return Promise.resolve(rechazo);
    }
    return ipcRenderer.invoke(canal, entrada) as ReturnType<ApiRenderer['invocar']>;
  },
  suscribir: (evento, callback) => {
    if (!esEventoPermitido(evento)) throw new Error(`Evento no permitido: ${evento}`);
    const oyente = (_e: IpcRendererEvent, datos: unknown): void => {
      callback(datos as Parameters<typeof callback>[0]);
    };
    ipcRenderer.on(evento, oyente);
    return () => ipcRenderer.removeListener(evento, oyente);
  },
};

contextBridge.exposeInMainWorld('api', api);
