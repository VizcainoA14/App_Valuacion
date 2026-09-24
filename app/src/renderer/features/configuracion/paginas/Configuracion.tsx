/**
 * Marco de la configuración: barra del asistente (estado de cada parte según la
 * revisión de la configuración) y sus subpáginas. Se hace
 * al iniciar el proceso y se corrige mientras siga en curso (ADR-029).
 */
import type { JSX } from 'react';
import { Link, Outlet } from 'react-router';
import { useProcesoId, useValidaciones } from '../hooks';
import { AsistentePasos, type EstadoSubpaso } from '../../../componentes/AsistentePasos/AsistentePasos';
import { useCanal } from '../../../ipc/consultas';
import { Cargando, Aviso } from '../../../componentes/ui';

export function Configuracion(): JSX.Element {
  const procesoId = useProcesoId();
  const proceso = useCanal('proceso:porId', { id: procesoId });
  const validaciones = useValidaciones(procesoId);

  const cumple = (...codigos: string[]): EstadoSubpaso => {
    const r = validaciones.data?.resultados ?? [];
    const pendientes = r.filter((x) => codigos.includes(x.codigo) && !x.cumple);
    if (validaciones.data === undefined) return 'pendiente';
    if (pendientes.length === 0) return 'completo';
    return pendientes.some((x) => x.severidad === 'BLOQUEANTE') ? 'bloqueante' : 'pendiente';
  };
  const base = `/proceso/${procesoId}/configuracion`;
  const subpasos = [
    { clave: 'hospital', nombre: 'Proceso y hospital', ruta: `${base}/hospital`, estado: cumple('VAL-01-01') },
    { clave: 'sedes', nombre: 'Sedes y servicios', ruta: `${base}/sedes`, estado: cumple('VAL-01-02', 'VAL-01-03') },
    { clave: 'clases', nombre: 'Clases de activo', ruta: `${base}/clases`, estado: cumple('VAL-01-04', 'VAL-01-05', 'VAL-01-09') },
    { clave: 'parametros', nombre: 'Parámetros', ruta: `${base}/parametros`, estado: cumple('VAL-01-10') },
  ];

  if (proceso.isPending) return <Cargando texto="Cargando el proceso…" />;
  if (proceso.data === null || proceso.data === undefined) return <Aviso tono="peligro">El proceso no existe.</Aviso>;
  const soloLectura = proceso.data.estado === 'FINALIZADO';

  const lista = validaciones.data?.lista === true;
  return (
    <div className="flex flex-col gap-5">
      <AsistentePasos subpasos={subpasos} />
      {lista && !soloLectura && (
        <Aviso tono="exito" titulo="La configuración está lista">
          Ya puede cargar el inventario en{' '}
          <Link className="underline" to={`/proceso/${procesoId}/inventario`}>
            Inventario
          </Link>{' '}
          y calcular cuando quiera.
        </Aviso>
      )}
      {/* ADR-029: finalizado, la configuración se consulta pero no se toca. */}
      <fieldset disabled={soloLectura} className="contents">
        <Outlet />
      </fieldset>
    </div>
  );
}
