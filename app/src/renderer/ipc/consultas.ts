/**
 * TanStack Query sobre IPC (plan 2.5 §2): cada canal de lectura es una clave de
 * caché y cada escritura declara qué invalida. Las claves viven aquí, no
 * dispersas por los componentes.
 */
import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
import type { Canal, EntradaDe, SalidaDe } from '@compartido/ipc/contrato';
import { crearCliente, type ClienteIpc } from './cliente';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: false, // un fallo de IPC es un error de lógica o de datos; reintentar lo oculta
    },
  },
});

let clienteSingleton: ClienteIpc | null = null;
export function cliente(): ClienteIpc {
  clienteSingleton ??= crearCliente(window.api);
  return clienteSingleton;
}

/** Clave de caché = canal + entrada. */
export function claveDe<C extends Canal>(canal: C, entrada?: EntradaDe<C>): readonly unknown[] {
  return entrada === undefined ? [canal] : [canal, entrada];
}

/** Lectura tipada por canal. */
export function useCanal<C extends Canal>(
  canal: C,
  entrada?: EntradaDe<C>,
  opciones: Omit<UseQueryOptions<SalidaDe<C>, Error, SalidaDe<C>, readonly unknown[]>, 'queryKey' | 'queryFn'> = {},
) {
  return useQuery<SalidaDe<C>, Error, SalidaDe<C>, readonly unknown[]>({
    queryKey: claveDe(canal, entrada),
    queryFn: () => cliente().invocar(canal, entrada),
    ...opciones,
  });
}

/** Escritura tipada por canal; `invalida` son los prefijos de canal cuya caché caduca. */
export function useMutacion<C extends Canal>(
  canal: C,
  invalida: readonly Canal[] = [],
  opciones: Omit<UseMutationOptions<SalidaDe<C>, Error, EntradaDe<C>>, 'mutationFn'> = {},
) {
  const qc = useQueryClient();
  return useMutation<SalidaDe<C>, Error, EntradaDe<C>>({
    mutationFn: (entrada) => cliente().invocar(canal, entrada),
    ...opciones,
    onSuccess: async (datos, variables, contexto, mut) => {
      await Promise.all(invalida.map((prefijo) => qc.invalidateQueries({ queryKey: [prefijo] })));
      await opciones.onSuccess?.(datos, variables, contexto, mut);
    },
  });
}

/**
 * Listado paginado que el renderer consume como scroll infinito: el filtro y el
 * orden viven en el main y aquí solo se acumulan las páginas ya traídas (TR-10).
 */
export function useListadoInfinito<C extends Canal>(
  canal: C,
  entrada: Omit<EntradaDe<C> & { pagina?: number }, 'pagina'>,
  tamano: number,
  habilitado = true,
) {
  return useInfiniteQuery({
    queryKey: [canal, entrada, tamano],
    enabled: habilitado,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => cliente().invocar(canal, { ...entrada, pagina: pageParam } as EntradaDe<C>),
    getNextPageParam: (ultima: unknown, paginas: unknown[]) => {
      const p = ultima as { total: number; filas: readonly unknown[] };
      const traidas = paginas.reduce<number>((n, x) => n + (x as { filas: readonly unknown[] }).filas.length, 0);
      return traidas < p.total ? paginas.length : undefined;
    },
  });
}

/** Cualquier cambio de configuración caduca la revisión de la configuración. */
export const EFECTOS_CONFIGURACION: readonly Canal[] = ['validaciones:evaluar'];

/** Lo que cambia cuando cambia el inventario: el listado, sus cifras y lo que se calcula sobre él. */
export const EFECTOS_INVENTARIO: readonly Canal[] = ['bien:listar', 'bien:porId', 'bien:cobertura', 'bien:idsDelFiltro', 'barrido:listar', 'calculo:resumen', 'baja:candidatos', 'baja:listar'];
