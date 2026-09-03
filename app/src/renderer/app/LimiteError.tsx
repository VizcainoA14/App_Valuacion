/**
 * Límite de error del renderer: una excepción de render nunca deja la ventana en
 * blanco. Muestra qué pasó, ofrece volver al inicio y envía el error al registro
 * técnico del main para poder diagnosticarlo después.
 */
import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cliente } from '../ipc/consultas';

interface Estado {
  readonly error: Error | null;
}

export function registrarErrorRenderer(mensaje: string, origen: string | null, pila: string | null): void {
  try {
    void cliente().invocar('app:registrarErrorRenderer', { mensaje: mensaje.slice(0, 2000), origen, pila: pila?.slice(0, 8000) ?? null });
  } catch {
    // Sin IPC disponible no hay dónde registrar; el límite de error sigue mostrando el mensaje.
  }
}

/** Errores fuera del árbol de React (promesas, eventos) también llegan al registro. */
export function vigilarErroresGlobales(): void {
  window.addEventListener('error', (e) => registrarErrorRenderer(e.message, e.filename || null, e.error instanceof Error ? (e.error.stack ?? null) : null));
  window.addEventListener('unhandledrejection', (e) => {
    const razon: unknown = e.reason;
    registrarErrorRenderer(razon instanceof Error ? razon.message : String(razon), 'unhandledrejection', razon instanceof Error ? (razon.stack ?? null) : null);
  });
}

export class LimiteError extends Component<{ children: ReactNode }, Estado> {
  override state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    registrarErrorRenderer(error.message, info.componentStack ?? null, error.stack ?? null);
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return <PantallaError error={this.state.error} onReiniciar={() => window.location.reload()} />;
  }
}

function PantallaError({ error, onReiniciar }: { error: Error; onReiniciar: () => void }): JSX.Element {
  return (
    <div role="alert" className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-peligro" aria-hidden />
        <div>
          <h1 className="text-xl font-semibold text-texto">Algo falló al mostrar esta pantalla</h1>
          <p className="text-texto-secundario">Los datos guardados no se han perdido. El detalle quedó en el registro técnico de la aplicación.</p>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-md border border-borde bg-superficie p-3 font-mono text-sm text-texto">{error.message}</pre>
      <div>
        <button type="button" onClick={onReiniciar} className="inline-flex h-control items-center rounded bg-acento px-3 font-medium text-acento-texto">
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
