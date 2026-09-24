/**
 * El resultado bien por bien del cálculo. El filtro del semáforo llega por la
 * URL: un enlace compartido o un "atrás" deben mostrar exactamente lo mismo.
 */
import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router';
import type { FilaCalculoDto } from '@compartido/dtos/calculo';
import type { Semaforo } from '@compartido/enums/catalogos';
import { SEMAFORO } from '@compartido/enums/catalogos';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { AreaTexto, Aviso, Boton, Campo, Cargando, Casilla, Insignia, Selector, TablaSimple } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearDecimal, formatearDinero, formatearEntero, formatearFecha } from '../../../formato';

const TONO: Record<Semaforo, 'exito' | 'aviso' | 'peligro'> = { VERDE: 'exito', AMARILLO: 'aviso', NARANJA: 'aviso', ROJO: 'peligro' };
const TAMANO = 100;

export function Resultados({ corteId, soloLectura }: { corteId: string; soloLectura: boolean }): JSX.Element {
  const [params, setParams] = useSearchParams();
  const [funcional, setFuncional] = useState<FilaCalculoDto | null>(null);
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(0);

  const semaforoUrl = params.get('semaforo');
  const semaforo = semaforoUrl !== null && SEMAFORO.es(semaforoUrl) ? semaforoUrl : undefined;
  const soloCandidatos = params.get('candidatos') === '1';

  const consulta = useCanal('calculo:listar', {
    corteId,
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
          {
            clave: 'acc',
            titulo: '',
            celda: (f) =>
              soloLectura ? null : (
              <Boton variante="sutil" onClick={() => setFuncional(f)}>
                Obsolescencia funcional
              </Boton>
            ),
            ancho: '200px',
          },
        ]}
        filas={filas}
        claveFila={(f) => f.bienId}
        vacio={<p className="text-texto-secundario">Ningún bien coincide con el filtro.</p>}
      />
      {funcional !== null && <DialogoFuncional fila={funcional} onCerrar={() => setFuncional(null)} />}

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

/**
 * RN-05-03 — la obsolescencia funcional la declara una persona (el ingeniero
 * biomédico, el de sistemas): el equipo funciona pero ya no sirve para lo que se
 * le pide. Se guarda en el bien y pesa desde el próximo cálculo; el actual no
 * cambia, porque dice lo que se sabía el día que se calculó.
 */
function DialogoFuncional({ fila, onCerrar }: { fila: FilaCalculoDto; onCerrar: () => void }): JSX.Element {
  const bien = useCanal('bien:porId', { id: fila.bienId });
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const marcar = useMutacion('bien:marcarObsolescenciaFuncional', ['bien:porId', 'bien:listar'], { onSuccess: onCerrar, onError: (e: Error) => setError(e.message) });
  const actual = bien.data?.obsolescenciaFuncional === true;

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`Obsolescencia funcional de ${fila.codigoInstitucional}`}
      descripcion={fila.descripcionFuncional}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" cargando={marcar.isPending} disabled={justificacion.trim().length < 10} onClick={() => marcar.mutate({ bienId: fila.bienId, funcional: !actual, justificacion })}>
            {actual ? 'Retirar la declaración' : 'Declarar obsoleto funcionalmente'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}
        {actual && bien.data?.justificacionFuncional !== null && (
          <Aviso tono="info" titulo="Ya está declarada">
            {bien.data?.justificacionFuncional}
          </Aviso>
        )}
        <p className="text-texto-secundario">Se aplica cuando vuelva a calcular. El cálculo actual no cambia hasta entonces.</p>
        <AreaTexto
          etiqueta="Justificación"
          obligatorio
          ayuda="Quién lo dictaminó y por qué ya no sirve para su función. Queda en la bitácora."
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="El software del equipo ya no es compatible con el sistema de información del hospital."
        />
      </div>
    </Dialogo>
  );
}
