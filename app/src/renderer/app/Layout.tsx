/**
 * Marco de la aplicación. La navegación es el **camino del cálculo** de ADR-026
 * —seis etapas que el hospital recorre en orden— y no los 11 pasos del contrato.
 * Las extensiones van agrupadas aparte, para no estorbar el camino principal.
 * Una etapa aún no disponible se muestra deshabilitada **con su razón**, nunca oculta.
 */
import { useEffect, useState, type JSX } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router';
import { Building2, Sun, Moon, Monitor, FlaskConical, Trash2, Settings2, FileSpreadsheet, Boxes, Calculator, ClipboardList, FileCheck2, type LucideIcon } from 'lucide-react';
import { useEstadoInterfaz, aplicarApariencia } from './estado';
import { useCanal, useMutacion } from '../ipc/consultas';
import { Boton, cn } from '../componentes/ui';
import { Dialogo } from '../componentes/Dialogo/Dialogo';

interface Etapa {
  readonly numero: number;
  readonly nombre: string;
  readonly resumen: string;
  readonly icono: LucideIcon;
  /** Construye el destino; null = todavía no implementada. */
  readonly destino: ((entidadId: string, ejercicioId: string | null) => string) | null;
  readonly necesitaEntidad: boolean;
  readonly necesitaEjercicio: boolean;
  /** Por qué no está disponible aún, cuando `destino` es null. */
  readonly pendiente?: string;
}

const ETAPAS: readonly Etapa[] = [
  {
    numero: 1,
    nombre: 'Configurar',
    resumen: 'La entidad, sus clases de activo y el método de cálculo',
    icono: Settings2,
    destino: (e) => `/entidad/${e}/paso/01`,
    necesitaEntidad: true,
    necesitaEjercicio: false,
  },
  {
    numero: 2,
    nombre: 'Formatos',
    resumen: 'Descargar los Excel para diligenciar',
    icono: FileSpreadsheet,
    destino: () => '/formatos',
    necesitaEntidad: false,
    necesitaEjercicio: false,
  },
  {
    numero: 3,
    nombre: 'Inventario',
    resumen: 'Los bienes y sus datos económicos',
    icono: Boxes,
    destino: (e, ej) => `/entidad/${e}/ejercicio/${ej}/paso/02`,
    necesitaEntidad: true,
    necesitaEjercicio: true,
  },
  {
    numero: 4,
    nombre: 'Calcular',
    resumen: 'Depreciación y obsolescencia',
    icono: Calculator,
    destino: (e, ej) => `/entidad/${e}/ejercicio/${ej}/paso/05`,
    necesitaEntidad: true,
    necesitaEjercicio: true,
  },
  {
    numero: 5,
    nombre: 'Bajas',
    resumen: 'Qué bienes se proponen dar de baja, y por qué',
    icono: ClipboardList,
    destino: (e, ej) => `/entidad/${e}/ejercicio/${ej}/paso/09`,
    necesitaEntidad: true,
    necesitaEjercicio: true,
  },
  {
    numero: 6,
    nombre: 'Informe',
    resumen: 'El listado depreciado y la entrega',
    icono: FileCheck2,
    destino: (e, ej) => `/entidad/${e}/ejercicio/${ej}/paso/11`,
    necesitaEntidad: true,
    necesitaEjercicio: true,
  },
];

/** Pasos de `/Teoria` fuera del núcleo (ADR-026). Se listan para que se sepa que existen. */
const EXTENSIONES: readonly { nombre: string; paso: string }[] = [
  { nombre: 'Conciliación con contabilidad', paso: 'paso 04' },
  { nombre: 'Valuación técnica de muebles', paso: 'paso 07' },
  { nombre: 'Inmuebles y avalúos', paso: 'paso 08' },
  { nombre: 'Comité y resoluciones', paso: 'pasos 09-10' },
  { nombre: 'Entrega contractual y cierre', paso: 'paso 11' },
];

