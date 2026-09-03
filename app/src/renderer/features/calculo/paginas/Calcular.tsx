/**
 * ADR-026 etapa 4 — **el cálculo**. Es la razón de ser del producto, así que la
 * pantalla tiene una sola acción principal y responde a tres preguntas: cuánto
 * se depreció, qué bienes están al final de su vida útil, y qué quedó fuera y
 * por qué. Lo que no se pudo calcular se muestra con su motivo, nunca como un
 * cero (ANEXO_C §2.4, §3.4).
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { Calculator, RefreshCw, TriangleAlert } from 'lucide-react';
import type { ExclusionCalculoDto, ResumenCalculoDto } from '@compartido/dtos/calculo';
import type { Semaforo } from '@compartido/enums/catalogos';
import { SEMAFORO } from '@compartido/enums/catalogos';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { Aviso, Boton, Cargando, EstadoVacio, Insignia, Seccion, TablaSimple, cn } from '../../../componentes/ui';
import { formatearDinero, formatearEntero, formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { useContextoEjercicio } from '../../inventario/hooks';

// El cálculo es lo que llena la bandeja de candidatos a baja: si no se invalida,
// la etapa 5 sigue mostrando el resultado anterior en caché.
const CANALES_CALCULO = ['calculo:resumen', 'calculo:listar', 'validaciones:evaluar', 'baja:candidatos', 'baja:listar', 'baja:resumen'] as const;

/** El color del semáforo es información, no decoración: también va el texto. */
const ESTILO_SEMAFORO: Record<Semaforo, string> = {
  VERDE: 'bg-exito/15 text-exito',
  AMARILLO: 'bg-aviso/20 text-aviso',
  NARANJA: 'bg-aviso/30 text-texto',
  ROJO: 'bg-peligro/15 text-peligro',
};

const EXPLICACION_SEMAFORO: Record<Semaforo, string> = {
  VERDE: 'Menos de la mitad de su vida útil',
  AMARILLO: 'Entre la mitad y el umbral de alerta',
  NARANJA: 'Cerca del fin de su vida útil',
  ROJO: 'Superó su vida útil técnica',
};

