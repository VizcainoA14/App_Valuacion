/**
 * **El cálculo**, que es la razón de ser del producto (ADR-029): la depreciación
 * y la obsolescencia de todo el inventario del proceso a SU fecha de corte. Hay
 * un solo cálculo por proceso; recalcular lo reemplaza. Responde a tres
 * preguntas —cuánto se depreció, qué bienes están al final de su vida útil, y
 * qué quedó fuera y por qué—, con el listado bien por bien debajo. Lo que no se
 * pudo calcular se muestra con su motivo, nunca como un cero (ANEXO_C §2.4, §3.4).
 */
import { useState, type JSX } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Calculator, ClipboardList, FileCheck2, RefreshCw } from 'lucide-react';
import type { ExclusionCalculoDto, ResumenCalculoDto } from '@compartido/dtos/calculo';
import type { Semaforo } from '@compartido/enums/catalogos';
import { SEMAFORO } from '@compartido/enums/catalogos';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { Aviso, Boton, Cargando, Encabezado, EstadoVacio, Insignia, Seccion, TablaSimple, cn } from '../../../componentes/ui';
import { formatearDinero, formatearEntero, formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { useProcesoRuta } from '../../inventario/hooks';
import { Resultados } from './Resultados';

/** Todo lo que cambia cuando se calcula: el cálculo y lo que sale de él. */
const CANALES_CALCULO = ['corte:actual', 'corte:porId', 'calculo:resumen', 'calculo:listar', 'calculo:exclusiones', 'baja:candidatos', 'informe:previsualizar'] as const;

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

export function Calculo(): JSX.Element {
  const procesoId = useProcesoRuta();
  const proceso = useCanal('proceso:porId', { id: procesoId });
  const corte = useCanal('corte:actual', { procesoId });
  const inventario = useCanal('bien:listar', { procesoId, pagina: 0, tamano: 1 });
  const [error, setError] = useState<string | null>(null);

  const calcular = useMutacion('calculo:ejecutar', [...CANALES_CALCULO], {
    onSuccess: () => setError(null),
    onError: (e: Error) => setError(e.message),
  });

  if (proceso.isPending || corte.isPending || inventario.isPending) return <Cargando />;
  if (proceso.data === null || proceso.data === undefined) return <Aviso tono="peligro">El proceso no existe.</Aviso>;
  const p = proceso.data;
  const c = corte.data ?? null;
  const bienes = inventario.data?.total ?? 0;
  const soloLectura = p.estado === 'FINALIZADO';

  return (
    <>
      <Encabezado
        titulo="Calcular"
        subtitulo={`Depreciación y obsolescencia de todo el inventario del proceso al ${formatearFecha(p.fechaCorte)}, su fecha de corte.`}
        acciones={
          c !== null && (
            <Link className="inline-flex h-9 items-center gap-1.5 rounded bg-acento px-3 font-medium text-white hover:brightness-110" to={`/proceso/${procesoId}/informe`}>
              <FileCheck2 className="h-4 w-4" aria-hidden /> Informe
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-5">
        {!soloLectura && (
          <Seccion
            titulo={c === null ? 'Calcular el proceso' : 'Volver a calcular'}
            descripcion={
              c === null
                ? 'La edad de cada bien y los meses depreciados se cuentan hasta la fecha de corte del proceso. Si hay que cambiarla, se cambia en Configurar.'
                : 'Si corrigió el inventario, la configuración o los parámetros, recalcule: el cálculo nuevo reemplaza al anterior.'
            }
          >
            {error !== null && (
              <Aviso tono="peligro" titulo="No se pudo calcular" className="mb-3">
                {error}
              </Aviso>
            )}
            {bienes === 0 ? (
              <EstadoVacio
                titulo="Todavía no hay inventario"
                descripcion="Cargue primero el barrido (PL-03) y los datos económicos (PL-05)."
                accion={
                  <Link className="underline" to={`/proceso/${procesoId}/inventario`}>
                    Ir al inventario
                  </Link>
                }
              />
            ) : (
              <Boton
                variante="primario"
                icono={c === null ? <Calculator className="h-4 w-4" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                cargando={calcular.isPending}
                onClick={() => calcular.mutate({ procesoId })}
              >
                {c === null ? 'Calcular' : 'Recalcular'} {formatearEntero(bienes)} bienes al {formatearFecha(p.fechaCorte)}
              </Boton>
            )}
          </Seccion>
        )}

        {c === null ? (
          soloLectura ? <Aviso tono="info">Este proceso se finalizó sin cálculo.</Aviso> : null
        ) : (
          <DetalleCalculo procesoId={procesoId} soloLectura={soloLectura} corteId={c.id} calculadoEn={c.calculadoEn} metodo={c.parametros.metodo_conteo_meses} />
        )}
      </div>
    </>
  );
}

function DetalleCalculo({ procesoId, soloLectura, corteId, calculadoEn, metodo }: { procesoId: string; soloLectura: boolean; corteId: string; calculadoEn: string; metodo: string }): JSX.Element {
  const [, setParams] = useSearchParams();
  const resumen = useCanal('calculo:resumen', { corteId });
  const exclusiones = useCanal('calculo:exclusiones', { corteId });

  if (resumen.isPending) return <Cargando />;
  if (resumen.data === undefined) return <Aviso tono="peligro">No se pudo leer el cálculo.</Aviso>;
  const r = resumen.data;

  return (
    <>
      <p className="text-texto-secundario" data-prueba="calculo-hecho">
        Calculado el {formatearMarcaTiempo(calculadoEn)} con el método {metodo}.
      </p>
      {r.inventarioCambio && (
        <Aviso tono="aviso" titulo="El inventario cambió después de calcular">
          Estas cifras no incluyen los cambios recientes.{soloLectura ? '' : ' Recalcule para que los incluyan.'}
        </Aviso>
      )}

      <Seccion titulo="Depreciación" descripcion="Totales del cálculo. La aplicación no reconoce deterioro: exige indicios y un avalúo que no hace.">
        <TotalesContables resumen={r} />
      </Seccion>

      <Seccion titulo="Estado de la vida útil" descripcion="Cuántos bienes hay en cada tramo del semáforo. Pulse uno para ver sus bienes abajo.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEMAFORO.valores.map((s) => (
            <button type="button" key={s} onClick={() => setParams({ semaforo: s })} className={cn('rounded-md px-4 py-3 text-left transition hover:brightness-95', ESTILO_SEMAFORO[s])}>
              <p className="text-2xl font-semibold">{formatearEntero(r.porSemaforo[s])}</p>
              <p className="font-medium">{SEMAFORO.etiqueta(s)}</p>
              <p className="text-sm opacity-80">{EXPLICACION_SEMAFORO[s]}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-texto-secundario">
          <Insignia tono={r.candidatosBaja > 0 ? 'aviso' : 'info'}>{formatearEntero(r.candidatosBaja)} candidatos a baja</Insignia>
          según los criterios de ANEXO_C §2.7. El cálculo los señala; la baja la decide el hospital.
          {r.candidatosBaja > 0 && (
            <Link className="inline-flex items-center gap-1 underline" to={`/proceso/${procesoId}/bajas`}>
              <ClipboardList className="h-4 w-4" aria-hidden /> Revisar candidatos
            </Link>
          )}
        </p>
      </Seccion>

      <QuedaronFuera exclusiones={exclusiones.data ?? []} />

      <Seccion titulo="Bien por bien" descripcion="El resultado de cada bien, los más obsoletos primero.">
        <Resultados corteId={corteId} soloLectura={soloLectura} />
      </Seccion>
    </>
  );
}

function TotalesContables({ resumen }: { resumen: ResumenCalculoDto }): JSX.Element {
  const filas = [
    { concepto: 'Saldo ajustado (costo + adiciones)', valor: resumen.totalSaldoAjustado },
    { concepto: 'Depreciación acumulada', valor: resumen.totalDepreciacionAcumulada },
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

const AMBITO: Record<ExclusionCalculoDto['ambito'], string> = { GENERAL: 'Todo el cálculo', OBSOLESCENCIA: 'Obsolescencia', DEPRECIACION: 'Depreciación' };

function QuedaronFuera({ exclusiones }: { exclusiones: readonly ExclusionCalculoDto[] }): JSX.Element | null {
  if (exclusiones.length === 0) return null;
  // Lo que impide calcular va primero; lo que simplemente no aplica, después.
  const ordenadas = [...exclusiones].sort((a, b) => Number(a.estado === 'NO_APLICA') - Number(b.estado === 'NO_APLICA'));

  return (
    <Seccion titulo="Qué quedó fuera del cálculo" descripcion="Un bien sin fecha o sin costo no se puede depreciar. No se cuenta como cero: se lista aquí para que se resuelva.">
      <TablaSimple
        columnas={[
          { clave: 'cod', titulo: 'Código', celda: (x) => <span className="font-mono">{x.codigoInstitucional}</span> },
          { clave: 'amb', titulo: 'Cálculo', celda: (x) => AMBITO[x.ambito] },
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
        vacio={null}
      />
      {ordenadas.length > 300 && <p className="mt-2 text-texto-secundario">Se muestran 300 de {formatearEntero(ordenadas.length)}. El informe los relaciona todos.</p>}
    </Seccion>
  );
}
