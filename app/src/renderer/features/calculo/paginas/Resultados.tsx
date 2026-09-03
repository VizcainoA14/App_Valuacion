/**
 * El resultado bien por bien. Se entra desde el semáforo de la pantalla de
 * cálculo, así que el filtro llega por la URL: un enlace compartido o un
 * "atrás" deben mostrar exactamente lo mismo.
 */
import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router';
import type { FilaCalculoDto } from '@compartido/dtos/calculo';
import type { Semaforo } from '@compartido/enums/catalogos';
import { SEMAFORO } from '@compartido/enums/catalogos';
import { useCanal } from '../../../ipc/consultas';
import { Aviso, Campo, Cargando, Casilla, Insignia, Selector, TablaSimple } from '../../../componentes/ui';
import { formatearDecimal, formatearDinero, formatearEntero, formatearFecha } from '../../../formato';
import { useContextoEjercicio } from '../../inventario/hooks';

const TONO: Record<Semaforo, 'exito' | 'aviso' | 'peligro'> = { VERDE: 'exito', AMARILLO: 'aviso', NARANJA: 'aviso', ROJO: 'peligro' };
const TAMANO = 100;

export function Resultados(): JSX.Element {
  const { ejercicioId } = useContextoEjercicio();
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(0);

  const semaforoUrl = params.get('semaforo');
  const semaforo = semaforoUrl !== null && SEMAFORO.es(semaforoUrl) ? semaforoUrl : undefined;
  const soloCandidatos = params.get('candidatos') === '1';

  const consulta = useCanal('calculo:listar', {
    ejercicioId,
    ...(semaforo !== undefined ? { semaforo } : {}),
    soloCandidatosBaja: soloCandidatos,
    texto: texto.trim() === '' ? null : texto.trim(),
    pagina,
    tamano: TAMANO,
  });

  function cambiarFiltro(clave: string, valor: string | null): void {
    const siguiente = new URLSearchParams(params);
    if (valor === null) siguiente.delete(clave);
    else siguiente.set(clave, valor);
    setParams(siguiente);
    setPagina(0);
  }

  if (consulta.isPending) return <Cargando />;
  if (consulta.data === undefined) return <Aviso tono="peligro">No se pudo leer el resultado del cálculo.</Aviso>;

  const { filas, total } = consulta.data;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Buscar" placeholder="Código o descripción" value={texto} onChange={(ev) => setTexto(ev.target.value)} />
        <Selector
          etiqueta="Semáforo"
          value={semaforo ?? ''}
          vacio="Todos"
          opciones={SEMAFORO.valores.map((s) => ({ valor: s, etiqueta: SEMAFORO.etiqueta(s) }))}
          onChange={(ev) => cambiarFiltro('semaforo', ev.target.value === '' ? null : ev.target.value)}
        />
        <Casilla etiqueta="Solo candidatos a baja" checked={soloCandidatos} onChange={(ev) => cambiarFiltro('candidatos', ev.target.checked ? '1' : null)} />
        <p className="ml-auto text-texto-secundario">{formatearEntero(total)} bienes</p>
      </div>

      <TablaSimple
        columnas={[
          { clave: 'cod', titulo: 'Código', celda: (f: FilaCalculoDto) => <span className="font-mono">{f.codigoInstitucional}</span> },
          { clave: 'desc', titulo: 'Descripción', celda: (f) => f.descripcionFuncional },
          { clave: 'adq', titulo: 'Adquisición', celda: (f) => formatearFecha(f.fechaAdquisicion) },
          { clave: 'edad', titulo: 'Edad (años)', celda: (f) => formatearDecimal(f.edadActualAnios), alineacion: 'derecha' },
          {
            clave: 'ind',
            titulo: 'Índice',
            celda: (f) =>
              f.indiceObsolescencia === null ? (
                <span className="text-texto-secundario">sin calcular</span>
              ) : (
                <span className="font-mono">{f.indiceObsolescencia.toFixed(4)}</span>
              ),
            alineacion: 'derecha',
          },
          { clave: 'sem', titulo: 'Semáforo', celda: (f) => (f.semaforo === null ? '—' : <Insignia tono={TONO[f.semaforo]}>{SEMAFORO.etiqueta(f.semaforo)}</Insignia>), ancho: '110px' },
          { clave: 'costo', titulo: 'Saldo ajustado', celda: (f) => <span className="font-mono">{formatearDinero(f.saldoFinalAjustado)}</span>, alineacion: 'derecha' },
          { clave: 'dep', titulo: 'Depreciación acumulada', celda: (f) => <span className="font-mono">{formatearDinero(f.depreciacionAcumulada)}</span>, alineacion: 'derecha' },
          { clave: 'neto', titulo: 'Valor neto', celda: (f) => <span className="font-mono">{formatearDinero(f.valorNetoLibros)}</span>, alineacion: 'derecha' },
          {
            clave: 'baja',
            titulo: 'Baja',
            celda: (f) => (f.candidatoBaja ? <Insignia tono="aviso">Candidato</Insignia> : f.obsolescenciaFuncional ? <Insignia tono="info">Funcional</Insignia> : ''),
            ancho: '110px',
          },
        ]}
        filas={filas}
        claveFila={(f) => f.bienId}
        vacio={<p className="text-texto-secundario">Ningún bien coincide con el filtro. Si aún no ha calculado, hágalo en la pestaña anterior.</p>}
      />

      {paginas > 1 && (
        <nav className="flex items-center justify-center gap-3 text-texto-secundario" aria-label="Paginación">
          <button type="button" className="underline disabled:opacity-40" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina + 1} de {paginas}
          </span>
          <button type="button" className="underline disabled:opacity-40" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
