import type { ApiRenderer } from '@compartido/ipc/contrato';

declare global {
  interface Window {
    /** Única puerta del renderer hacia el main; la expone el preload (R-02). */
    readonly api: ApiRenderer;
  }
}

export {};
