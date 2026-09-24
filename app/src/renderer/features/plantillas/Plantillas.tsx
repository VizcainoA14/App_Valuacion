/**
 * El hospital obtiene aquí los formatos que debe diligenciar, ya con sus propias
 * clases, sedes y servicios como listas desplegables. Son solo los cinco que se
 * vuelven a cargar en la aplicación (ADR-028).
 */
import { useState, type JSX } from 'react';
import { Download, FileSpreadsheet, FileText, PackageOpen, CheckCircle2 } from 'lucide-react';
import type { PlantillaDto } from '@compartido/dtos/plantillas';
import { cliente, useCanal } from '../../ipc/consultas';
import { Aviso, Boton, Cargando, Encabezado, Insignia, Seccion, cn } from '../../componentes/ui';
import { useParams } from 'react-router';

const NOMBRE_ETAPA: Record<PlantillaDto['etapa'], string> = {
  configurar: 'Configurar el proceso',
  inventario: 'Inventario (en cada barrido)',
};

const ORDEN_ETAPAS: PlantillaDto['etapa'][] = ['configurar', 'inventario'];

export function Plantillas(): JSX.Element {
  const plantillas = useCanal('plantilla:listar');
  // Dentro de un proceso, los formatos salen con sus catálogos; fuera, en blanco.
  const procesoId = useParams().procesoId ?? null;
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'peligro'; texto: string } | null>(null);

  const contexto = { procesoId };

  async function descargar(p: PlantillaDto): Promise<void> {
    setOcupado(p.codigo);
    setAviso(null);
    try {
      const r = await cliente().invocar('plantilla:descargar', { codigo: p.codigo, ...contexto });
      if (r !== null) {
        const conCatalogos = r.catalogosInyectados.length > 0 ? ` con sus ${r.catalogosInyectados.join(', ')} como listas desplegables` : '';
        setAviso({ tono: 'exito', texto: `${p.codigo} guardada en ${r.ruta}${conCatalogos}.` });
      }
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado(null);
    }
  }

  async function descargarEsenciales(codigos: string[]): Promise<void> {
    setOcupado('paquete');
    setAviso(null);
    try {
      const r = await cliente().invocar('plantilla:descargarPaquete', { codigos, ...contexto });
      if (r !== null) setAviso({ tono: 'exito', texto: `${r.entregadas.length} formatos guardados en ${r.carpeta}.` });
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado(null);
    }
  }

  if (plantillas.isPending) return <Cargando texto="Buscando los formatos…" />;
  if (plantillas.data === undefined) return <Aviso tono="peligro">{plantillas.error?.message ?? 'No se pudieron leer los formatos'}</Aviso>;

  const lista = plantillas.data;
  const esenciales = lista.filter((p) => p.seDiligencia && p.importable);
  const noDisponibles = lista.filter((p) => !p.disponible);

  return (
    <>
      <Encabezado
        titulo="Formatos para diligenciar"
        subtitulo="Descárguelos, diligéncielos en Excel y vuelva a cargarlos en la aplicación. Dentro de un proceso salen con sus clases, sedes y servicios ya cargados."
        acciones={
          <Boton variante="primario" icono={<PackageOpen className="h-4 w-4" aria-hidden />} cargando={ocupado === 'paquete'} onClick={() => void descargarEsenciales(esenciales.map((p) => p.codigo))}>
            Descargar los {esenciales.length} formatos indispensables
          </Boton>
        }
      />

      {aviso !== null && (
        <Aviso tono={aviso.tono} className="mb-4">
          {aviso.texto}
        </Aviso>
      )}
      {procesoId === null && (
        <Aviso tono="info" className="mb-4" titulo="Formatos en blanco">
          Se descargan sin listas desplegables. Para que salgan con las clases, sedes y servicios de un hospital, descárguelos desde dentro de su proceso.
        </Aviso>
      )}
      {noDisponibles.length > 0 && (
        <Aviso tono="peligro" className="mb-4" titulo="Faltan archivos de plantilla en la instalación">
          No se encontraron: {noDisponibles.map((p) => p.codigo).join(', ')}. Reinstale la aplicación.
        </Aviso>
      )}

      <div className="flex flex-col gap-5">
        {ORDEN_ETAPAS.map((etapa) => {
          const deLaEtapa = lista.filter((p) => p.etapa === etapa);
          if (deLaEtapa.length === 0) return null;
          return (
            <Seccion key={etapa} titulo={NOMBRE_ETAPA[etapa]} descripcion={etapa === 'inventario' ? 'PL-03 es el barrido: lo que se contó. PL-05 trae la fecha y el costo de cada bien, sin los que no se puede depreciar.' : undefined}>
              <ul className="flex flex-col divide-y divide-borde">
                {deLaEtapa.map((p) => (
                  <li key={p.codigo} className="flex items-start justify-between gap-4 py-2.5">
                    <div className="flex min-w-0 gap-3">
                      {p.formato === 'xlsx' ? <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-exito" aria-hidden /> : <FileText className="mt-0.5 h-5 w-5 shrink-0 text-acento" aria-hidden />}
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-texto">
                          <span className="font-mono text-sm text-texto-secundario">{p.codigo}</span>
                          {p.nombre}
                          {!p.seDiligencia && <Insignia tono="neutro">La genera la aplicación</Insignia>}
                          {p.importable && <Insignia tono="exito">Se puede volver a cargar</Insignia>}
                          {p.catalogosInyectados.length > 0 && <Insignia tono="info">Con sus {p.catalogosInyectados.join(', ')}</Insignia>}
                        </p>
                        <p className="text-sm text-texto-secundario">{p.proposito}</p>
                      </div>
                    </div>
                    <Boton
                      className={cn('shrink-0', !p.disponible && 'opacity-50')}
                      disabled={!p.disponible}
                      cargando={ocupado === p.codigo}
                      icono={<Download className="h-4 w-4" aria-hidden />}
                      onClick={() => void descargar(p)}
                    >
                      Descargar
                    </Boton>
                  </li>
                ))}
              </ul>
            </Seccion>
          );
        })}
      </div>

      <Seccion titulo="Cómo se diligencian" descripcion="Tres reglas que evitan casi todos los rechazos al importar.">
        <ul className="flex flex-col gap-2">
          {[
            'Los nombres de las columnas (fila 6) no se cambian: la aplicación los usa para reconocer el archivo.',
            'La fila de ejemplo en azul puede quedarse: la aplicación la reconoce por su color y no la importa.',
            'Un dato que no se tiene se deja en blanco. Nunca se escribe cero ni "NO REGISTRA": un costo en cero se interpreta como dato faltante (RN-03-02), no como bien gratuito.',
          ].map((texto) => (
            <li key={texto} className="flex gap-2 text-base text-texto">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-exito" aria-hidden />
              {texto}
            </li>
          ))}
        </ul>
      </Seccion>
    </>
  );
}
