/** Pantalla inicial: elegir la entidad con la que se trabaja o crear una nueva. */
import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Building2, ChevronRight, FlaskConical } from 'lucide-react';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { useEstadoInterfaz } from '../../../app/estado';
import { Boton, Cargando, Encabezado, EstadoVacio, Aviso, Insignia } from '../../../componentes/ui';
import { mensajeError } from '../hooks';

export function SelectorEntidad(): JSX.Element {
  const entidades = useCanal('entidad:listar');
  const navegar = useNavigate();
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const cargarDemo = useMutacion('demo:cargar', ['entidad:listar']);
  const hayDemo = entidades.data?.some((e) => e.esDemostracion) === true;

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
            <li key={e.id}>
              <Link
                to={`/entidad/${e.id}/paso/01`}
                onClick={() => fijarEntidadActiva(e.id)}
                className="flex items-center gap-3 rounded-lg border border-borde bg-elevada px-4 py-3 hover:border-acento"
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
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
