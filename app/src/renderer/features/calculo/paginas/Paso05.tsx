/** Marco de la etapa 4 (pasos 05 y 06): calcular y ver el resultado bien por bien. */
import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useCanal } from '../../../ipc/consultas';
import { Aviso, Cargando, cn } from '../../../componentes/ui';
import { useContextoEjercicio } from '../../inventario/hooks';

const PANTALLAS = [
  { ruta: 'calcular', nombre: 'Calcular' },
  { ruta: 'resultados', nombre: 'Resultado por bien' },
];

export function Paso05(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const ejercicio = useCanal('ejercicio:porId', { id: ejercicioId });

  if (ejercicio.isPending) return <Cargando />;
  if (ejercicio.data === null || ejercicio.data === undefined) return <Aviso tono="peligro">El ejercicio no existe.</Aviso>;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Pantallas del cálculo" className="flex gap-1 border-b border-borde">
        {PANTALLAS.map((p) => (
          <NavLink
            key={p.ruta}
            to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/05/${p.ruta}`}
            className={({ isActive }) => cn('-mb-px border-b-2 px-3 py-2 text-base', isActive ? 'border-acento font-medium text-texto' : 'border-transparent text-texto-secundario hover:text-texto')}
          >
            {p.nombre}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
