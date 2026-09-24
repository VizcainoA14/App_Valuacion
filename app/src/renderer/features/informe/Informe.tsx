/**
 * **La entrega**: el informe del proceso, en vista previa y en PDF. Nada de esto
 * recalcula; el informe dice lo que el cálculo del proceso dio, así que
 * regenerarlo meses después —con el proceso finalizado— da el mismo documento.
 * No lleva firmas: es el soporte de cálculo que el hospital usa en su propio
 * trámite (ADR-028, ADR-029).
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { FileDown } from 'lucide-react';
import { useCanal, useMutacion } from '../../ipc/consultas';
import { Aviso, Boton, Cargando, Encabezado, EstadoVacio, Seccion } from '../../componentes/ui';
import { formatearEntero, formatearFecha } from '../../formato';
import { useProcesoRuta } from '../inventario/hooks';
import { useSoloLectura } from '../configuracion/hooks';

export function Informe(): JSX.Element {
  const procesoId = useProcesoRuta();
  const corte = useCanal('corte:actual', { procesoId });
  const corteId = corte.data?.id ?? null;
  const soloLectura = useSoloLectura(procesoId);
  const resumen = useCanal('calculo:resumen', corteId === null ? undefined : { corteId }, { enabled: corteId !== null });
  const previa = useCanal('informe:previsualizar', corteId === null ? undefined : { corteId }, { enabled: corteId !== null });
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generar = useMutacion('informe:generar', [], {
    onSuccess: (r) => {
      setError(null);
      setResultado(r === null ? null : `Informe guardado en ${r.ruta} (${Math.round(r.bytes / 1024)} kB).`);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (corte.isPending) return <Cargando />;

  if (corteId === null) {
    return (
      <EstadoVacio
        titulo="Todavía no hay nada que informar"
        descripcion="El informe declara las cifras del cálculo del proceso. Calcule primero."
        accion={
          <Link className="underline" to={`/proceso/${procesoId}/calculo`}>
            Ir a calcular
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Encabezado titulo="Informe de valuación" subtitulo="Método aplicado, resumen contable, consolidado por subcuenta, vida útil, candidatos a baja, bajas registradas, lo que quedó fuera y el anexo bien por bien." />
      <div className="flex flex-col gap-5">
        <Seccion
          titulo={`Cálculo al ${formatearFecha(corte.data?.fechaCorte ?? '')}`}
          acciones={
            <Boton variante="primario" icono={<FileDown className="h-4 w-4" aria-hidden />} cargando={generar.isPending} onClick={() => generar.mutate({ corteId })}>
              Guardar en PDF
            </Boton>
          }
        >
          <div className="flex flex-col gap-3">
            {resumen.data?.inventarioCambio === true && (
              <Aviso tono="aviso" titulo="El inventario cambió después de calcular">
                El informe tiene las cifras del último cálculo, sin los cambios posteriores (por ejemplo, las bajas registradas después).
                {soloLectura ? (
                  ' El proceso está finalizado, así que el informe queda así.'
                ) : (
                  <>
                    {' '}
                    Si los quiere incluir,{' '}
                    <Link className="underline" to={`/proceso/${procesoId}/calculo`}>
                      recalcule
                    </Link>
                    .
                  </>
                )}
              </Aviso>
            )}
            {error !== null && (
              <Aviso tono="peligro" titulo="No se pudo generar el informe">
                {error}
              </Aviso>
            )}
            {resultado !== null && (
              <Aviso tono="exito" titulo="Informe generado">
                {resultado}
              </Aviso>
            )}
            {previa.data !== undefined && (
              <p className="text-texto-secundario">
                {formatearEntero(previa.data.bienes)} bienes en el anexo · {formatearEntero(previa.data.candidatos)} candidatos a baja. Tamaño Carta, con el método de conteo declarado en el pie de
                cada página.
              </p>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Vista previa" descripcion="Es exactamente lo que sale impreso: el PDF se genera desde esta misma maqueta.">
          {previa.isPending ? (
            <Cargando texto="Preparando la vista previa…" />
          ) : previa.data === undefined ? (
            <Aviso tono="peligro">No se pudo construir el informe.</Aviso>
          ) : (
            <iframe title="Vista previa del informe" className="h-[70vh] w-full rounded border border-borde bg-white" sandbox="" srcDoc={previa.data.html} />
          )}
        </Seccion>
      </div>
    </>
  );
}
