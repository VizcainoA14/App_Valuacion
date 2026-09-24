/**
 * Listado de bienes del inventario vivo. Filtros por sede, servicio, clase
 * y estado; búsqueda por código, placa o serie. Todo se resuelve en el main
 * (TR-10): el renderer solo pide páginas y las acumula.
 */
import { useMemo, useState, type JSX } from 'react';
import { Search, X } from 'lucide-react';
import type { FiltrosBien } from '@compartido/dtos/inventario';
import { ESTADO_ACTUAL, CONDICION_TENENCIA } from '@compartido/enums/catalogos';
import { ESTADO_BIEN } from '@compartido/enums/estados';
import { cliente, useCanal, useListadoInfinito } from '../../../ipc/consultas';
import { TablaDatos, type OrdenTabla } from '../../../componentes/TablaDatos/TablaDatos';
import { Boton, Campo, Encabezado, Selector, Aviso } from '../../../componentes/ui';
import { COLUMNAS_BIEN } from '../columnas';
import { useProcesoRuta } from '../hooks';

const TAMANO_PAGINA = 200;

export function ListadoBienes(): JSX.Element {
  const procesoId = useProcesoRuta();
  const [texto, setTexto] = useState('');
  const [textoAplicado, setTextoAplicado] = useState('');
  const [filtros, setFiltros] = useState<FiltrosBien>({});
  const [orden, setOrden] = useState<OrdenTabla>({ columna: 'codigoInstitucional', ascendente: true });
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(new Set());

  const sedes = useCanal('sede:listar', { procesoId });
  const servicios = useCanal('servicio:listar', { procesoId });
  const clases = useCanal('clase:listar', { procesoId });

  const filtrosCompletos = useMemo<FiltrosBien>(() => ({ ...filtros, texto: textoAplicado === '' ? undefined : textoAplicado }), [filtros, textoAplicado]);
  const hayFiltros = Object.values(filtrosCompletos).some((v) => v !== undefined && v !== '');

  const consulta = useListadoInfinito('bien:listar', { procesoId, filtros: filtrosCompletos, orden: { columna: orden.columna as never, ascendente: orden.ascendente }, tamano: TAMANO_PAGINA }, TAMANO_PAGINA);
  const paginas = consulta.data?.pages ?? [];
  const filas = useMemo(() => paginas.flatMap((p) => p.filas), [paginas]);
  const total = paginas[0]?.total ?? 0;

  const cambiar = (clave: keyof FiltrosBien, valor: string): void => setFiltros((f) => ({ ...f, [clave]: valor === '' ? undefined : valor }));
  const limpiar = (): void => {
    setFiltros({});
    setTexto('');
    setTextoAplicado('');
  };

  return (
    <>
      <Encabezado
        titulo="Bienes del inventario"
        subtitulo="Lo que existe físicamente, según el último barrido de cada servicio. El inventario entra por importación de PL-03 (ADR-015)."
      />
      <div className="flex flex-col gap-4">
        <form
          role="search"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-borde bg-elevada px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTextoAplicado(texto.trim());
          }}
        >
          <div className="w-72">
            <Campo etiqueta="Buscar" placeholder="Código, placa, descripción, marca o serie" value={texto} onChange={(e) => setTexto(e.target.value)} ayuda="Enter para buscar" />
          </div>
          <Boton type="submit" icono={<Search className="h-4 w-4" aria-hidden />}>
            Buscar
          </Boton>
          <div className="w-44">
            <Selector etiqueta="Sede" vacio="Todas" value={filtros.sedeId ?? ''} onChange={(e) => cambiar('sedeId', e.target.value)} opciones={(sedes.data ?? []).map((s) => ({ valor: s.id, etiqueta: `${s.codigo} · ${s.nombre}` }))} />
          </div>
          <div className="w-52">
            <Selector etiqueta="Servicio" vacio="Todos" value={filtros.servicioId ?? ''} onChange={(e) => cambiar('servicioId', e.target.value)} opciones={(servicios.data ?? []).filter((s) => filtros.sedeId === undefined || s.sedeId === filtros.sedeId).map((s) => ({ valor: s.id, etiqueta: `${s.codigo} · ${s.nombre}` }))} />
          </div>
          <div className="w-44">
            <Selector etiqueta="Clase" vacio="Todas" value={filtros.claseActivoId ?? ''} onChange={(e) => cambiar('claseActivoId', e.target.value)} opciones={(clases.data ?? []).map((c) => ({ valor: c.id, etiqueta: `${c.codigo} · ${c.nombre}` }))} />
          </div>
          <div className="w-40">
            <Selector etiqueta="Estado" vacio="Todos" value={filtros.estadoActual ?? ''} onChange={(e) => cambiar('estadoActual', e.target.value)} opciones={ESTADO_ACTUAL.valores.map((v) => ({ valor: v, etiqueta: ESTADO_ACTUAL.etiqueta(v) }))} />
          </div>
          <div className="w-40">
            <Selector etiqueta="Tenencia" vacio="Todas" value={filtros.condicionTenencia ?? ''} onChange={(e) => cambiar('condicionTenencia', e.target.value)} opciones={CONDICION_TENENCIA.valores.map((v) => ({ valor: v, etiqueta: CONDICION_TENENCIA.etiqueta(v) }))} />
          </div>
          <div className="w-44">
            <Selector etiqueta="En el inventario" vacio="Todos" value={filtros.estadoRegistro ?? ''} onChange={(e) => cambiar('estadoRegistro', e.target.value)} opciones={ESTADO_BIEN.valores.map((v) => ({ valor: v, etiqueta: ESTADO_BIEN.etiqueta(v) }))} />
          </div>
          {hayFiltros && (
            <Boton variante="sutil" icono={<X className="h-4 w-4" aria-hidden />} onClick={limpiar}>
              Limpiar filtros
            </Boton>
          )}
        </form>

        {seleccion.size > 0 && (
          <Aviso tono="info">
            {seleccion.size} bien(es) seleccionados.
          </Aviso>
        )}

        <TablaDatos
          id="bienes"
          columnas={COLUMNAS_BIEN}
          filas={filas}
          claveFila={(b) => b.id}
          total={total}
          cargando={consulta.isPending}
          cargandoMas={consulta.isFetchingNextPage}
          error={consulta.error?.message ?? null}
          hayFiltrosActivos={hayFiltros}
          orden={orden}
          onOrden={setOrden}
          onCargarMas={() => void consulta.fetchNextPage()}
          seleccion={{
            ids: seleccion,
            onCambio: setSeleccion,
            onSeleccionarTodoElFiltro: async () => {
              const ids = await cliente().invocar('bien:idsDelFiltro', { procesoId, filtros: filtrosCompletos });
              setSeleccion(new Set(ids));
            },
          }}
        />
      </div>
    </>
  );
}
