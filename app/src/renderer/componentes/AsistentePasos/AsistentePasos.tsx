/** Barra de progreso del asistente del paso 01 (pantalla 1): estado por subpaso, icono + texto. */
import type { JSX } from 'react';
import { NavLink } from 'react-router';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '../ui';

export type EstadoSubpaso = 'completo' | 'pendiente' | 'bloqueante';

export interface Subpaso {
  readonly clave: string;
  readonly nombre: string;
  readonly ruta: string;
  readonly estado: EstadoSubpaso;
}

export function AsistentePasos({ subpasos }: { subpasos: readonly Subpaso[] }): JSX.Element {
  const completos = subpasos.filter((s) => s.estado === 'completo').length;
  return (
    <nav aria-label="Progreso de la parametrización" className="rounded-lg border border-borde bg-elevada px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-sm text-texto-secundario">
        <span>Parametrización de la entidad</span>
        <span aria-live="polite">
          {completos} de {subpasos.length} completos
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded bg-borde" role="progressbar" aria-valuemin={0} aria-valuemax={subpasos.length} aria-valuenow={completos}>
        <div className="h-full bg-acento transition-all" style={{ width: `${(completos / subpasos.length) * 100}%` }} />
      </div>
      <ol className="flex flex-wrap gap-1">
        {subpasos.map((s, i) => {
          const Icono = s.estado === 'completo' ? CheckCircle2 : s.estado === 'bloqueante' ? AlertCircle : Circle;
          const tono = s.estado === 'completo' ? 'text-exito' : s.estado === 'bloqueante' ? 'text-peligro' : 'text-texto-secundario';
          return (
            <li key={s.clave}>
              <NavLink to={s.ruta} className={({ isActive }) => cn('inline-flex h-8 items-center gap-1.5 rounded px-2 text-base text-texto hover:bg-superficie', isActive && 'bg-superficie font-medium')}>
                <Icono className={cn('h-4 w-4', tono)} aria-hidden />
                <span className="sr-only">{s.estado === 'completo' ? 'Completo: ' : s.estado === 'bloqueante' ? 'Pendiente (bloqueante): ' : 'Pendiente: '}</span>
                {i + 1}. {s.nombre}
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
