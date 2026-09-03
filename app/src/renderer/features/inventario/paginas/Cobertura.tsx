/** RF-02-08 — Tablero de avance de cobertura por sede y servicio (alimenta VAL-02-05). */
import type { JSX } from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Cargando, Encabezado, Insignia, Seccion, TablaSimple, Aviso } from '../../../componentes/ui';
import { formatearEntero } from '../../../formato';
import { useContextoEjercicio, useCobertura } from '../hooks';

export function Cobertura(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const cobertura = useCobertura(entidadId, ejercicioId);

  if (cobertura.isPending) return <Cargando />;
  if (cobertura.data === undefined) return <Aviso tono="peligro">{cobertura.error?.message ?? 'Sin datos'}</Aviso>;
  const { servicios, serviciosActivos, serviciosRecorridos, totalBienes } = cobertura.data;
  const porcentaje = serviciosActivos === 0 ? 0 : Math.round((serviciosRecorridos / serviciosActivos) * 100);

  return (
    <>
      <Encabezado titulo="Cobertura del inventario" subtitulo="VAL-02-05 exige el 100 % de los servicios activos recorridos: con bienes registrados o con acta de custodia." />
      <Seccion titulo={`${porcentaje} % de cobertura`} descripcion={`${serviciosRecorridos} de ${serviciosActivos} servicios activos · ${formatearEntero(totalBienes)} bienes registrados`}>
        <div className="mb-4 h-2 w-full overflow-hidden rounded bg-borde" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Cobertura de servicios">
          <div className={porcentaje === 100 ? 'h-full bg-exito' : 'h-full bg-acento'} style={{ width: `${porcentaje}%` }} />
        </div>
        <TablaSimple
          columnas={[
            { clave: 'sede', titulo: 'Sede', celda: (s) => `${s.sedeCodigo} · ${s.sedeNombre}` },
            { clave: 'servicio', titulo: 'Servicio', celda: (s) => `${s.servicioCodigo} · ${s.servicioNombre}` },
            { clave: 'bienes', titulo: 'Bienes', alineacion: 'derecha', celda: (s) => formatearEntero(s.bienes) },
            { clave: 'acta', titulo: 'Acta de custodia', celda: (s) => (s.conActa ? 'Sí' : '—') },
            {
              clave: 'estado',
              titulo: 'Estado',
              celda: (s) =>
                s.recorrido ? (
                  <span className="flex items-center gap-1.5 text-exito">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Recorrido
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-aviso">
                    <CircleDashed className="h-4 w-4" aria-hidden />
                    Pendiente
                  </span>
                ),
            },
          ]}
          filas={servicios}
          claveFila={(s) => s.servicioId}
          vacio={<Insignia tono="aviso">No hay servicios activos en la entidad</Insignia>}
        />
      </Seccion>
    </>
  );
}
