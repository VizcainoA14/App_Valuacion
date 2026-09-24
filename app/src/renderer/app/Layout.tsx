/**
 * Marco de la aplicación (ADR-029). Lo principal es el proceso: fuera de uno,
 * la barra lateral solo ofrece la lista de procesos y los formatos en blanco;
 * dentro de uno, las cosas que se hacen en él. El proceso con el que se trabaja
 * es SIEMPRE el de la ruta: no hay uno "activo" recordado que pueda mezclar lo
 * de un proceso con lo de otro.
 */
import { useEffect, useState, type JSX } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router';
import { Building2, Sun, Moon, Monitor, FlaskConical, Trash2, Settings2, FileSpreadsheet, Boxes, Calculator, ClipboardList, FileCheck2, LayoutList, Lock, ArrowLeft, type LucideIcon } from 'lucide-react';
import { useEstadoInterfaz, aplicarApariencia } from './estado';
import { useCanal, useMutacion } from '../ipc/consultas';
import { Boton, Insignia, cn } from '../componentes/ui';
import { Dialogo } from '../componentes/Dialogo/Dialogo';
import { formatearFecha } from '../formato';

interface Seccion {
  readonly nombre: string;
  readonly resumen: string;
  readonly icono: LucideIcon;
  readonly destino: (procesoId: string) => string;
  readonly exacta?: boolean;
}

const SECCIONES_PROCESO: readonly Seccion[] = [
  { nombre: 'Resumen', resumen: 'En qué va el proceso', icono: LayoutList, destino: (p) => `/proceso/${p}`, exacta: true },
  { nombre: 'Configurar', resumen: 'Hospital, clases de activo y método', icono: Settings2, destino: (p) => `/proceso/${p}/configuracion` },
  { nombre: 'Formatos', resumen: 'Los Excel para diligenciar', icono: FileSpreadsheet, destino: (p) => `/proceso/${p}/formatos` },
  { nombre: 'Inventario', resumen: 'El barrido y los datos económicos', icono: Boxes, destino: (p) => `/proceso/${p}/inventario` },
  { nombre: 'Calcular', resumen: 'Depreciación y obsolescencia', icono: Calculator, destino: (p) => `/proceso/${p}/calculo` },
  { nombre: 'Bajas', resumen: 'Candidatos y bajas registradas', icono: ClipboardList, destino: (p) => `/proceso/${p}/bajas` },
  { nombre: 'Informe', resumen: 'El informe del cálculo, en PDF', icono: FileCheck2, destino: (p) => `/proceso/${p}/informe` },
];

const SECCIONES_INICIO: readonly Seccion[] = [
  { nombre: 'Procesos', resumen: 'Iniciar uno o continuar', icono: LayoutList, destino: () => '/', exacta: true },
  { nombre: 'Formatos', resumen: 'Los Excel en blanco', icono: FileSpreadsheet, destino: () => '/formatos' },
];

