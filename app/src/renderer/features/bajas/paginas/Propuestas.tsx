/**
 * Las propuestas de baja y su recorrido por el Comité. La app registra estados;
 * no ejecuta bajas (RN-09-04). Lo que aquí se ve es lo que irá a la resolución.
 */
import { useState, type JSX } from 'react';
import { Check, X } from 'lucide-react';
import type { PropuestaBajaDto } from '@compartido/dtos/bajas';
import type { EstadoPropuestaBaja } from '@compartido/enums/estados';
import { ESTADO_PROPUESTA_BAJA } from '@compartido/enums/estados';
import { CAUSAL_BAJA } from '@compartido/enums/catalogos';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { AreaTexto, Aviso, Boton, Cargando, EstadoVacio, Insignia, Seccion, TablaSimple } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearDinero, formatearEntero, formatearFecha } from '../../../formato';
import { useContextoEjercicio } from '../../inventario/hooks';

const CANALES_BAJA = ['baja:candidatos', 'baja:listar', 'baja:resumen', 'bien:listar', 'validaciones:evaluar'] as const;

/** Qué sigue después de cada estado, en palabras del hospital. */
const SIGUIENTE: Partial<Record<EstadoPropuestaBaja, { estado: EstadoPropuestaBaja; texto: string }>> = {
  PROPUESTO: { estado: 'EN_REVISION', texto: 'Enviar a revisión del Comité' },
  EN_REVISION: { estado: 'APROBADO_COMITE', texto: 'Registrar aprobación del Comité' },
  APROBADO_COMITE: { estado: 'RESOLUCION_EMITIDA', texto: 'Registrar resolución emitida' },
};

const TONO: Partial<Record<EstadoPropuestaBaja, 'info' | 'aviso' | 'exito' | 'peligro'>> = {
  PROPUESTO: 'info',
  EN_REVISION: 'aviso',
  APROBADO_COMITE: 'exito',
  RESOLUCION_EMITIDA: 'exito',
  RECHAZADO: 'peligro',
};

