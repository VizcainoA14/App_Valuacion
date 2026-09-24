/** Marco del inventario: pestañas de sus pantallas. */
import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';
import { cn } from '../../../componentes/ui';
import { useProcesoRuta } from '../hooks';

const PANTALLAS = [
  { ruta: 'importar', nombre: 'Cargar' },
  { ruta: 'bienes', nombre: 'Listado de bienes' },
  { ruta: 'barridos', nombre: 'Barridos y servicios' },
];

export function Inventario(): JSX.Element {
  const procesoId = useProcesoRuta();
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Pantallas del inventario" className="flex gap-1 border-b border-borde">
        {PANTALLAS.map((p) => (
          <NavLink
            key={p.ruta}
            to={`/proceso/${procesoId}/inventario/${p.ruta}`}
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
