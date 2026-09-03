/**
 * T-B-08 — Operaciones largas: progreso y cancelación (plan 2.3 §6).
 * - Progreso como máximo cada 250 ms: emitir por registro satura el IPC.
 * - Cancelar no revierte lo persistido; el caso de uso declara PARCIAL (RG-07).
 * - Los eventos van solo a la ventana que pidió la tarea (P-6).
 */
import type { WebContents } from 'electron';
import type { Uuid } from '../../compartido/tipos/basicos';
import type { DatosDeEvento, Evento } from '../../compartido/ipc/contrato';
import { nuevoId } from '../infraestructura/db/identificadores';

export interface Emisor {
  enviar<E extends Evento>(evento: E, datos: DatosDeEvento[E]): void;
}

export function emisorDe(webContents: Pick<WebContents, 'send' | 'isDestroyed'>): Emisor {
  return {
    enviar: (evento, datos) => {
      if (!webContents.isDestroyed()) webContents.send(evento, datos);
    },
  };
}

export const INTERVALO_PROGRESO_MS = 250;

interface EstadoTarea {
  readonly emisor: Emisor;
  cancelada: boolean;
  ultimoProgreso: number;
  finalizada: boolean;
}

export interface Tarea {
  readonly id: Uuid;
  /** Verdadero si el usuario pidió cancelar; el lote actual termina y se para. */
  estaCancelada(): boolean;
  progreso(hechos: number, total: number, fase: string): void;
  finalizar(estado: 'ok' | 'cancelada' | 'error', resumen: unknown): void;
}

export class GestorTareas {
  private readonly tareas = new Map<string, EstadoTarea>();

  constructor(private readonly ahoraMs: () => number = () => Date.now()) {}

  crear(emisor: Emisor): Tarea {
    const id = nuevoId();
    const estado: EstadoTarea = { emisor, cancelada: false, ultimoProgreso: -Infinity, finalizada: false };
    this.tareas.set(id, estado);
    return {
      id,
      estaCancelada: () => estado.cancelada,
      progreso: (hechos, total, fase) => {
        if (estado.finalizada) return;
        const ahora = this.ahoraMs();
        const esFinal = hechos >= total;
        if (!esFinal && ahora - estado.ultimoProgreso < INTERVALO_PROGRESO_MS) return;
        estado.ultimoProgreso = ahora;
        emisor.enviar('evento:progreso', { tareaId: id, hechos, total, fase });
      },
      finalizar: (resultado, resumen) => {
        if (estado.finalizada) return;
        estado.finalizada = true;
        emisor.enviar('evento:tareaFinalizada', { tareaId: id, estado: resultado, resumen });
        this.tareas.delete(id);
      },
    };
  }

  cancelar(id: string): boolean {
    const estado = this.tareas.get(id);
    if (estado === undefined || estado.finalizada) return false;
    estado.cancelada = true;
    return true;
  }

  activas(): number {
    return this.tareas.size;
  }
}
