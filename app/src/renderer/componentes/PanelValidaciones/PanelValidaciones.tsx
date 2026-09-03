/**
 * TR-01 — Panel de validaciones del paso (RF-01-06). Cada resultado lleva icono
 * + texto + color: el color nunca es el único portador (accesibilidad). Un paso
 * con bloqueantes se muestra deshabilitado con la razón visible, nunca oculto.
 */
import type { JSX } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import type { ResultadoValidaciones } from '@compartido/dtos/configuracion';
import { Boton, cn } from '../ui';

export function PanelValidaciones({ resultado, onAvanzar, textoAvanzar = 'Avanzar al siguiente paso' }: { resultado: ResultadoValidaciones; onAvanzar?: () => void; textoAvanzar?: string }): JSX.Element {
  const bloqueantes = resultado.resultados.filter((r) => r.severidad === 'BLOQUEANTE');
  const advertencias = resultado.resultados.filter((r) => r.severidad === 'ADVERTENCIA');

  return (
    <section aria-labelledby="titulo-validaciones" className="rounded-lg border border-borde bg-elevada">
      <header className="flex items-center justify-between gap-4 border-b border-borde px-4 py-3">
        <div>
          <h2 id="titulo-validaciones" className="text-md font-semibold text-texto">
            Validaciones del paso {String(resultado.paso).padStart(2, '0')}
          </h2>
          <p className="text-sm text-texto-secundario" role="status">
            {resultado.puedeAvanzar
              ? `Todas las bloqueantes cumplidas · ${resultado.advertencias} advertencia(s)`
              : `${resultado.bloqueantesPendientes} bloqueante(s) pendiente(s) · ${resultado.advertencias} advertencia(s)`}
          </p>
        </div>
        {onAvanzar !== undefined && (
          <Boton variante="primario" disabled={!resultado.puedeAvanzar} onClick={onAvanzar} icono={<ArrowRight className="h-4 w-4" aria-hidden />} title={resultado.puedeAvanzar ? undefined : 'Resuelva las validaciones bloqueantes para avanzar'}>
            {textoAvanzar}
          </Boton>
        )}
      </header>
      <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
        <ListaValidaciones titulo="Bloqueantes" descripcion="Impiden avanzar al paso siguiente" filas={bloqueantes} />
        <ListaValidaciones titulo="Advertencias" descripcion="Permiten avanzar; conviene revisarlas" filas={advertencias} />
      </div>
    </section>
  );
}

function ListaValidaciones({ titulo, descripcion, filas }: { titulo: string; descripcion: string; filas: ResultadoValidaciones['resultados'] }): JSX.Element {
  return (
    <div>
      <h3 className="text-sm font-semibold text-texto">{titulo}</h3>
      <p className="mb-2 text-sm text-texto-secundario">{descripcion}</p>
      <ul className="flex flex-col gap-1.5">
        {filas.map((r) => {
          const esBloqueante = r.severidad === 'BLOQUEANTE';
          const Icono = r.cumple ? CheckCircle2 : esBloqueante ? XCircle : AlertTriangle;
          const tono = r.cumple ? 'text-exito' : esBloqueante ? 'text-peligro' : 'text-aviso';
          return (
            <li key={r.codigo} data-validacion={r.codigo} data-cumple={r.cumple} className={cn('flex gap-2 rounded-md border px-2.5 py-1.5', r.cumple ? 'border-borde bg-superficie/60' : esBloqueante ? 'border-peligro/40 bg-peligro-fondo' : 'border-aviso/40 bg-aviso-fondo')}>
              <Icono className={cn('mt-0.5 h-4 w-4 shrink-0', tono)} aria-hidden />
              <div className="min-w-0">
                <p className="text-base text-texto">
                  <span className="sr-only">{r.cumple ? 'Cumple: ' : esBloqueante ? 'Bloqueante pendiente: ' : 'Advertencia: '}</span>
                  <span className="mr-1.5 font-mono text-xs text-texto-secundario">{r.codigo}</span>
                  {r.mensaje}
                </p>
                {r.detalle !== null && <p className="text-sm text-texto-secundario">{r.detalle}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
