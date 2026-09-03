/**
 * TR-10 — `<TablaDatos>`: el componente más reutilizado del renderer (unas 30 de
 * las 52 pantallas son listados). Capacidades desde el primer día, porque
 * añadirlas después obliga a reescribir cada listado (ADR-010):
 *
 *  - Virtualización de filas: 20.000 registros sin degradar el desplazamiento.
 *  - Filtro y orden EN EL MAIN: aquí solo se piden páginas y se acumulan.
 *  - Selección sobre el filtro completo, no solo la página visible.
 *  - Anchos de columna persistidos por listado.
 *  - Estados vacío / cargando / error diferenciados y con texto distinto.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';
import { Boton, cn, EstadoVacio } from '../ui';

export interface ColumnaDatos<T> {
  readonly clave: string;
  readonly titulo: string;
  readonly celda: (fila: T) => ReactNode;
  /** Clave de ordenamiento que entiende el main; sin ella la columna no se ordena. */
  readonly ordenPor?: string;
  readonly alineacion?: 'izquierda' | 'derecha';
  readonly anchoPx?: number;
  /** Texto plano para lectores de pantalla y exportación cuando la celda es visual. */
  readonly textoPlano?: (fila: T) => string;
}

export interface OrdenTabla {
  readonly columna: string;
  readonly ascendente: boolean;
}

export interface PropsTablaDatos<T> {
  /** Identifica el listado para persistir los anchos de columna. */
  readonly id: string;
  readonly columnas: readonly ColumnaDatos<T>[];
  readonly filas: readonly T[];
  readonly claveFila: (fila: T) => string;
  /** Total del filtro completo, no de lo ya traído. */
  readonly total: number;
  readonly cargando: boolean;
  readonly cargandoMas?: boolean;
  readonly error?: string | null;
  readonly hayFiltrosActivos?: boolean;
  readonly orden?: OrdenTabla;
  readonly onOrden?: (orden: OrdenTabla) => void;
  readonly onCargarMas?: () => void;
  readonly onFilaActivada?: (fila: T) => void;
  /** Selección: ids seleccionados y acción de "seleccionar todo el filtro". */
  readonly seleccion?: {
    readonly ids: ReadonlySet<string>;
    readonly onCambio: (ids: ReadonlySet<string>) => void;
    readonly onSeleccionarTodoElFiltro: () => void | Promise<void>;
  };
  readonly acciones?: ReactNode;
  readonly alturaPx?: number;
}

const ALTO_FILA = 36;
const ALTO_FILA_COMPACTA = 28;

