/**
 * La portada de un proceso (ADR-029): en qué va y qué sigue. Es donde se llega
 * al "continuar" un proceso, y donde se finaliza cuando el trabajo terminó.
 */
import { useState, type JSX } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Circle, AlertTriangle, Lock, ChevronRight } from 'lucide-react';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { Aviso, Boton, Cargando, Encabezado, Seccion, cn } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearDinero, formatearEntero, formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { mensajeError, useProcesoId, useValidaciones } from '../hooks';

type EstadoPaso = 'hecho' | 'pendiente' | 'atencion';

interface Paso {
  readonly nombre: string;
  readonly estado: EstadoPaso;
  readonly detalle: string;
  readonly ruta: string;
}

const ICONO: Record<EstadoPaso, typeof Circle> = { hecho: CheckCircle2, pendiente: Circle, atencion: AlertTriangle };
const COLOR: Record<EstadoPaso, string> = { hecho: 'text-exito', pendiente: 'text-texto-secundario', atencion: 'text-aviso' };

export function ResumenProceso(): JSX.Element {
  const procesoId = useProcesoId();
  const proceso = useCanal('proceso:porId', { id: procesoId });
  const validaciones = useValidaciones(procesoId);
  const inventario = useCanal('bien:listar', { procesoId, pagina: 0, tamano: 1 });
  const corte = useCanal('corte:actual', { procesoId });
  const bajas = useCanal('baja:listar', { procesoId });
  const corteId = corte.data?.id;
  const resumen = useCanal('calculo:resumen', corteId === undefined ? undefined : { corteId }, { enabled: corteId !== undefined });
  const [finalizando, setFinalizando] = useState(false);

  if (proceso.isPending || corte.isPending || inventario.isPending) return <Cargando />;
  if (proceso.data === null || proceso.data === undefined) return <Aviso tono="peligro">El proceso no existe.</Aviso>;
  const p = proceso.data;
  const c = corte.data ?? null;
  const bienes = inventario.data?.total ?? 0;
  const base = `/proceso/${procesoId}`;
  const finalizado = p.estado === 'FINALIZADO';
  const inventarioCambio = resumen.data?.inventarioCambio === true;

  const pasos: Paso[] = [
    {
      nombre: 'Configurar',
      estado: validaciones.data?.lista === true ? 'hecho' : 'pendiente',
      detalle: validaciones.data?.lista === true ? 'Hospital, sedes, clases de activo y parámetros listos.' : 'Faltan datos: sedes y servicios, clases de activo o parámetros.',
      ruta: `${base}/configuracion`,
    },
    {
      nombre: 'Cargar el inventario',
      estado: bienes > 0 ? 'hecho' : 'pendiente',
      detalle: bienes > 0 ? `${formatearEntero(bienes)} bienes cargados.` : 'Importe el barrido (PL-03) y los datos económicos (PL-05).',
      ruta: `${base}/inventario`,
    },
    {
      nombre: 'Calcular',
      estado: c === null ? 'pendiente' : inventarioCambio ? 'atencion' : 'hecho',
      detalle:
        c === null
          ? `Depreciación y obsolescencia al ${formatearFecha(p.fechaCorte)}.`
          : inventarioCambio
            ? 'El inventario cambió después de calcular: vuelva a calcular para que las cifras lo incluyan.'
            : `Calculado el ${formatearMarcaTiempo(c.calculadoEn)} · valor neto ${formatearDinero(c.totalValorNetoLibros)}.`,
      ruta: `${base}/calculo`,
    },
    {
      nombre: 'Bajas',
      estado: (bajas.data?.length ?? 0) > 0 ? 'hecho' : 'pendiente',
      detalle: (bajas.data?.length ?? 0) > 0 ? (bajas.data?.length ?? 0) === 1 ? '1 baja registrada.' : `${formatearEntero(bajas.data?.length ?? 0)} bajas registradas.` : 'Revise los candidatos del cálculo y registre las bajas que decida el hospital. Es opcional.',
      ruta: `${base}/bajas`,
    },
    {
      nombre: 'Informe',
      estado: c === null ? 'pendiente' : 'hecho',
      detalle: c === null ? 'Sale del cálculo: calcule primero.' : 'Listo para guardar en PDF.',
      ruta: `${base}/informe`,
    },
  ];

  return (
    <>
      <Encabezado
        titulo={p.nombre}
        subtitulo={`${p.razonSocial} · NIT ${p.nit} · fecha de corte ${formatearFecha(p.fechaCorte)}`}
        acciones={
          !finalizado && (
            <Boton variante="primario" icono={<Lock className="h-4 w-4" aria-hidden />} disabled={c === null} title={c === null ? 'Calcule antes de finalizar' : undefined} onClick={() => setFinalizando(true)}>
              Finalizar proceso
            </Boton>
          )
        }
      />
      <div className="flex flex-col gap-5">
        <Seccion titulo={finalizado ? 'Cómo quedó' : 'En qué va'} descripcion={finalizado ? undefined : 'Siga los pasos en orden. Mientras el proceso esté en curso puede volver a cualquiera y corregir.'}>
          <ol className="flex flex-col divide-y divide-borde">
            {pasos.map((paso, i) => {
              const Icono = ICONO[paso.estado];
              return (
                <li key={paso.nombre}>
                  <Link to={paso.ruta} className="flex items-center gap-3 py-2.5 hover:bg-elevada">
                    <Icono className={cn('h-5 w-5 shrink-0', COLOR[paso.estado])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-texto">
                        {i + 1}. {paso.nombre}
                      </span>
                      <span className="block text-sm text-texto-secundario">{paso.detalle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-texto-secundario" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ol>
        </Seccion>
        {!finalizado && (
          <Aviso tono="info" titulo="Al terminar, finalice el proceso">
            Finalizar deja el proceso de solo lectura: el cálculo, las bajas y el informe quedan como están y ya no se pueden cambiar. Para una valuación posterior se inicia un proceso nuevo.
          </Aviso>
        )}
      </div>
      {finalizando && <DialogoFinalizar procesoId={procesoId} nombre={p.nombre} inventarioCambio={inventarioCambio} onCerrar={() => setFinalizando(false)} />}
    </>
  );
}

function DialogoFinalizar({ procesoId, nombre, inventarioCambio, onCerrar }: { procesoId: string; nombre: string; inventarioCambio: boolean; onCerrar: () => void }): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const finalizar = useMutacion('proceso:finalizar', ['proceso:porId', 'proceso:listar'], { onSuccess: onCerrar, onError: (e: Error) => setError(mensajeError(e)) });
  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`¿Finalizar «${nombre}»?`}
      descripcion="El proceso queda de solo lectura. No se puede deshacer."
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" cargando={finalizar.isPending} onClick={() => finalizar.mutate({ id: procesoId })}>
            Sí, finalizar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error !== null && <Aviso tono="peligro">{error}</Aviso>}
        {inventarioCambio && (
          <Aviso tono="aviso" titulo="El inventario cambió después del cálculo">
            Si finaliza ahora, el informe tendrá las cifras del último cálculo, sin esos cambios. Recalcule primero si los quiere incluir.
          </Aviso>
        )}
        <p className="text-texto-secundario">Podrá seguir consultando el proceso y volver a guardar su informe cuando quiera.</p>
      </div>
    </Dialogo>
  );
}
