/** Marco del paso 01: barra del asistente (estado por subpaso desde las validaciones) y subpáginas. */
import type { JSX } from 'react';
import { Outlet } from 'react-router';
import { useEntidadId, useEjercicioVigente, useValidaciones } from '../hooks';
import { AsistentePasos, type EstadoSubpaso } from '../../../componentes/AsistentePasos/AsistentePasos';
import { useCanal } from '../../../ipc/consultas';
import { Cargando, Aviso } from '../../../componentes/ui';

export function Paso01(): JSX.Element {
  const entidadId = useEntidadId();
  const entidad = useCanal('entidad:porId', { id: entidadId });
  const { vigente } = useEjercicioVigente(entidadId);
  const validaciones = useValidaciones(1, entidadId, vigente?.id ?? null);

  const cumple = (...codigos: string[]): EstadoSubpaso => {
    const r = validaciones.data?.resultados ?? [];
    const pendientes = r.filter((x) => codigos.includes(x.codigo) && !x.cumple);
    if (validaciones.data === undefined) return 'pendiente';
    if (pendientes.length === 0) return 'completo';
    return pendientes.some((x) => x.severidad === 'BLOQUEANTE') ? 'bloqueante' : 'pendiente';
  };
  const base = `/entidad/${entidadId}/paso/01`;
  const subpasos = [
    { clave: 'entidad', nombre: 'Entidad', ruta: `${base}/entidad`, estado: cumple('VAL-01-01') },
    { clave: 'sedes', nombre: 'Sedes y servicios', ruta: `${base}/sedes`, estado: cumple('VAL-01-02', 'VAL-01-03') },
    { clave: 'clases', nombre: 'Clases de activo', ruta: `${base}/clases`, estado: cumple('VAL-01-04', 'VAL-01-05') },
    { clave: 'parametros', nombre: 'Parámetros', ruta: `${base}/parametros`, estado: cumple('VAL-01-07', 'VAL-01-10') },
    { clave: 'ejercicio', nombre: 'Ejercicio', ruta: `${base}/ejercicio`, estado: cumple('VAL-01-06') },
  ];

  if (entidad.isPending) return <Cargando texto="Cargando entidad…" />;
  if (entidad.data === null || entidad.data === undefined) return <Aviso tono="peligro">La entidad no existe.</Aviso>;

  return (
    <div className="flex flex-col gap-5">
      <AsistentePasos subpasos={subpasos} />
      <Outlet />
    </div>
  );
}
