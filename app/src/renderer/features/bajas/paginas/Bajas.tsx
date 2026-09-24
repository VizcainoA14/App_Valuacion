/**
 * Las bajas (ADR-028, ADR-029). Arriba, lo que el cálculo del proceso señaló y por qué;
 * abajo, las bajas que el hospital ya decidió y registró.
 *
 * La aplicación no aprueba ni tramita nada: el comité, la resolución y la
 * disposición final ocurren fuera de ella. Aquí se anota la baja —con una
 * justificación individual (RN-09-06) y, si se quiere, el número del documento
 * que la aprobó— para que el bien salga de los cálculos siguientes.
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Search, Undo2 } from 'lucide-react';
import type { BajaDto, CandidatoBajaDto } from '@compartido/dtos/bajas';
import type { CausalBaja } from '@compartido/enums/catalogos';
import { CAUSAL_BAJA, SEMAFORO } from '@compartido/enums/catalogos';
import { cliente, useCanal, useMutacion } from '../../../ipc/consultas';
import { AreaTexto, Aviso, Boton, Campo, Cargando, Casilla, Encabezado, EstadoVacio, Insignia, Seccion, Selector, TablaSimple } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearDinero, formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { useSoloLectura } from '../../configuracion/hooks';
import { useProcesoRuta } from '../../inventario/hooks';

const CANALES_BAJA = ['informe:previsualizar', 'baja:candidatos', 'baja:listar', 'bien:listar', 'bien:porId', 'bien:cobertura', 'calculo:resumen'] as const;

/** Lo mínimo para registrar la baja de un bien, sea candidato o no. */
interface BienParaBaja {
  readonly bienId: string;
  readonly codigoInstitucional: string;
  readonly descripcionFuncional: string;
  readonly causalSugerida: CausalBaja;
}

export function Bajas(): JSX.Element {
  const procesoId = useProcesoRuta();
  const corte = useCanal('corte:actual', { procesoId });
  const soloLectura = useSoloLectura(procesoId);
  const [registrando, setRegistrando] = useState<BienParaBaja | null>(null);
  const [buscando, setBuscando] = useState(false);

  if (corte.isPending) return <Cargando />;
  const corteId = corte.data?.id ?? null;

  return (
    <>
      <Encabezado
        titulo="Bajas"
        subtitulo="El cálculo señala candidatos con su motivo; la decisión es del hospital, por su propio trámite. Aquí se registra lo decidido."
        acciones={
          !soloLectura && (
            <Boton icono={<Search className="h-4 w-4" aria-hidden />} onClick={() => setBuscando(true)}>
              Registrar la baja de otro bien
            </Boton>
          )
        }
      />
      <div className="flex flex-col gap-5">
        <Seccion
          titulo="Candidatos a baja"
          descripcion="Bienes que superaron su vida útil, que están en mal estado pasado el umbral de alerta, o con obsolescencia funcional declarada (ANEXO_C §2.7)."
        >
          {corteId === null ? (
            <EstadoVacio
              titulo="Todavía no se ha calculado nada"
              descripcion="Los candidatos salen de un cálculo. Haga uno y vuelva."
              accion={
                <Link className="underline" to={`/proceso/${procesoId}/calculo`}>
                  Ir a calcular
                </Link>
              }
            />
          ) : (
            <Candidatos corteId={corteId} soloLectura={soloLectura} onRegistrar={(c) => setRegistrando(c)} />
          )}
        </Seccion>

        <Registradas procesoId={procesoId} soloLectura={soloLectura} />
      </div>

      {registrando !== null && <DialogoRegistrar bien={registrando} onCerrar={() => setRegistrando(null)} />}
      {buscando && (
        <DialogoBuscar
          procesoId={procesoId}
          onElegir={(b) => {
            setBuscando(false);
            setRegistrando(b);
          }}
          onCerrar={() => setBuscando(false)}
        />
      )}
    </>
  );
}

