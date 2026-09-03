/** Marco de la etapa 5 (paso 09): candidatos, propuestas y validaciones VAL-09-*. */
import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useCanal } from '../../../ipc/consultas';
import { PanelValidaciones } from '../../../componentes/PanelValidaciones/PanelValidaciones';
import { Aviso, Cargando, cn } from '../../../componentes/ui';
import { useContextoEjercicio } from '../../inventario/hooks';

const PANTALLAS = [
  { ruta: 'candidatos', nombre: 'Candidatos' },
  { ruta: 'propuestas', nombre: 'Propuestas' },
];

export function Paso09(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const ejercicio = useCanal('ejercicio:porId', { id: ejercicioId });
  const validaciones = useCanal('validaciones:evaluar', { paso: 9, entidadId, ejercicioId });

  if (ejercicio.isPending) return <Cargando />;
  if (ejercicio.data === null || ejercicio.data === undefined) return <Aviso tono="peligro">El ejercicio no existe.</Aviso>;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Pantallas de las bajas" className="flex gap-1 border-b border-borde">
        {PANTALLAS.map((p) => (
          <NavLink
            key={p.ruta}
            to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/09/${p.ruta}`}
            className={({ isActive }) => cn('-mb-px border-b-2 px-3 py-2 text-base', isActive ? 'border-acento font-medium text-texto' : 'border-transparent text-texto-secundario hover:text-texto')}
          >
            {p.nombre}
          </NavLink>
        ))}
      </nav>
      <Outlet />
      {validaciones.data !== undefined && <PanelValidaciones resultado={validaciones.data} textoAvanzar="Avanzar al informe" />}
    </div>
  );
}
