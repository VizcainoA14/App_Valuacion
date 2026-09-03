/**
 * Primitivas del sistema de diseño (sin lógica de negocio). Accesibles por
 * construcción: etiquetas asociadas, `aria-invalid`, foco visible, controles ≥ 28 px.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type JSX, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function cn(...clases: (string | false | null | undefined)[]): string {
  return twMerge(clsx(clases));
}

// ── Botón ─────────────────────────────────────────────────────────────────────

type VarianteBoton = 'primario' | 'secundario' | 'sutil' | 'peligro';

const ESTILO_BOTON: Record<VarianteBoton, string> = {
  primario: 'bg-acento text-acento-texto hover:bg-acento/90 disabled:bg-acento/40',
  secundario: 'bg-elevada text-texto border border-borde hover:bg-superficie disabled:text-texto-secundario',
  sutil: 'bg-transparent text-acento hover:bg-acento/10 disabled:text-texto-secundario',
  peligro: 'bg-peligro text-white hover:bg-peligro/90 disabled:bg-peligro/40',
};

export interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variante?: VarianteBoton;
  readonly cargando?: boolean;
  readonly icono?: ReactNode;
}

export const Boton = forwardRef<HTMLButtonElement, PropsBoton>(function Boton(
  { variante = 'secundario', cargando = false, icono, className, children, disabled, type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled === true || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex h-control min-w-[28px] items-center justify-center gap-2 rounded px-3 text-base font-medium transition-colors disabled:cursor-not-allowed',
        ESTILO_BOTON[variante],
        className,
      )}
      {...resto}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icono}
      {children}
    </button>
  );
});

// ── Campo de texto ────────────────────────────────────────────────────────────

interface PropsEtiqueta {
  readonly etiqueta: string;
  readonly ayuda?: string | undefined;
  readonly error?: string | undefined;
  readonly obligatorio?: boolean | undefined;
}

function Envoltorio({ id, etiqueta, ayuda, error, obligatorio, children }: PropsEtiqueta & { id: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {etiqueta}
        {obligatorio === true && (
          <span className="ml-1 text-peligro" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error !== undefined ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-sm text-peligro">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        ayuda !== undefined && (
          <p id={`${id}-ayuda`} className="text-sm text-texto-secundario">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

const ESTILO_CONTROL =
  'h-control w-full rounded border border-borde bg-elevada px-2.5 text-base text-texto placeholder:text-texto-secundario/70 disabled:bg-superficie disabled:text-texto-secundario aria-[invalid=true]:border-peligro';

export interface PropsCampo extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>, PropsEtiqueta {}

export const Campo = forwardRef<HTMLInputElement, PropsCampo>(function Campo({ etiqueta, ayuda, error, obligatorio, className, ...resto }, ref) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? `${id}-error` : ayuda !== undefined ? `${id}-ayuda` : undefined}
        aria-required={obligatorio || undefined}
        className={cn(ESTILO_CONTROL, className)}
        {...resto}
      />
    </Envoltorio>
  );
});

export interface PropsAreaTexto extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>, PropsEtiqueta {}

export const AreaTexto = forwardRef<HTMLTextAreaElement, PropsAreaTexto>(function AreaTexto({ etiqueta, ayuda, error, obligatorio, className, ...resto }, ref) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <textarea ref={ref} id={id} aria-invalid={error !== undefined} aria-required={obligatorio || undefined} className={cn(ESTILO_CONTROL, 'h-auto min-h-[72px] py-1.5', className)} {...resto} />
    </Envoltorio>
  );
});

export interface OpcionSelector {
  readonly valor: string;
  readonly etiqueta: string;
}

export interface PropsSelector extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>, PropsEtiqueta {
  readonly opciones: readonly OpcionSelector[];
  readonly vacio?: string;
}

/** Elegir de una lista es más rápido y seguro que teclear (entrada de datos). */
export const Selector = forwardRef<HTMLSelectElement, PropsSelector>(function Selector({ etiqueta, ayuda, error, obligatorio, opciones, vacio, className, ...resto }, ref) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <select ref={ref} id={id} aria-invalid={error !== undefined} aria-required={obligatorio || undefined} className={cn(ESTILO_CONTROL, className)} {...resto}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
});

export interface PropsCasilla extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  readonly etiqueta: string;
  readonly ayuda?: string;
}

export const Casilla = forwardRef<HTMLInputElement, PropsCasilla>(function Casilla({ etiqueta, ayuda, className, ...resto }, ref) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input ref={ref} id={id} type="checkbox" className={cn('mt-1 h-4 w-4 shrink-0 accent-acento', className)} {...resto} />
      <label htmlFor={id} className="flex flex-col text-base text-texto">
        {etiqueta}
        {ayuda !== undefined && <span className="text-sm text-texto-secundario">{ayuda}</span>}
      </label>
    </div>
  );
});