function Candidatos({ corteId, soloLectura, onRegistrar }: { corteId: string; soloLectura: boolean; onRegistrar: (c: BienParaBaja) => void }): JSX.Element {
  const candidatos = useCanal('baja:candidatos', { corteId });
  if (candidatos.isPending) return <Cargando />;
  if (candidatos.data === undefined) return <Aviso tono="peligro">No se pudieron leer los candidatos.</Aviso>;
  if (candidatos.data.length === 0) return <p className="text-texto-secundario">En el cálculo ningún bien pendiente es candidato a baja.</p>;

  return (
    <TablaSimple
      columnas={[
        { clave: 'cod', titulo: 'Código', celda: (c: CandidatoBajaDto) => <span className="font-mono">{c.codigoInstitucional}</span> },
        { clave: 'desc', titulo: 'Bien', celda: (c) => c.descripcionFuncional },
        { clave: 'estado', titulo: 'Estado físico', celda: (c) => c.estadoActual },
        {
          clave: 'sem',
          titulo: 'Semáforo',
          celda: (c) => (c.semaforo === null ? '—' : <Insignia tono={c.semaforo === 'ROJO' ? 'peligro' : c.semaforo === 'VERDE' ? 'exito' : 'aviso'}>{SEMAFORO.etiqueta(c.semaforo)}</Insignia>),
          ancho: '110px',
        },
        { clave: 'ind', titulo: 'Índice', celda: (c) => (c.indiceObsolescencia === null ? '—' : <span className="font-mono">{c.indiceObsolescencia.toFixed(4)}</span>), alineacion: 'derecha' },
        { clave: 'neto', titulo: 'Valor neto', celda: (c) => <span className="font-mono">{formatearDinero(c.valorNetoLibros)}</span>, alineacion: 'derecha' },
        {
          clave: 'motivos',
          titulo: 'Por qué es candidato',
          celda: (c) => (
            <ul className="list-disc pl-4 text-sm text-texto-secundario">
              {c.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ),
        },
        {
          clave: 'accion',
          titulo: '',
          celda: (c) =>
            soloLectura ? null : (
              <Boton icono={<ClipboardList className="h-4 w-4" aria-hidden />} onClick={() => onRegistrar(c)}>
                Registrar baja
              </Boton>
            ),
          ancho: '170px',
        },
      ]}
      filas={candidatos.data}
      claveFila={(c) => c.bienId}
      vacio={null}
    />
  );
}

function Registradas({ procesoId, soloLectura }: { procesoId: string; soloLectura: boolean }): JSX.Element {
  const [conAnuladas, setConAnuladas] = useState(false);
  const bajas = useCanal('baja:listar', { procesoId, incluirAnuladas: conAnuladas });
  const [anulando, setAnulando] = useState<BajaDto | null>(null);

  return (
    <Seccion
      titulo="Bajas registradas"
      descripcion="Estos bienes no entran al cálculo: recalcule después de registrar. Una baja registrada por error se anula (con motivo): no se borra."
      acciones={<Casilla etiqueta="Mostrar anuladas" checked={conAnuladas} onChange={(e) => setConAnuladas(e.target.checked)} />}
    >
      {bajas.isPending ? (
        <Cargando />
      ) : (
        <TablaSimple
          columnas={[
            { clave: 'cod', titulo: 'Código', celda: (b: BajaDto) => <span className="font-mono">{b.codigoInstitucional}</span> },
            { clave: 'desc', titulo: 'Bien', celda: (b) => b.descripcionFuncional },
            { clave: 'fecha', titulo: 'Fecha', celda: (b) => formatearFecha(b.fecha) },
            { clave: 'causal', titulo: 'Causal', celda: (b) => CAUSAL_BAJA.etiqueta(b.causal) },
            { clave: 'just', titulo: 'Justificación', celda: (b) => <span className="text-sm">{b.justificacion}</span> },
            { clave: 'ref', titulo: 'Documento', celda: (b) => b.referencia ?? '—' },
            {
              clave: 'estado',
              titulo: '',
              ancho: '150px',
              celda: (b) =>
                b.anuladaEn !== null ? (
                  <span title={b.motivoAnulacion ?? ''}>
                    <Insignia tono="neutro">Anulada {formatearMarcaTiempo(b.anuladaEn)}</Insignia>
                  </span>
                ) : soloLectura ? null : (
                  <Boton variante="sutil" icono={<Undo2 className="h-4 w-4" aria-hidden />} onClick={() => setAnulando(b)}>
                    Anular
                  </Boton>
                ),
            },
          ]}
          filas={bajas.data ?? []}
          claveFila={(b) => b.id}
          vacio={<p className="text-texto-secundario">No hay bajas registradas.</p>}
        />
      )}
      {anulando !== null && <DialogoAnular baja={anulando} onCerrar={() => setAnulando(null)} />}
    </Seccion>
  );
}

function DialogoRegistrar({ bien, onCerrar }: { bien: BienParaBaja; onCerrar: () => void }): JSX.Element {
  const [causal, setCausal] = useState<CausalBaja>(bien.causalSugerida);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [justificacion, setJustificacion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const registrar = useMutacion('baja:registrar', [...CANALES_BAJA], { onSuccess: onCerrar, onError: (e: Error) => setError(e.message) });

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`Registrar la baja de ${bien.codigoInstitucional}`}
      descripcion={bien.descripcionFuncional}
      ancho="lg"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton
            variante="primario"
            cargando={registrar.isPending}
            disabled={justificacion.trim().length < 20 || fecha === ''}
            onClick={() => registrar.mutate({ bienId: bien.bienId, fecha, causal, justificacion, referencia: referencia.trim() === '' ? null : referencia.trim() })}
          >
            Registrar baja
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            etiqueta="Causal"
            obligatorio
            ayuda="La app sugiere una según el estado y el índice; la decisión es del hospital."
            value={causal}
            opciones={CAUSAL_BAJA.valores.map((c) => ({ valor: c, etiqueta: CAUSAL_BAJA.etiqueta(c) }))}
            onChange={(e) => setCausal(e.target.value as CausalBaja)}
          />
          <Campo etiqueta="Fecha de la baja" type="date" obligatorio value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <AreaTexto
          etiqueta="Justificación"
          obligatorio
          ayuda={`Individual y específica de este bien (RN-09-06). "Obsoleto" o "dañado" no sirven. Van ${justificacion.trim().length} de 20 caracteres mínimos.`}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición."
        />
        <Campo
          etiqueta="Documento que la aprobó"
          ayuda="Opcional: número del acta o de la resolución, para encontrarla después."
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          placeholder="Resolución 045 de 2026"
        />
      </div>
    </Dialogo>
  );
}