export function Layout(): JSX.Element {
  const { procesoId } = useParams();
  const { tema, densidad, fijarTema } = useEstadoInterfaz();
  const proceso = useCanal('proceso:porId', procesoId === undefined ? undefined : { id: procesoId }, { enabled: procesoId !== undefined });
  const p = procesoId !== undefined ? (proceso.data ?? null) : null;

  useEffect(() => {
    aplicarApariencia(tema, densidad);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const oyente = (): void => aplicarApariencia(tema, densidad);
    media.addEventListener('change', oyente);
    return () => media.removeEventListener('change', oyente);
  }, [tema, densidad]);

  const siguienteTema = tema === 'sistema' ? 'claro' : tema === 'claro' ? 'oscuro' : 'sistema';
  const IconoTema = tema === 'oscuro' ? Moon : tema === 'claro' ? Sun : Monitor;

  return (
    <div className="flex h-full">
      <nav aria-label="Secciones" className="flex w-64 shrink-0 flex-col border-r border-borde bg-superficie">
        <div className="border-b border-borde px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-md font-semibold text-texto">
            <Building2 className="h-5 w-5 text-acento" aria-hidden />
            Valuación de Activos
          </NavLink>
          {p !== null && (
            <div className="mt-2" data-prueba="proceso-actual">
              <NavLink to="/" className="mb-1 inline-flex items-center gap-1 text-sm text-texto-secundario hover:text-texto">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Todos los procesos
              </NavLink>
              <p className="truncate font-medium text-texto" title={p.nombre}>
                {p.nombre}
              </p>
              <p className="truncate text-sm text-texto-secundario" title={p.razonSocial}>
                {p.razonSocial}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-texto-secundario">
                Corte {formatearFecha(p.fechaCorte)}
                <Insignia tono={p.estado === 'FINALIZADO' ? 'neutro' : 'info'}>{p.estado === 'FINALIZADO' ? 'Finalizado' : 'En curso'}</Insignia>
              </p>
            </div>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto py-2">
          {(procesoId === undefined ? SECCIONES_INICIO : SECCIONES_PROCESO).map((seccion) => {
            const Icono = seccion.icono;
            return (
              <li key={seccion.nombre}>
                <NavLink
                  to={seccion.destino(procesoId ?? '')}
                  end={seccion.exacta === true}
                  className={({ isActive }) => cn('mx-2 flex items-center gap-2.5 rounded px-2 py-1.5 text-base text-texto hover:bg-elevada', isActive && 'bg-elevada font-medium')}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acento/15 text-acento">
                    <Icono className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{seccion.nombre}</span>
                    <span className="block truncate text-sm text-texto-secundario">{seccion.resumen}</span>
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-borde px-3 py-2">
          <button type="button" onClick={() => fijarTema(siguienteTema)} className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm text-texto-secundario hover:bg-elevada" aria-label={`Tema: ${tema}. Cambiar a ${siguienteTema}`}>
            <IconoTema className="h-4 w-4" aria-hidden />
            {tema}
          </button>
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {p?.esDemostracion === true && <BandaDemostracion procesoId={p.id} />}
        {p?.estado === 'FINALIZADO' && (
          <div role="status" data-prueba="banda-finalizado" className="flex items-center gap-2 border-b border-borde bg-superficie px-4 py-2 text-base text-texto">
            <Lock className="h-4 w-4 shrink-0 text-texto-secundario" aria-hidden />
            <span>
              <strong>Proceso finalizado</strong> el {formatearFecha((p.finalizadoEn ?? p.actualizadoEn).slice(0, 10))}: se consulta y se puede volver a sacar el informe, pero ya no se modifica.
              Para valorar otra vez, inicie un proceso nuevo.
            </span>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

/** T-B-11: banda visible PERMANENTE dentro del proceso de ejemplo; nunca se confunde con un hospital real. */
function BandaDemostracion({ procesoId }: { procesoId: string }): JSX.Element {
  const [confirmando, setConfirmando] = useState(false);
  const navegar = useNavigate();
  const borrar = useMutacion('demo:borrar', ['proceso:listar']);
  return (
    <div role="status" data-prueba="banda-demo" className="flex items-center justify-between gap-3 border-b border-aviso/50 bg-aviso-fondo px-4 py-2 text-base text-texto">
      <span className="flex items-center gap-2 font-semibold">
        <FlaskConical className="h-4 w-4 text-aviso" aria-hidden />
        MODO DEMOSTRACIÓN — datos ficticios; todo documento generado sale marcado "EJEMPLO — SIN VALIDEZ"
      </span>
      <Boton variante="peligro" icono={<Trash2 className="h-4 w-4" aria-hidden />} onClick={() => setConfirmando(true)}>
        Borrar demostración
      </Boton>
      <Dialogo
        abierto={confirmando}
        onCambioAbierto={setConfirmando}
        titulo="¿Borrar el proceso de demostración?"
        descripcion="Se elimina el proceso ficticio y todo lo suyo (hospital, bienes, cálculo, bajas). Los demás procesos no se tocan."
        pie={
          <>
            <Boton onClick={() => setConfirmando(false)}>Cancelar</Boton>
            <Boton
              variante="peligro"
              cargando={borrar.isPending}
              onClick={() =>
                borrar.mutate(
                  { procesoId },
                  {
                    onSuccess: () => {
                      setConfirmando(false);
                      void navegar('/');
                    },
                  },
                )
              }
            >
              Sí, borrar
            </Boton>
          </>
        }
      >
        <p className="text-texto-secundario">Podrá volver a cargarlo desde la lista de procesos cuando lo necesite para capacitación.</p>
      </Dialogo>
    </div>
  );
}