// ── Avisos y estados ──────────────────────────────────────────────────────────

type TonoAviso = 'info' | 'exito' | 'aviso' | 'peligro';

const ESTILO_AVISO: Record<TonoAviso, { caja: string; Icono: typeof Info }> = {
  info: { caja: 'border-acento/30 bg-acento/10 text-texto', Icono: Info },
  exito: { caja: 'border-exito/40 bg-exito-fondo text-texto', Icono: CheckCircle2 },
  aviso: { caja: 'border-aviso/40 bg-aviso-fondo text-texto', Icono: AlertTriangle },
  peligro: { caja: 'border-peligro/40 bg-peligro-fondo text-texto', Icono: XCircle },
};

export function Aviso({ tono = 'info', titulo, children, className }: { tono?: TonoAviso; titulo?: string; children?: ReactNode; className?: string }): JSX.Element {
  const { caja, Icono } = ESTILO_AVISO[tono];
  return (
    <div role={tono === 'peligro' ? 'alert' : 'status'} className={cn('flex gap-2 rounded-md border px-3 py-2 text-base', caja, className)}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo !== undefined && <p className="font-medium">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

export function Insignia({ tono = 'info', children }: { tono?: TonoAviso | 'neutro'; children: ReactNode }): JSX.Element {
  const estilo: Record<TonoAviso | 'neutro', string> = {
    info: 'bg-acento/10 text-acento',
    exito: 'bg-exito-fondo text-exito',
    aviso: 'bg-aviso-fondo text-aviso',
    peligro: 'bg-peligro-fondo text-peligro',
    neutro: 'bg-superficie text-texto-secundario',
  };
  return <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide', estilo[tono])}>{children}</span>;
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }): JSX.Element {
  return (
    <p role="status" className="flex items-center gap-2 py-6 text-texto-secundario">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {texto}
    </p>
  );
}

export function EstadoVacio({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-borde bg-superficie px-4 py-6">
      <p className="font-medium text-texto">{titulo}</p>
      {descripcion !== undefined && <p className="text-texto-secundario">{descripcion}</p>}
      {accion}
    </div>
  );
}

// ── Estructura ────────────────────────────────────────────────────────────────

export function Seccion({ titulo, descripcion, acciones, children }: { titulo: string; descripcion?: string | undefined; acciones?: ReactNode | undefined; children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-borde bg-elevada">
      <header className="flex items-start justify-between gap-4 border-b border-borde px-4 py-3">
        <div>
          <h2 className="text-md font-semibold text-texto">{titulo}</h2>
          {descripcion !== undefined && <p className="text-sm text-texto-secundario">{descripcion}</p>}
        </div>
        {acciones !== undefined && <div className="flex shrink-0 gap-2">{acciones}</div>}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function Encabezado({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: string | undefined; acciones?: ReactNode | undefined }): JSX.Element {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-texto">{titulo}</h1>
        {subtitulo !== undefined && <p className="text-texto-secundario">{subtitulo}</p>}
      </div>
      {acciones !== undefined && <div className="flex shrink-0 gap-2">{acciones}</div>}
    </header>
  );
}

export interface ColumnaTabla<T> {
  readonly clave: string;
  readonly titulo: string;
  readonly celda: (fila: T) => ReactNode;
  readonly alineacion?: 'izquierda' | 'derecha';
  readonly ancho?: string;
}

/** Tabla simple para catálogos pequeños. Los listados de 20.000 filas usan <TablaDatos> (T-C-02). */
export function TablaSimple<T>({ columnas, filas, claveFila, vacio }: { columnas: readonly ColumnaTabla<T>[]; filas: readonly T[]; claveFila: (f: T) => string; vacio: ReactNode }): JSX.Element {
  if (filas.length === 0) return <>{vacio}</>;
  return (
    <div className="overflow-x-auto rounded-md border border-borde">
      <table className="w-full border-collapse text-base">
        <thead className="bg-superficie text-left text-sm text-texto-secundario">
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" style={c.ancho !== undefined ? { width: c.ancho } : undefined} className={cn('px-3 py-2 font-medium', c.alineacion === 'derecha' && 'text-right')}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={claveFila(f)} className="border-t border-borde odd:bg-elevada even:bg-superficie/50">
              {columnas.map((c) => (
                <td key={c.clave} className={cn('px-3 py-1.5 align-middle', c.alineacion === 'derecha' && 'text-right tabular-nums')}>
                  {c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
