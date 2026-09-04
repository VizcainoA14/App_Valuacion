/** Pantalla inicial: elegir la entidad con la que se trabaja o crear una nueva. */
import { useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Building2, ChevronRight, FlaskConical, Trash2 } from 'lucide-react';
import type { EntidadDto } from '@compartido/dtos/configuracion';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { useEstadoInterfaz } from '../../../app/estado';
import { AreaTexto, Boton, Cargando, Encabezado, EstadoVacio, Aviso, Insignia } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { mensajeError } from '../hooks';

export function SelectorEntidad(): JSX.Element {
  const entidades = useCanal('entidad:listar');
  const navegar = useNavigate();
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const cargarDemo = useMutacion('demo:cargar', ['entidad:listar']);
  const hayDemo = entidades.data?.some((e) => e.esDemostracion) === true;
  const [aEliminar, setAEliminar] = useState<EntidadDto | null>(null);

  return (
    <>
      <Encabezado
        titulo="Entidades"
        subtitulo="Cada E.S.E se parametriza una vez; sus ejercicios de valuación cuelgan de ella."
        acciones={
          <>
            {!hayDemo && (
              <Boton icono={<FlaskConical className="h-4 w-4" aria-hidden />} cargando={cargarDemo.isPending} onClick={() => cargarDemo.mutate(undefined)} title="Entidad ficticia con 50 bienes para capacitación; se borra de un clic">
                Cargar hospital de demostración
              </Boton>
            )}
            <Boton variante="primario" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => void navegar('/nueva-entidad')}>
              Nueva entidad
            </Boton>
          </>
        }
      />
      {cargarDemo.isError && (
        <Aviso tono="peligro" className="mb-4">
          {mensajeError(cargarDemo.error)}
        </Aviso>
      )}
      {entidades.isPending && <Cargando texto="Cargando entidades…" />}
      {entidades.isError && <Aviso tono="peligro">{entidades.error.message}</Aviso>}
      {entidades.data !== undefined && entidades.data.length === 0 && (
        <EstadoVacio
          titulo="Aún no hay entidades"
          descripcion="Empiece por el paso 01: identificación de la E.S.E, sedes, servicios, clases de activo y parámetros de cálculo."
          accion={
            <Boton variante="primario" onClick={() => void navegar('/nueva-entidad')}>
              Crear la primera entidad
            </Boton>
          }
        />
      )}
      {entidades.data !== undefined && entidades.data.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {entidades.data.map((e) => (
            <li key={e.id} className="relative">
              <Link
                to={`/entidad/${e.id}/paso/01`}
                onClick={() => fijarEntidadActiva(e.id)}
                className="flex items-center gap-3 rounded-lg border border-borde bg-elevada px-4 py-3 pr-12 hover:border-acento"
              >
                <Building2 className="h-6 w-6 shrink-0 text-acento" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-texto">{e.razonSocial}</span>
                  <span className="block text-sm text-texto-secundario">
                    NIT {e.nit} · {e.municipio}, {e.departamento} · Nivel {e.nivelComplejidad}
                  </span>
                </span>
                {e.esDemostracion && <Insignia tono="aviso">Demostración</Insignia>}
                <ChevronRight className="h-4 w-4 shrink-0 text-texto-secundario" aria-hidden />
              </Link>
              {/* Fuera del enlace: pulsar "eliminar" no puede ser también "entrar". */}
              {!e.esDemostracion && (
                <button
                  type="button"
                  aria-label={`Eliminar ${e.razonSocial}`}
                  title="Eliminar esta entidad"
                  onClick={() => setAEliminar(e)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-texto-secundario hover:bg-peligro/10 hover:text-peligro"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {aEliminar !== null && <DialogoEliminar entidad={aEliminar} onCerrar={() => setAEliminar(null)} />}
    </>
  );
}

/**
 * Eliminar una entidad es irreversible y no se ofrece a la ligera: exige escribir
 * el motivo, que queda en bitácora. La aplicación solo lo permite mientras la
 * valuación no haya empezado; si ya hay ejercicio, el main lo explica y aquí se
 * muestra tal cual, sin traducirlo a un "no se pudo" que no dice nada.
 */
function DialogoEliminar({ entidad, onCerrar }: { entidad: EntidadDto; onCerrar: () => void }): JSX.Element {
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const eliminar = useMutacion('entidad:eliminar', ['entidad:listar']);

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`¿Eliminar ${entidad.razonSocial}?`}
      descripcion="Se borran también sus sedes, servicios, clases de activo, responsables y parámetros. No se puede deshacer."
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton
            variante="peligro"
            cargando={eliminar.isPending}
            disabled={justificacion.trim().length < 5}
            onClick={() => {
              setError(null);
              eliminar.mutate(
                { id: entidad.id, justificacion },
                {
                  onSuccess: () => {
                    fijarEntidadActiva(null);
                    onCerrar();
                  },
                  onError: (e) => setError(mensajeError(e)),
                },
              );
            }}
          >
            Sí, eliminar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error !== null && (
          <Aviso tono="peligro" titulo="No se eliminó">
            {error}
          </Aviso>
        )}
        <Aviso tono="info">
          Solo se puede eliminar mientras <strong>no se haya creado ningún ejercicio</strong>. En cuanto la valuación empieza hay trabajo y bitácora asociados, y si algún ejercicio se cerró
          es evidencia contable que no se borra.
        </Aviso>
        <AreaTexto
          etiqueta="Motivo"
          obligatorio
          ayuda="Queda en la bitácora. Por ejemplo: “creada con el NIT equivocado” o “duplicada por error”."
          value={justificacion}
          onChange={(ev) => setJustificacion(ev.target.value)}
          placeholder="Entidad creada por error durante una prueba."
        />
      </div>
    </Dialogo>
  );
}
