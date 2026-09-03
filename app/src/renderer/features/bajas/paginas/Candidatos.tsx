/**
 * ADR-026 etapa 5 — la bandeja de candidatos. El motor los señaló; aquí un
 * especialista mira cada uno, escribe por qué se da de baja y lo propone.
 *
 * La app no da de baja nada: registra una propuesta que el Comité decide
 * (RN-09-04). Por eso el botón dice "Proponer baja" y no "Dar de baja".
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Lock } from 'lucide-react';
import type { CandidatoBajaDto } from '@compartido/dtos/bajas';
import type { CausalBaja, DestinoFinal } from '@compartido/enums/catalogos';
import { CAUSAL_BAJA, DESTINO_FINAL, SEMAFORO } from '@compartido/enums/catalogos';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { Aviso, AreaTexto, Boton, Campo, Cargando, EstadoVacio, Insignia, Selector, TablaSimple } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearDinero, formatearEntero } from '../../../formato';
import { useContextoEjercicio } from '../../inventario/hooks';

const CANALES_BAJA = ['baja:candidatos', 'baja:listar', 'baja:resumen', 'bien:listar', 'validaciones:evaluar'] as const;

export function Candidatos(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const candidatos = useCanal('baja:candidatos', { ejercicioId });
  const responsables = useCanal('responsable:listar', { entidadId, incluirInactivos: false });
  const [enFormulario, setEnFormulario] = useState<CandidatoBajaDto | null>(null);

  const activar = useMutacion('bien:activarValidados', [...CANALES_BAJA]);

  if (candidatos.isPending || responsables.isPending) return <Cargando />;
  if (candidatos.data === undefined) return <Aviso tono="peligro">No se pudo leer la bandeja de candidatos.</Aviso>;

  const lista = candidatos.data;
  const sinActivar = lista.filter((c) => c.estadoRegistro !== 'ACTIVO').length;

  return (
    <div className="flex flex-col gap-4">
      {sinActivar > 0 && (
        <Aviso tono="aviso" titulo="Cierre el inventario antes de proponer bajas">
          <p className="mb-2">
            {formatearEntero(sinActivar)} de estos bienes están todavía como <strong>validados</strong>. Solo se propone la baja de un bien que ya forma parte del inventario activo
            (ANEXO_B §6.2).
          </p>
          <Boton icono={<Lock className="h-4 w-4" aria-hidden />} cargando={activar.isPending} onClick={() => activar.mutate({ ejercicioId })}>
            Dar por cerrado el inventario y activar los bienes validados
          </Boton>
        </Aviso>
      )}

      {lista.length === 0 ? (
        <EstadoVacio
          titulo="Ningún bien es candidato a baja"
          descripcion="La bandeja se llena con lo que señala el cálculo: bienes que superaron su vida útil, o que están en mal estado pasado el umbral de alerta. Si aún no ha calculado, hágalo en la etapa anterior."
          accion={
            <Link className="underline" to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/05`}>
              Ir al cálculo
            </Link>
          }
        />
      ) : (
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
              celda: (c) => (
                <Boton icono={<ClipboardList className="h-4 w-4" aria-hidden />} disabled={c.estadoRegistro !== 'ACTIVO'} onClick={() => setEnFormulario(c)}>
                  Proponer baja
                </Boton>
              ),
              ancho: '170px',
            },
          ]}
          filas={lista}
          claveFila={(c) => c.bienId}
          vacio={null}
        />
      )}

      {enFormulario !== null && (
        <FormularioPropuesta
          candidato={enFormulario}
          ejercicioId={ejercicioId}
          especialistas={(responsables.data ?? []).map((r) => ({ valor: r.id, etiqueta: `${r.nombreCompleto} — ${r.cargo}` }))}
          onCerrar={() => setEnFormulario(null)}
        />
      )}
    </div>
  );
}

function FormularioPropuesta({
  candidato,
  ejercicioId,
  especialistas,
  onCerrar,
}: {
  candidato: CandidatoBajaDto;
  ejercicioId: string;
  especialistas: readonly { valor: string; etiqueta: string }[];
  onCerrar: () => void;
}): JSX.Element {
  const [causal, setCausal] = useState<CausalBaja>(candidato.causalSugerida);
  const [justificacion, setJustificacion] = useState('');
  const [costoReparacion, setCostoReparacion] = useState('');
  const [valorReposicion, setValorReposicion] = useState('');
  const [valorSalvamento, setValorSalvamento] = useState('');
  const [destino, setDestino] = useState<DestinoFinal | ''>('');
  const [especialistaId, setEspecialistaId] = useState(especialistas[0]?.valor ?? '');
  const [error, setError] = useState<string | null>(null);

  const proponer = useMutacion('baja:proponer', [...CANALES_BAJA], {
    onSuccess: onCerrar,
    onError: (e: Error) => setError(e.message),
  });

  /** Los pesos se convierten a centavos aquí, en la única frontera del renderer. */
  const aCentavos = (v: string): number | null => {
    const limpio = v.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    if (limpio.trim() === '') return null;
    const n = Number(limpio);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };

  function enviar(): void {
    setError(null);
    proponer.mutate({
      ejercicioId,
      bienId: candidato.bienId,
      causal,
      justificacionTecnica: justificacion,
      costoReparacionEstimado: aCentavos(costoReparacion),
      valorReposicion: aCentavos(valorReposicion),
      valorSalvamento: aCentavos(valorSalvamento),
      destinoFinalPropuesto: destino === '' ? null : destino,
      especialistaId,
      fechaPropuesta: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`Proponer la baja de ${candidato.codigoInstitucional}`}
      descripcion={candidato.descripcionFuncional}
      ancho="lg"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" cargando={proponer.isPending} disabled={justificacion.trim().length < 20 || especialistaId === ''} onClick={enviar}>
            Proponer al Comité
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}

        <Aviso tono="info" titulo="Esto no da de baja el bien">
          Crea una propuesta que el Comité revisa y aprueba o rechaza (RN-09-04). El bien queda marcado como propuesto para baja y sigue en el inventario.
        </Aviso>

        <Selector
          etiqueta="Causal"
          obligatorio
          ayuda="La app sugiere una según el estado y el índice; la fija el especialista, que es quien firma."
          value={causal}
          opciones={CAUSAL_BAJA.valores.map((c) => ({ valor: c, etiqueta: CAUSAL_BAJA.etiqueta(c) }))}
          onChange={(e) => setCausal(e.target.value as CausalBaja)}
        />

        <AreaTexto
          etiqueta="Justificación técnica"
          obligatorio
          ayuda={`Individual y específica de este bien (RN-09-06). "Obsoleto" o "dañado" no sirven. Van ${justificacion.trim().length} de 20 caracteres mínimos.`}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder="Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición."
        />

        {causal === 'INSERVIBLE' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Costo estimado de reparación" ayuda="En pesos, según la cotización." value={costoReparacion} onChange={(e) => setCostoReparacion(e.target.value)} inputMode="numeric" />
            <Campo etiqueta="Valor de reposición" ayuda="Lo que costaría un bien equivalente hoy." value={valorReposicion} onChange={(e) => setValorReposicion(e.target.value)} inputMode="numeric" />
            <p className="text-sm text-texto-secundario sm:col-span-2">
              Con los dos datos la app calcula la relación reparación/reposición (RN-09-03) y dice si procede la baja o conviene reparar. Sin cotización, la validación VAL-09-03 no pasa.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Valor de salvamento" ayuda="Lo que se espera recuperar (venta, chatarra). Reduce la pérdida." value={valorSalvamento} onChange={(e) => setValorSalvamento(e.target.value)} inputMode="numeric" />
          <Selector
            etiqueta="Destino final propuesto"
            vacio="Sin definir todavía"
            value={destino}
            opciones={DESTINO_FINAL.valores.map((d) => ({ valor: d, etiqueta: DESTINO_FINAL.etiqueta(d) }))}
            onChange={(e) => setDestino(e.target.value as DestinoFinal | '')}
          />
        </div>

        <Selector
          etiqueta="Especialista que certifica"
          obligatorio
          ayuda="Queda registrado como responsable del concepto técnico (VAL-09-05)."
          value={especialistaId}
          opciones={especialistas}
          onChange={(e) => setEspecialistaId(e.target.value)}
        />
      </div>
    </Dialogo>
  );
}
