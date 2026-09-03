/** Marco del paso 02: pestañas de sus pantallas y panel de validaciones VAL-02-*. */
import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useCanal } from '../../../ipc/consultas';
import { PanelValidaciones } from '../../../componentes/PanelValidaciones/PanelValidaciones';
import { Aviso, Cargando, cn } from '../../../componentes/ui';
import { useContextoEjercicio } from '../hooks';

const PANTALLAS = [
  { ruta: 'importar', nombre: 'Importar' },
  { ruta: 'bienes', nombre: 'Listado de bienes' },
  { ruta: 'cobertura', nombre: 'Cobertura' },
];

export function Paso02(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const ejercicio = useCanal('ejercicio:porId', { id: ejercicioId });
  const validaciones = useCanal('validaciones:evaluar', { paso: 2, entidadId, ejercicioId });

  if (ejercicio.isPending) return <Cargando />;
  if (ejercicio.data === null || ejercicio.data === undefined) return <Aviso tono="peligro">El ejercicio no existe.</Aviso>;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Pantallas del paso 02" className="flex gap-1 border-b border-borde">
        {PANTALLAS.map((p) => (
          <NavLink
            key={p.ruta}
            to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/02/${p.ruta}`}
            className={({ isActive }) => cn('-mb-px border-b-2 px-3 py-2 text-base', isActive ? 'border-acento font-medium text-texto' : 'border-transparent text-texto-secundario hover:text-texto')}
          >
            {p.nombre}
          </NavLink>
        ))}
      </nav>
      <Outlet />
      {validaciones.data !== undefined && <PanelValidaciones resultado={validaciones.data} textoAvanzar="Avanzar al paso 03" />}
    </div>
  );
}