function DialogoAnular({ baja, onCerrar }: { baja: BajaDto; onCerrar: () => void }): JSX.Element {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const anular = useMutacion('baja:anular', [...CANALES_BAJA], { onSuccess: onCerrar, onError: (e: Error) => setError(e.message) });
  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`Anular la baja de ${baja.codigoInstitucional}`}
      descripcion="El bien vuelve a quedar activo y entra en los cálculos siguientes. La baja anulada queda en el historial."
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="peligro" cargando={anular.isPending} disabled={motivo.trim().length < 5} onClick={() => anular.mutate({ id: baja.id, motivo })}>
            Anular baja
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}
        <AreaTexto etiqueta="Motivo" obligatorio ayuda="Queda en la bitácora." value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Se registró sobre el bien equivocado." />
      </div>
    </Dialogo>
  );
}

/** Para dar de baja un bien que el cálculo no señaló: uno hurtado, uno donado, uno destruido. */
function DialogoBuscar({ procesoId, onElegir, onCerrar }: { procesoId: string; onElegir: (b: BienParaBaja) => void; onCerrar: () => void }): JSX.Element {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<readonly { id: string; codigoInstitucional: string; descripcionFuncional: string; estadoActual: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar(): Promise<void> {
    setError(null);
    try {
      const p = await cliente().invocar('bien:listar', { procesoId, filtros: { texto: texto.trim() }, pagina: 0, tamano: 10 });
      setResultados(p.filas.filter((f) => f.estadoRegistro !== 'DADO_DE_BAJA'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo="Registrar la baja de otro bien"
      descripcion="Busque el bien por código, placa o descripción."
      ancho="lg"
    >
      <div className="flex flex-col gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void buscar();
          }}
        >
          <div className="flex-1">
            <Campo etiqueta="Buscar" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Código, placa o descripción" />
          </div>
          <Boton type="submit" icono={<Search className="h-4 w-4" aria-hidden />} disabled={texto.trim() === ''}>
            Buscar
          </Boton>
        </form>
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}
        {resultados !== null && (
          <TablaSimple
            columnas={[
              { clave: 'cod', titulo: 'Código', celda: (b) => <span className="font-mono">{b.codigoInstitucional}</span> },
              { clave: 'desc', titulo: 'Bien', celda: (b) => b.descripcionFuncional },
              {
                clave: 'acc',
                titulo: '',
                ancho: '120px',
                celda: (b) => (
                  <Boton onClick={() => onElegir({ bienId: b.id, codigoInstitucional: b.codigoInstitucional, descripcionFuncional: b.descripcionFuncional, causalSugerida: b.estadoActual === 'INSERVIBLE' || b.estadoActual === 'MALO' ? 'INSERVIBLE' : 'DESUSO' })}>
                    Elegir
                  </Boton>
                ),
              },
            ]}
            filas={resultados}
            claveFila={(b) => b.id}
            vacio={<p className="text-texto-secundario">Ningún bien vigente coincide.</p>}
          />
        )}
      </div>
    </Dialogo>
  );
}