function anchoGuardado(id: string): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(`tabla.${id}.anchos`) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function TablaDatos<T>({
  id,
  columnas,
  filas,
  claveFila,
  total,
  cargando,
  cargandoMas = false,
  error = null,
  hayFiltrosActivos = false,
  orden,
  onOrden,
  onCargarMas,
  onFilaActivada,
  seleccion,
  acciones,
  alturaPx = 520,
}: PropsTablaDatos<T>): JSX.Element {
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchos, setAnchos] = useState<Record<string, number>>(() => anchoGuardado(id));
  const compacta = typeof document !== 'undefined' && document.documentElement.dataset['densidad'] === 'compacta';
  const altoFila = compacta ? ALTO_FILA_COMPACTA : ALTO_FILA;

  const virtualizador = useVirtualizer({
    count: filas.length,
    getScrollElement: () => contenedor.current,
    estimateSize: () => altoFila,
    overscan: 12,
  });

  // Cargar la página siguiente al acercarse al final del desplazamiento.
  const virtuales = virtualizador.getVirtualItems();
  useEffect(() => {
    const ultima = virtuales.at(-1);
    if (ultima !== undefined && ultima.index >= filas.length - 20 && filas.length < total && !cargandoMas) onCargarMas?.();
  }, [virtuales, filas.length, total, cargandoMas, onCargarMas]);

  const cambiarAncho = useCallback(
    (clave: string, ancho: number) => {
      setAnchos((previos) => {
        const nuevos = { ...previos, [clave]: Math.max(60, Math.round(ancho)) };
        try {
          window.localStorage.setItem(`tabla.${id}.anchos`, JSON.stringify(nuevos));
        } catch {
          // Sin almacenamiento local se pierde la preferencia; no es crítico.
        }
        return nuevos;
      });
    },
    [id],
  );

  const plantilla = useMemo(
    () => `${seleccion !== undefined ? '36px ' : ''}${columnas.map((c) => `${anchos[c.clave] ?? c.anchoPx ?? 160}px`).join(' ')}`,
    [columnas, anchos, seleccion],
  );

  const alternarOrden = (columna: ColumnaDatos<T>): void => {
    if (columna.ordenPor === undefined || onOrden === undefined) return;
    onOrden({ columna: columna.ordenPor, ascendente: orden?.columna === columna.ordenPor ? !orden.ascendente : true });
  };

  const todasVisiblesSeleccionadas = seleccion !== undefined && filas.length > 0 && filas.every((f) => seleccion.ids.has(claveFila(f)));

  if (error !== null) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-md border border-peligro/40 bg-peligro-fondo px-3 py-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-peligro" aria-hidden />
        <div>
          <p className="font-medium text-texto">No se pudo cargar el listado</p>
          <p className="text-sm text-texto-secundario">{error}</p>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-md border border-borde bg-elevada px-3 py-6 text-texto-secundario">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando registros…
      </p>
    );
  }

  if (total === 0) {
    // "No hay bienes" y "no hay bienes con estos filtros" son mensajes distintos, y ambos ocurren a diario.
    return hayFiltrosActivos ? (
      <EstadoVacio titulo="Ningún registro coincide con los filtros" descripcion="Ajuste o limpie los filtros para ver más resultados." />
    ) : (
      <EstadoVacio titulo="Todavía no hay registros" descripcion="Importe la plantilla correspondiente o cree el primer registro." />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-texto-secundario" aria-live="polite">
          {filas.length === total ? `${total} registros` : `${filas.length} de ${total} registros cargados`}
          {seleccion !== undefined && seleccion.ids.size > 0 && ` · ${seleccion.ids.size} seleccionados`}
        </p>
        <div className="flex items-center gap-2">
          {seleccion !== undefined && seleccion.ids.size > 0 && seleccion.ids.size < total && (
            <Boton variante="sutil" onClick={() => void seleccion.onSeleccionarTodoElFiltro()}>
              Seleccionar los {total} del filtro
            </Boton>
          )}
          {seleccion !== undefined && seleccion.ids.size > 0 && (
            <Boton variante="sutil" onClick={() => seleccion.onCambio(new Set())}>
              Limpiar selección
            </Boton>
          )}
          {acciones}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-borde">
        <div role="table" aria-rowcount={total} aria-label="Listado de registros">
          <div role="row" className="grid items-center border-b border-borde bg-superficie text-sm font-medium text-texto-secundario" style={{ gridTemplateColumns: plantilla }}>
            {seleccion !== undefined && (
              <span role="columnheader" className="flex h-8 items-center justify-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-acento"
                  aria-label="Seleccionar los registros visibles"
                  checked={todasVisiblesSeleccionadas}
                  onChange={(e) => {
                    const ids = new Set(seleccion.ids);
                    for (const f of filas) {
                      if (e.target.checked) ids.add(claveFila(f));
                      else ids.delete(claveFila(f));
                    }
                    seleccion.onCambio(ids);
                  }}
                />
              </span>
            )}
            {columnas.map((c) => {
              const activa = orden !== undefined && c.ordenPor === orden.columna;
              const Icono = activa ? (orden.ascendente ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <span key={c.clave} role="columnheader" aria-sort={activa ? (orden.ascendente ? 'ascending' : 'descending') : c.ordenPor !== undefined ? 'none' : undefined} className="relative flex h-8 items-center">
                  {c.ordenPor !== undefined && onOrden !== undefined ? (
                    <button type="button" onClick={() => alternarOrden(c)} className={cn('flex h-full w-full items-center gap-1 px-2 hover:text-texto', c.alineacion === 'derecha' && 'justify-end')}>
                      {c.titulo}
                      <Icono className={cn('h-3 w-3', activa ? 'text-acento' : 'text-texto-secundario/60')} aria-hidden />
                    </button>
                  ) : (
                    <span className={cn('w-full px-2', c.alineacion === 'derecha' && 'text-right')}>{c.titulo}</span>
                  )}
                  <span
                    role="separator"
                    aria-label={`Ajustar el ancho de ${c.titulo}`}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-acento/40"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const inicioX = e.clientX;
                      const inicioAncho = anchos[c.clave] ?? c.anchoPx ?? 160;
                      const mover = (m: PointerEvent): void => cambiarAncho(c.clave, inicioAncho + (m.clientX - inicioX));
                      const soltar = (): void => {
                        window.removeEventListener('pointermove', mover);
                        window.removeEventListener('pointerup', soltar);
                      };
                      window.addEventListener('pointermove', mover);
                      window.addEventListener('pointerup', soltar);
                    }}
                  />
                </span>
              );
            })}
          </div>

          <div ref={contenedor} className="overflow-auto" style={{ height: alturaPx }}>
            <div style={{ height: virtualizador.getTotalSize(), position: 'relative' }}>
              {virtuales.map((v) => {
                const fila = filas[v.index];
                if (fila === undefined) return null;
                const clave = claveFila(fila);
                const seleccionada = seleccion?.ids.has(clave) === true;
                return (
                  <div
                    key={clave}
                    role="row"
                    aria-rowindex={v.index + 1}
                    aria-selected={seleccion !== undefined ? seleccionada : undefined}
                    tabIndex={onFilaActivada !== undefined ? 0 : undefined}
                    onDoubleClick={() => onFilaActivada?.(fila)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onFilaActivada?.(fila);
                    }}
                    className={cn(
                      'absolute left-0 grid w-full items-center border-b border-borde/60 text-base',
                      seleccionada ? 'bg-acento/10' : v.index % 2 === 1 && 'bg-superficie/40',
                      onFilaActivada !== undefined && 'cursor-pointer hover:bg-superficie',
                    )}
                    style={{ gridTemplateColumns: plantilla, height: v.size, transform: `translateY(${v.start}px)` }}
                  >
                    {seleccion !== undefined && (
                      <span role="gridcell" className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-acento"
                          aria-label={`Seleccionar ${clave}`}
                          checked={seleccionada}
                          onChange={(e) => {
                            const ids = new Set(seleccion.ids);
                            if (e.target.checked) ids.add(clave);
                            else ids.delete(clave);
                            seleccion.onCambio(ids);
                          }}
                        />
                      </span>
                    )}
                    {columnas.map((c) => (
                      <span key={c.clave} role="gridcell" className={cn('truncate px-2', c.alineacion === 'derecha' && 'text-right tabular-nums')} title={c.textoPlano?.(fila)}>
                        {c.celda(fila)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {cargandoMas && (
          <p role="status" className="flex items-center gap-2 border-t border-borde bg-superficie px-3 py-1.5 text-sm text-texto-secundario">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Cargando más registros…
          </p>
        )}
      </div>
    </div>
  );
}