export function Calcular(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const resumen = useCanal('calculo:resumen', { ejercicioId });
  const [exclusiones, setExclusiones] = useState<readonly ExclusionCalculoDto[] | null>(null);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useMutacion('calculo:ejecutar', [...CANALES_CALCULO], {
    onSuccess: (r) => {
      setExclusiones(r.exclusiones);
      setDuracion(r.milisegundos);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (resumen.isPending) return <Cargando />;
  if (resumen.data === undefined) return <Aviso tono="peligro">No se pudo leer el estado del cálculo.</Aviso>;

  const r = resumen.data;
  const nuncaCalculado = r.calculadoEn === null;

  return (
    <div className="flex flex-col gap-5">
      <Seccion
        titulo="Depreciación y obsolescencia"
        descripcion={`Al corte del ${formatearFecha(r.fechaCorte)}. Se recorre todo el inventario y se guarda el resultado bien por bien, con el método de conteo que se aplicó.`}
        acciones={
          <Boton
            variante="primario"
            icono={nuncaCalculado ? <Calculator className="h-4 w-4" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            cargando={ejecutar.isPending}
            onClick={() => ejecutar.mutate({ entidadId, ejercicioId })}
          >
            {nuncaCalculado ? 'Calcular' : 'Recalcular'}
          </Boton>
        }
      >
        {error !== null && (
          <Aviso tono="peligro" titulo="No se pudo calcular" className="mb-3">
            {error}
          </Aviso>
        )}

        {nuncaCalculado ? (
          <EstadoVacio
            titulo="Todavía no se ha calculado nada"
            descripcion={`Hay ${formatearEntero(r.bienesConsiderados)} bienes en el ejercicio. Al calcular se obtiene la depreciación acumulada de cada uno y cuáles superaron su vida útil.`}
          />
        ) : (
          <>
            <p className="mb-3 text-texto-secundario">
              Calculado el {formatearMarcaTiempo(r.calculadoEn)} con el método <span className="font-medium text-texto">{r.metodoConteoAplicado ?? '—'}</span>
              {duracion !== null && ` · ${formatearEntero(duracion)} ms`}.
            </p>
            {r.desactualizado && (
              <Aviso tono="aviso" titulo="El cálculo quedó desfasado" className="mb-3">
                Algún bien cambió después de la última corrida. Vuelva a calcular antes de emitir el informe.
              </Aviso>
            )}
            <TotalesContables resumen={r} />
          </>
        )}
      </Seccion>

      {!nuncaCalculado && (
        <Seccion titulo="Estado de la vida útil" descripcion="Cuántos bienes hay en cada tramo del semáforo, y cuántos son candidatos a darse de baja.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEMAFORO.valores.map((s) => (
              <Link
                key={s}
                to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/05/resultados?semaforo=${s}`}
                className={cn('rounded-md px-4 py-3 transition hover:brightness-95', ESTILO_SEMAFORO[s])}
              >
                <p className="text-2xl font-semibold">{formatearEntero(r.porSemaforo[s])}</p>
                <p className="font-medium">{SEMAFORO.etiqueta(s)}</p>
                <p className="text-sm opacity-80">{EXPLICACION_SEMAFORO[s]}</p>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-texto-secundario">
            <Insignia tono={r.candidatosBaja > 0 ? 'aviso' : 'info'}>{formatearEntero(r.candidatosBaja)} candidatos a baja</Insignia>{' '}
            según los criterios de ANEXO_C §2.7. El motor los sugiere; la baja la decide el Comité.
          </p>
        </Seccion>
      )}

      {!nuncaCalculado && <QuedaronFuera resumen={r} exclusiones={exclusiones} />}
    </div>
  );
}

function TotalesContables({ resumen }: { resumen: ResumenCalculoDto }): JSX.Element {
  const filas = [
    { concepto: 'Saldo ajustado (costo + adiciones)', valor: resumen.totalSaldoAjustado },
    { concepto: 'Depreciación acumulada', valor: resumen.totalDepreciacionAcumulada },
    { concepto: 'Deterioro reconocido', valor: resumen.totalDeterioro },
    { concepto: 'Valor neto en libros', valor: resumen.totalValorNetoLibros },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TablaSimple
        columnas={[
          { clave: 'c', titulo: 'Concepto', celda: (f) => f.concepto },
          { clave: 'v', titulo: 'Total', celda: (f) => <span className="font-mono">{formatearDinero(f.valor)}</span>, alineacion: 'derecha' },
        ]}
        filas={filas}
        claveFila={(f) => f.concepto}
        vacio={null}
      />
      <TablaSimple
        columnas={[
          { clave: 'c', titulo: 'Bienes', celda: (f) => f.concepto },
          { clave: 'n', titulo: 'Cantidad', celda: (f) => formatearEntero(f.n), alineacion: 'derecha' },
        ]}
        filas={[
          { concepto: 'Considerados (sin los dados de baja)', n: resumen.bienesConsiderados },
          { concepto: 'Con depreciación calculada', n: resumen.conDepreciacion },
          { concepto: 'Sin depreciación por falta de datos', n: resumen.sinDepreciacion },
          { concepto: 'No depreciables o de terceros', n: resumen.noAplicaDepreciacion },
        ]}
        claveFila={(f) => f.concepto}
        vacio={null}
      />
    </div>
  );
}

function QuedaronFuera({ resumen, exclusiones }: { resumen: ResumenCalculoDto; exclusiones: readonly ExclusionCalculoDto[] | null }): JSX.Element | null {
  const pendientes = resumen.sinObsolescencia + resumen.sinDepreciacion;
  if (pendientes === 0 && (exclusiones === null || exclusiones.length === 0)) return null;

  // Lo que impide calcular va primero; lo que simplemente no aplica, después.
  const ordenadas = exclusiones === null ? [] : [...exclusiones].sort((a, b) => Number(a.estado === 'NO_APLICA') - Number(b.estado === 'NO_APLICA'));

  return (
    <Seccion
      titulo="Qué quedó fuera del cálculo"
      descripcion="Un bien sin fecha o sin costo no se puede depreciar. No se cuenta como cero: se lista aquí para que se resuelva antes de firmar el informe."
    >
      {exclusiones === null ? (
        <Aviso tono="info" titulo="Detalle disponible al recalcular">
          <span className="inline-flex items-center gap-1">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {formatearEntero(pendientes)} bienes quedaron fuera en la última corrida. Vuelva a calcular para ver el motivo de cada uno.
          </span>
        </Aviso>
      ) : (
        <TablaSimple
          columnas={[
            { clave: 'cod', titulo: 'Código', celda: (x) => <span className="font-mono">{x.codigoInstitucional}</span> },
            { clave: 'amb', titulo: 'Cálculo', celda: (x) => (x.ambito === 'OBSOLESCENCIA' ? 'Obsolescencia' : 'Depreciación') },
            {
              clave: 'est',
              titulo: 'Motivo',
              celda: (x) => (
                <Insignia tono={x.estado === 'ERROR_DATOS' ? 'peligro' : x.estado === 'NO_CALCULABLE' ? 'aviso' : 'neutro'}>
                  {x.estado === 'ERROR_DATOS' ? 'Dato inválido' : x.estado === 'NO_CALCULABLE' ? 'Falta un dato' : 'No le aplica'}
                </Insignia>
              ),
              ancho: '130px',
            },
            { clave: 'det', titulo: 'Detalle', celda: (x) => x.motivo },
          ]}
          filas={ordenadas.slice(0, 300)}
          claveFila={(x) => `${x.bienId}-${x.ambito}`}
          vacio={<p className="text-texto-secundario">Ningún bien quedó fuera: el inventario está completo.</p>}
        />
      )}
    </Seccion>
  );
}
