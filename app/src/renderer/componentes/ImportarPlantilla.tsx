/**
 * RF-01-02 — Importación con validación previa (ANEXO_A §6.2): el main abre el
 * diálogo de archivo (P-1), muestra la previsualización con errores resaltados y
 * solo entonces confirma. Con errores no importa sin confirmación explícita.
 */
import { useState, type JSX } from 'react';
import { Upload } from 'lucide-react';
import type { InformeImportacion, PlantillaImportable } from '@compartido/dtos/importacion';
import { cliente, useMutacion, EFECTOS_PASO_01 } from '../ipc/consultas';
import type { Canal } from '@compartido/ipc/contrato';
import { Boton, Aviso, Casilla, Insignia, TablaSimple, cn } from './ui';
import { Dialogo } from './Dialogo/Dialogo';

const NOMBRE: Record<PlantillaImportable, string> = {
  'PL-01': 'PL-01 · Parámetros de la entidad',
  'PL-02': 'PL-02 · Clases de activo y vida útil',
  'PL-02b': 'PL-02b · Sedes y servicios',
  'PL-03': 'PL-03 · Toma de inventario físico',
  'PL-05': 'PL-05 · Hoja de vida y datos económicos',
};

export function ImportarPlantilla({
  entidadId,
  ejercicioId,
  plantilla,
  invalida,
  variante = 'normal',
}: {
  entidadId: string;
  /** Obligatorio para las plantillas que traen bienes (PL-03, PL-05). */
  ejercicioId?: string | null;
  plantilla: PlantillaImportable;
  invalida: readonly Canal[];
  variante?: 'normal' | 'primario';
}): JSX.Element {
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const confirmar = useMutacion('importacion:confirmar', [...invalida, ...EFECTOS_PASO_01]);

  async function previsualizar(): Promise<void> {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const r = await cliente().invocar('importacion:previsualizar', { entidadId, plantilla, ejercicioId: ejercicioId ?? null });
      if (r !== null) setInforme(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  async function ejecutar(conErrores: boolean): Promise<void> {
    if (informe === null) return;
    try {
      const r = await confirmar.mutateAsync({ token: informe.token, aceptarConErrores: conErrores });
      setResultado(`${r.creados} creados, ${r.actualizados} actualizados, ${r.omitidos} omitidos. Copia guardada en ${r.archivoConservado}.`);
      setInforme(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <Boton variante={variante === 'primario' ? 'primario' : 'secundario'} icono={<Upload className="h-4 w-4" aria-hidden />} cargando={cargando} onClick={() => void previsualizar()}>
        Importar {plantilla}
      </Boton>
      {error !== null && (
        <Aviso tono="peligro" className="mt-2">
          {error}
        </Aviso>
      )}
      {resultado !== null && (
        <Aviso tono="exito" titulo={`${plantilla} importada`} className="mt-2">
          {resultado}
        </Aviso>
      )}
      <InformeImportacionDialogo
        informe={informe}
        plantilla={plantilla}
        onCerrar={() => setInforme(null)}
        confirmando={confirmar.isPending}
        onConfirmar={(conErrores) => void ejecutar(conErrores)}
      />
    </>
  );
}

/**
 * El diálogo de previsualización, aparte del botón: la pantalla de nueva entidad
 * lo usa sin botón propio, porque allí la importación es una de dos vías para
 * crear la entidad, no una acción sobre una que ya existe.
 */
export function InformeImportacionDialogo({
  informe,
  plantilla,
  onCerrar,
  onConfirmar,
  confirmando,
}: {
  informe: InformeImportacion | null;
  plantilla: PlantillaImportable;
  onCerrar: () => void;
  onConfirmar: (aceptarConErrores: boolean) => void;
  confirmando: boolean;
}): JSX.Element {
  const [soloValidas, setSoloValidas] = useState(false);
  return (
    <Dialogo
      abierto={informe !== null}
      onCambioAbierto={(abierto) => {
        if (!abierto) onCerrar();
      }}
      titulo={`Previsualización · ${NOMBRE[plantilla]}`}
      descripcion={informe === null ? undefined : `${informe.archivo} · ${informe.errores} error(es) · ${informe.advertencias} advertencia(s)`}
      ancho="xl"
      pie={
        informe === null ? undefined : (
          <>
            {!informe.importable && <Casilla etiqueta="Importar solo las filas válidas y omitir las que tienen error" checked={soloValidas} onChange={(e) => setSoloValidas(e.target.checked)} />}
            <Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" cargando={confirmando} disabled={!informe.importable && !soloValidas} onClick={() => onConfirmar(soloValidas)}>
              Confirmar importación
            </Boton>
          </>
        )
      }
    >
      {informe !== null && <CuerpoInforme informe={informe} />}
    </Dialogo>
  );
}

function CuerpoInforme({ informe }: { informe: InformeImportacion }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {informe.errores > 0 ? (
        <Aviso tono="peligro" titulo="El archivo tiene filas con error">
          Corríjalas en Excel y vuelva a importar, o confirme importar solo las válidas (ANEXO_A §3.3: nunca se importa parcialmente sin confirmación explícita).
        </Aviso>
      ) : (
        <Aviso tono="exito" titulo="Sin errores">
          Revise la vista previa y confirme.
        </Aviso>
      )}

      <section>
        <h3 className="mb-1 text-sm font-semibold text-texto">Resumen por hoja</h3>
        <TablaSimple
          columnas={[
            { clave: 'hoja', titulo: 'Hoja', celda: (h) => h.hoja },
            { clave: 'enc', titulo: 'Fila de encabezados', celda: (h) => h.filaEncabezados || '—', alineacion: 'derecha' },
            { clave: 'leidas', titulo: 'Leídas', celda: (h) => h.filasLeidas, alineacion: 'derecha' },
            { clave: 'validas', titulo: 'Válidas', celda: (h) => h.filasValidas, alineacion: 'derecha' },
            { clave: 'error', titulo: 'Con error', celda: (h) => <span className={cn(h.filasConError > 0 && 'font-semibold text-peligro')}>{h.filasConError}</span>, alineacion: 'derecha' },
            { clave: 'ejemplo', titulo: 'Ejemplo omitidas', celda: (h) => h.filasEjemploOmitidas, alineacion: 'derecha' },
          ]}
          filas={informe.hojas}
          claveFila={(h) => h.hoja}
          vacio={<p className="text-texto-secundario">Sin hojas reconocidas.</p>}
        />
      </section>

      {informe.incidencias.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-texto">Incidencias fila por fila</h3>
          <TablaSimple
            columnas={[
              { clave: 'sev', titulo: 'Tipo', celda: (i) => <Insignia tono={i.severidad === 'ERROR' ? 'peligro' : 'aviso'}>{i.severidad === 'ERROR' ? 'Error' : 'Aviso'}</Insignia>, ancho: '90px' },
              { clave: 'hoja', titulo: 'Hoja', celda: (i) => i.hoja },
              { clave: 'fila', titulo: 'Fila', celda: (i) => i.fila || '—', alineacion: 'derecha', ancho: '70px' },
              { clave: 'col', titulo: 'Columna', celda: (i) => i.columna ?? '—' },
              { clave: 'valor', titulo: 'Valor recibido', celda: (i) => <span className="font-mono text-sm">{i.valorRecibido ?? '∅'}</span> },
              { clave: 'motivo', titulo: 'Motivo', celda: (i) => i.motivo },
            ]}
            filas={informe.incidencias}
            claveFila={(i, ) => `${i.hoja}-${i.fila}-${i.columna ?? ''}-${i.motivo}`}
            vacio={null}
          />
        </section>
      )}

      {informe.normalizaciones.length > 0 && (
        <details className="rounded-md border border-borde bg-superficie px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-texto">Normalizaciones aplicadas ({informe.normalizaciones.length}) — qué se interpretó y cómo</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-texto-secundario">
            {informe.normalizaciones.slice(0, 200).map((n, i) => (
              <li key={i}>
                {n.hoja} fila {n.fila} · {n.columna}: <span className="font-mono">{n.recibido}</span> → <span className="font-mono">{n.interpretado}</span> <span className="italic">({n.regla})</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {Object.entries(informe.vistaPrevia).map(([hoja, filas]) => (
        <section key={hoja}>
          <h3 className="mb-1 text-sm font-semibold text-texto">Vista previa · {hoja}</h3>
          {filas.length === 0 ? (
            <p className="text-texto-secundario">Sin filas válidas.</p>
          ) : (
            <div className="max-h-64 overflow-auto rounded-md border border-borde">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-superficie text-left text-texto-secundario">
                  <tr>
                    {Object.keys(filas[0] ?? {}).map((c) => (
                      <th key={c} scope="col" className="px-2 py-1 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} className="border-t border-borde">
                      {Object.values(f).map((v, j) => (
                        <td key={j} className="px-2 py-1 font-mono">
                          {v === null ? '∅' : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