export function Layout(): JSX.Element {
  const { entidadId: entidadDeLaRuta } = useParams();
  const { tema, densidad, fijarTema, entidadActivaId, fijarEntidadActiva } = useEstadoInterfaz();

  /**
   * La entidad con la que se trabaja NO puede depender solo de la URL: la etapa 2
   * (`/formatos`) es alcanzable sin haber configurado nada (ADR-026), así que su
   * ruta no lleva `:entidadId`. Deducirla únicamente de los parámetros dejaba el
   * resto de etapas deshabilitadas al entrar a Formatos, como si no hubiera
   * entidad seleccionada. Manda la ruta cuando la trae; si no, la última elegida.
   */
  const entidadId = entidadDeLaRuta ?? entidadActivaId ?? undefined;

  // Navegar por URL a otra entidad también la convierte en la activa.
  useEffect(() => {
    if (entidadDeLaRuta !== undefined && entidadDeLaRuta !== entidadActivaId) fijarEntidadActiva(entidadDeLaRuta);
  }, [entidadDeLaRuta, entidadActivaId, fijarEntidadActiva]);

  const entidad = useCanal('entidad:porId', entidadId === undefined ? undefined : { id: entidadId }, { enabled: entidadId !== undefined });
  const ejercicios = useCanal('ejercicio:listar', entidadId === undefined ? undefined : { entidadId }, { enabled: entidadId !== undefined });
  // El ejercicio vigente es el más reciente de la entidad; las etapas 3-6 cuelgan de él.
  const ejercicioId = ejercicios.data?.[0]?.id ?? null;

  /**
   * Si la entidad recordada ya no existe (se borró la demostración desde otra
   * ventana, o se restauró un respaldo), se olvida en vez de dejar la barra
   * lateral apuntando a algo que no está.
   */
  useEffect(() => {
    if (entidadDeLaRuta === undefined && entidadActivaId !== null && entidad.isSuccess && entidad.data === null) {
      fijarEntidadActiva(null);
    }
  }, [entidadDeLaRuta, entidadActivaId, entidad.isSuccess, entidad.data, fijarEntidadActiva]);

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
      <nav aria-label="Etapas del proceso" className="flex w-64 shrink-0 flex-col border-r border-borde bg-superficie">
        <div className="border-b border-borde px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-md font-semibold text-texto">
            <Building2 className="h-5 w-5 text-acento" aria-hidden />
            Valuación de Activos
          </NavLink>
          {entidad.data !== undefined && entidad.data !== null && (
            <p className="mt-1 truncate text-sm text-texto-secundario" title={entidad.data.razonSocial}>
              {entidad.data.razonSocial}
            </p>
          )}
        </div>

        <ol className="flex-1 overflow-y-auto py-2">
          {ETAPAS.map((etapa) => {
            const faltaEntidad = etapa.necesitaEntidad && entidadId === undefined;
            const faltaEjercicio = etapa.necesitaEjercicio && ejercicioId === null;
            const disponible = etapa.destino !== null && !faltaEntidad && !faltaEjercicio;
            const razon = faltaEntidad
              ? 'Seleccione primero una entidad'
              : faltaEjercicio
                ? 'Cree el ejercicio en la etapa 1'
                : (etapa.pendiente ?? '');
            const Icono = etapa.icono;
            const contenido = (
              <>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', disponible ? 'bg-acento/15 text-acento' : 'bg-borde text-texto-secundario')}>
                  <Icono className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">
                    {etapa.numero}. {etapa.nombre}
                  </span>
                  <span className="block truncate text-sm text-texto-secundario">{disponible ? etapa.resumen : razon}</span>
                </span>
              </>
            );
            return (
              <li key={etapa.numero}>
                {disponible && etapa.destino !== null ? (
                  <NavLink
                    to={etapa.destino(entidadId ?? '', ejercicioId)}
                    className={({ isActive }) => cn('mx-2 flex items-center gap-2.5 rounded px-2 py-1.5 text-base text-texto hover:bg-elevada', isActive && 'bg-elevada font-medium')}
                  >
                    {contenido}
                  </NavLink>
                ) : (
                  <span aria-disabled="true" title={razon} className="mx-2 flex cursor-not-allowed items-center gap-2.5 rounded px-2 py-1.5 text-base text-texto-secundario">
                    {contenido}
                  </span>
                )}
              </li>
            );
          })}

          <li className="mt-3 border-t border-borde px-4 pb-1 pt-3">
            <p className="text-sm font-medium text-texto-secundario">Proceso completo de saneamiento</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {EXTENSIONES.map((x) => (
                <li key={x.nombre} className="truncate text-sm text-texto-secundario/80" title={`${x.paso} · disponible más adelante`}>
                  {x.nombre}
                </li>
              ))}
            </ul>
          </li>
        </ol>

        <div className="flex items-center justify-between border-t border-borde px-3 py-2">
          <button type="button" onClick={() => fijarTema(siguienteTema)} className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm text-texto-secundario hover:bg-elevada" aria-label={`Tema: ${tema}. Cambiar a ${siguienteTema}`}>
            <IconoTema className="h-4 w-4" aria-hidden />
            {tema}
          </button>
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {entidad.data?.esDemostracion === true && <BandaDemostracion entidadId={entidad.data.id} />}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

/** T-B-11: banda visible PERMANENTE mientras la entidad activa sea la de ejemplo; nunca se confunde con un hospital real. */
function BandaDemostracion({ entidadId }: { entidadId: string }): JSX.Element {
  const [confirmando, setConfirmando] = useState(false);
  const navegar = useNavigate();
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const borrar = useMutacion('demo:borrar', ['entidad:listar']);
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
        titulo="¿Borrar el hospital de demostración?"
        descripcion="Se eliminan la entidad ficticia y todo lo suyo (bienes, hojas de vida, ejercicio, inmueble). Los datos reales no se tocan."
        pie={
          <>
            <Boton onClick={() => setConfirmando(false)}>Cancelar</Boton>
            <Boton
              variante="peligro"
              cargando={borrar.isPending}
              onClick={() =>
                borrar.mutate(
                  { entidadId },
                  {
                    onSuccess: () => {
                      fijarEntidadActiva(null);
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
        <p className="text-texto-secundario">Podrá volver a cargarlo desde la lista de entidades cuando lo necesite para capacitación.</p>
      </Dialogo>
    </div>
  );
}
