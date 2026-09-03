/**
 * Estado de la INTERFAZ (plan 2.5 §1): existe solo mientras la ventana está
 * abierta. Los datos de negocio viven en SQLite y llegan por TanStack Query.
 */
import { create } from 'zustand';

export type Tema = 'claro' | 'oscuro' | 'sistema';
export type Densidad = 'comoda' | 'compacta';

interface EstadoInterfaz {
  readonly tema: Tema;
  readonly densidad: Densidad;
  readonly entidadActivaId: string | null;
  readonly ejercicioActivoId: string | null;
  fijarTema(tema: Tema): void;
  fijarDensidad(densidad: Densidad): void;
  fijarEntidadActiva(id: string | null): void;
  fijarEjercicioActivo(id: string | null): void;
}

const CLAVE = 'valuacion.interfaz';

function leerGuardado(): Partial<Pick<EstadoInterfaz, 'tema' | 'densidad' | 'entidadActivaId' | 'ejercicioActivoId'>> {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo === null ? {} : (JSON.parse(crudo) as Partial<EstadoInterfaz>);
  } catch {
    return {};
  }
}

function guardar(estado: EstadoInterfaz): void {
  try {
    const { tema, densidad, entidadActivaId, ejercicioActivoId } = estado;
    window.localStorage.setItem(CLAVE, JSON.stringify({ tema, densidad, entidadActivaId, ejercicioActivoId }));
  } catch {
    // Sin almacenamiento local no pasa nada: son preferencias de comodidad.
  }
}

export const useEstadoInterfaz = create<EstadoInterfaz>((set, get) => {
  const guardado = leerGuardado();
  const actualizar = (parcial: Partial<EstadoInterfaz>): void => {
    set(parcial);
    guardar(get());
  };
  return {
    tema: guardado.tema ?? 'sistema',
    densidad: guardado.densidad ?? 'comoda',
    entidadActivaId: guardado.entidadActivaId ?? null,
    ejercicioActivoId: guardado.ejercicioActivoId ?? null,
    fijarTema: (tema) => actualizar({ tema }),
    fijarDensidad: (densidad) => actualizar({ densidad }),
    fijarEntidadActiva: (entidadActivaId) => actualizar({ entidadActivaId, ejercicioActivoId: null }),
    fijarEjercicioActivo: (ejercicioActivoId) => actualizar({ ejercicioActivoId }),
  };
});

/** Aplica tema y densidad al documento (atributos que leen los tokens CSS). */
export function aplicarApariencia(tema: Tema, densidad: Densidad): void {
  const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && prefiereOscuro);
  document.documentElement.dataset['tema'] = oscuro ? 'oscuro' : 'claro';
  document.documentElement.dataset['densidad'] = densidad;
}
