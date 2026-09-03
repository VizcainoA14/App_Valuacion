/**
 * ADR-026 etapa 6 — **la entrega**. Una vista previa de lo que va a firmarse y
 * un botón para guardarlo en PDF. Nada de esto recalcula: si el cálculo quedó
 * desfasado, se avisa antes, no después de que alguien lo firme.
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { FileDown } from 'lucide-react';
import { useCanal, useMutacion } from '../../ipc/consultas';
import { Aviso, Boton, Cargando, EstadoVacio, Seccion } from '../../componentes/ui';
import { formatearEntero } from '../../formato';
import { useContextoEjercicio } from '../inventario/hooks';

export function Informe(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const resumen = useCanal('calculo:resumen', { ejercicioId });
  const previa = useCanal('informe:previsualizar', { entidadId, ejercicioId }, { enabled: resumen.data?.calculadoEn !== null });
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generar = useMutacion('informe:generar', [], {
    onSuccess: (r) => {
      setError(null);
      setResultado(r === null ? null : `Informe guardado en ${r.ruta} (${Math.round(r.bytes / 1024)} kB).`);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (resumen.isPending) return <Cargando />;
  if (resumen.data === undefined) return <Aviso tono="peligro">No se pudo leer el estado del ejercicio.</Aviso>;

  if (resumen.data.calculadoEn === null) {
    return (
      <EstadoVacio
        titulo="Todavía no hay nada que informar"
        descripcion="El informe declara las cifras del cálculo. Ejecute primero la etapa 4."
        accion={
          <Link className="underline" to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/05`}>
            Ir al cálculo
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Seccion
        titulo="Informe de valuación"
        descripcion="Método aplicado, resumen contable, consolidado por subcuenta, estado de la vida útil, bajas propuestas, bienes que quedaron fuera y el anexo con el listado bien por bien."
        acciones={
          <Boton variante="primario" icono={<FileDown className="h-4 w-4" aria-hidden />} cargando={generar.isPending} onClick={() => generar.mutate({ entidadId, ejercicioId })}>
            Guardar en PDF
          </Boton>
        }
      >
        {resumen.data.desactualizado && (
          <Aviso tono="aviso" titulo="El cálculo quedó desfasado" className="mb-3">
            Algún bien cambió después de la última corrida. Vuelva a calcular antes de emitir el informe: lo que se firme aquí son cifras que ya no corresponden.
          </Aviso>
        )}
        {error !== null && (
          <Aviso tono="peligro" titulo="No se pudo generar el informe" className="mb-3">
            {error}
          </Aviso>
        )}
        {resultado !== null && (
          <Aviso tono="exito" titulo="Informe generado" className="mb-3">
            {resultado}
          </Aviso>
        )}
        {previa.data !== undefined && (
          <p className="text-texto-secundario">
            {formatearEntero(previa.data.bienes)} bienes en el anexo · {formatearEntero(previa.data.bajas)} bajas propuestas. Tamaño Carta, con el método de conteo declarado en el pie de
            cada página.
          </p>
        )}
      </Seccion>

      <Seccion titulo="Vista previa" descripcion="Es exactamente lo que sale impreso: el PDF se genera desde esta misma maqueta.">
        {previa.isPending ? (
          <Cargando texto="Preparando la vista previa…" />
        ) : previa.data === undefined ? (
          <Aviso tono="peligro">No se pudo construir el informe.</Aviso>
        ) : (
          <iframe
            title="Vista previa del informe"
            className="h-[70vh] w-full rounded border border-borde bg-white"
            sandbox=""
            srcDoc={previa.data.html}
          />
        )}
      </Seccion>
    </div>
  );
}
