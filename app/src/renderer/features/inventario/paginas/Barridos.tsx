/**
 * Qué se ha barrido y cuándo: los servicios del proceso con sus bienes y la
 * fecha de la última toma, y el historial de barridos. Sirve para ver de un
 * vistazo qué servicio lleva tiempo sin contarse (ADR-028).
 */
import type { JSX } from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { useCanal } from '../../../ipc/consultas';
import { Aviso, Cargando, Encabezado, Insignia, Seccion, TablaSimple } from '../../../componentes/ui';
import { formatearEntero, formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { useProcesoRuta } from '../hooks';

export function Barridos(): JSX.Element {
  const procesoId = useProcesoRuta();
  const cobertura = useCanal('bien:cobertura', { procesoId });
  const barridos = useCanal('barrido:listar', { procesoId });

  if (cobertura.isPending || barridos.isPending) return <Cargando />;
  if (cobertura.data === undefined) return <Aviso tono="peligro">{cobertura.error?.message ?? 'Sin datos'}</Aviso>;
  const { servicios, serviciosActivos, serviciosConBienes, totalBienes } = cobertura.data;

  return (
    <>
      <Encabezado titulo="Barridos y servicios" subtitulo="Cada importación de PL-03 es un barrido. No hace falta recorrer todo el hospital de una vez: un barrido solo toca los servicios que trae." />
      <div className="flex flex-col gap-5">
        <Seccion titulo="Servicios" descripcion={`${serviciosConBienes} de ${serviciosActivos} servicios activos con bienes · ${formatearEntero(totalBienes)} bienes vigentes`}>
          <TablaSimple
            columnas={[
              { clave: 'sede', titulo: 'Sede', celda: (s) => `${s.sedeCodigo} · ${s.sedeNombre}` },
              { clave: 'servicio', titulo: 'Servicio', celda: (s) => `${s.servicioCodigo} · ${s.servicioNombre}` },
              { clave: 'bienes', titulo: 'Bienes', alineacion: 'derecha', celda: (s) => formatearEntero(s.bienes) },
              { clave: 'perdidos', titulo: 'No encontrados', alineacion: 'derecha', celda: (s) => (s.noEncontrados === 0 ? '—' : <Insignia tono="aviso">{formatearEntero(s.noEncontrados)}</Insignia>) },
              {
                clave: 'toma',
                titulo: 'Última toma',
                celda: (s) =>
                  s.ultimaToma === null ? (
                    <span className="flex items-center gap-1.5 text-aviso">
                      <CircleDashed className="h-4 w-4" aria-hidden />
                      Nunca barrido
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-exito" aria-hidden />
                      {formatearFecha(s.ultimaToma)}
                    </span>
                  ),
              },
            ]}
            filas={servicios}
            claveFila={(s) => s.servicioId}
            vacio={<Insignia tono="aviso">No hay servicios activos en el proceso</Insignia>}
          />
        </Seccion>

        <Seccion titulo="Historial de barridos" descripcion="Lo que hizo cada importación de PL-03. El archivo original queda guardado tal como llegó.">
          <TablaSimple
            columnas={[
              { clave: 'fecha', titulo: 'Toma', celda: (b) => formatearFecha(b.fecha) },
              { clave: 'archivo', titulo: 'Archivo', celda: (b) => <span className="font-mono text-sm">{b.archivo}</span> },
              { clave: 'serv', titulo: 'Servicios', alineacion: 'derecha', celda: (b) => formatearEntero(b.serviciosRecorridos) },
              { clave: 'nuevos', titulo: 'Nuevos', alineacion: 'derecha', celda: (b) => formatearEntero(b.bienesNuevos) },
              { clave: 'act', titulo: 'Actualizados', alineacion: 'derecha', celda: (b) => formatearEntero(b.bienesActualizados) },
              { clave: 'noenc', titulo: 'No encontrados', alineacion: 'derecha', celda: (b) => formatearEntero(b.bienesNoEncontrados) },
              { clave: 'cuando', titulo: 'Importado', celda: (b) => formatearMarcaTiempo(b.creadoEn) },
            ]}
            filas={barridos.data ?? []}
            claveFila={(b) => b.id}
            vacio={<p className="text-texto-secundario">Todavía no se ha importado ningún barrido.</p>}
          />
        </Seccion>
      </div>
    </>
  );
}