export function Propuestas(): JSX.Element {
  const { ejercicioId } = useContextoEjercicio();
  const propuestas = useCanal('baja:listar', { ejercicioId });
  const resumen = useCanal('baja:resumen', { ejercicioId });
  const [rechazando, setRechazando] = useState<PropuestaBajaDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cambiar = useMutacion('baja:cambiarEstado', [...CANALES_BAJA], { onError: (e: Error) => setError(e.message) });

  if (propuestas.isPending || resumen.isPending) return <Cargando />;
  if (propuestas.data === undefined || resumen.data === undefined) return <Aviso tono="peligro">No se pudieron leer las propuestas.</Aviso>;

  const lista = propuestas.data;
  const r = resumen.data;

  if (lista.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay ninguna propuesta"
        descripcion={`Hay ${formatearEntero(r.candidatosSinProponer)} candidatos esperando en la bandeja. Revíselos uno a uno y proponga los que corresponda.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error !== null && (
        <Aviso tono="peligro" titulo="No se pudo cambiar el estado">
          {error}
        </Aviso>
      )}

      <Seccion titulo="Efecto contable de las bajas propuestas" descripcion="RN-09-05. Los rechazos no cuentan: ese bien volvió al inventario activo. Las cifras salen del cálculo del paso 06.">
        <TablaSimple
          columnas={[
            { clave: 'c', titulo: 'Concepto', celda: (f) => f.concepto },
            { clave: 'v', titulo: 'Total', celda: (f) => <span className="font-mono">{formatearDinero(f.valor)}</span>, alineacion: 'derecha' },
          ]}
          filas={[
            { concepto: 'Valor bruto de los bienes propuestos', valor: r.valorBrutoTotal },
            { concepto: 'Depreciación acumulada asociada', valor: r.depreciacionTotal },
            { concepto: 'Valor neto en libros', valor: r.valorNetoTotal },
            { concepto: 'Valor de salvamento esperado', valor: r.valorRecuperadoTotal },
            { concepto: 'Pérdida a reconocer', valor: r.perdidaTotal },
          ]}
          claveFila={(f) => f.concepto}
          vacio={null}
        />
      </Seccion>

      <TablaSimple
        columnas={[
          { clave: 'cod', titulo: 'Código', celda: (p: PropuestaBajaDto) => <span className="font-mono">{p.codigoInstitucional}</span> },
          { clave: 'desc', titulo: 'Bien', celda: (p) => p.descripcionFuncional },
          { clave: 'causal', titulo: 'Causal', celda: (p) => CAUSAL_BAJA.etiqueta(p.causal) },
          { clave: 'just', titulo: 'Justificación técnica', celda: (p) => <span className="text-sm">{p.justificacionTecnica}</span> },
          {
            clave: 'econ',
            titulo: 'Reparar / reponer',
            celda: (p) =>
              p.relacionReparacionReposicion === null ? (
                <span className="text-sm text-texto-secundario">sin cotización</span>
              ) : (
                <span title={p.recomendacionEconomica ?? ''} className="font-mono">
                  {(p.relacionReparacionReposicion * 100).toFixed(1)} %{p.procedeBajaPorEconomia === true ? ' ✓' : ''}
                </span>
              ),
            alineacion: 'derecha',
          },
          { clave: 'neto', titulo: 'Valor neto', celda: (p) => <span className="font-mono">{formatearDinero(p.efectoContable.valorNeto)}</span>, alineacion: 'derecha' },
          { clave: 'esp', titulo: 'Especialista', celda: (p) => <span className="text-sm">{p.especialistaNombre}</span> },
          { clave: 'fecha', titulo: 'Propuesta', celda: (p) => formatearFecha(p.fechaPropuesta) },
          {
            clave: 'estado',
            titulo: 'Estado',
            celda: (p) => (
              <div className="flex flex-col gap-1">
                <Insignia tono={TONO[p.estadoAprobacion] ?? 'info'}>{ESTADO_PROPUESTA_BAJA.etiqueta(p.estadoAprobacion)}</Insignia>
                {p.observacionComite !== null && <span className="text-sm text-texto-secundario">{p.observacionComite}</span>}
              </div>
            ),
            ancho: '190px',
          },
          {
            clave: 'acciones',
            titulo: '',
            celda: (p) => {
              const siguiente = SIGUIENTE[p.estadoAprobacion];
              if (siguiente === undefined) return null;
              return (
                <div className="flex flex-col gap-1">
                  <Boton
                    icono={<Check className="h-4 w-4" aria-hidden />}
                    cargando={cambiar.isPending}
                    onClick={() => {
                      setError(null);
                      cambiar.mutate({ id: p.id, nuevoEstado: siguiente.estado, observacionComite: null });
                    }}
                  >
                    {siguiente.texto}
                  </Boton>
                  {p.estadoAprobacion === 'EN_REVISION' && (
                    <Boton icono={<X className="h-4 w-4" aria-hidden />} onClick={() => setRechazando(p)}>
                      Rechazar
                    </Boton>
                  )}
                </div>
              );
            },
            ancho: '250px',
          },
        ]}
        filas={lista}
        claveFila={(p) => p.id}
        vacio={null}
      />

      <p className="text-texto-secundario">
        La ejecución de la baja y la disposición final exigen el acta del Comité y el certificado ambiental; la base lo impide sin ellos (INT-07, RN-09-08). Esa parte llega con el módulo
        de Comité y resoluciones.
      </p>

      {rechazando !== null && <DialogoRechazo propuesta={rechazando} onCerrar={() => setRechazando(null)} />}
    </div>
  );
}

function DialogoRechazo({ propuesta, onCerrar }: { propuesta: PropuestaBajaDto; onCerrar: () => void }): JSX.Element {
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cambiar = useMutacion('baja:cambiarEstado', [...CANALES_BAJA], { onSuccess: onCerrar, onError: (e: Error) => setError(e.message) });

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`Rechazar la baja de ${propuesta.codigoInstitucional}`}
      descripcion="El bien vuelve al inventario activo con la observación del Comité (RN-09-04)."
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" cargando={cambiar.isPending} disabled={observacion.trim() === ''} onClick={() => cambiar.mutate({ id: propuesta.id, nuevoEstado: 'RECHAZADO', observacionComite: observacion })}>
            Registrar el rechazo
          </Boton>
        </>
      }
    >
      {error !== null && (
        <Aviso tono="peligro" className="mb-3">
          {error}
        </Aviso>
      )}
      <AreaTexto
        etiqueta="Observación del Comité"
        obligatorio
        ayuda="Por qué no procede la baja. Queda en la bitácora y explica al servicio qué hacer con el bien."
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        placeholder="El Comité ordena cotizar la reparación antes de decidir."
      />
    </Dialogo>
  );
}
