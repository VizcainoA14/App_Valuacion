/**
 * Pantalla inicial (ADR-029): lo primero que se ve es el proceso. Iniciar uno
 * nuevo, continuar uno en curso o consultar uno finalizado. Cada proceso es
 * independiente: su hospital, su inventario, su cálculo y su informe.
 */
import { useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, ChevronRight, FlaskConical, Trash2, PlayCircle, Lock } from 'lucide-react';
import type { ProcesoDto } from '@compartido/dtos/configuracion';
import { useCanal, useMutacion } from '../../../ipc/consultas';
import { AreaTexto, Boton, Cargando, Encabezado, EstadoVacio, Aviso, Insignia, Seccion } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearFecha } from '../../../formato';
import { mensajeError } from '../hooks';

export function SelectorProceso(): JSX.Element {
  const procesos = useCanal('proceso:listar');
  const navegar = useNavigate();
  const cargarDemo = useMutacion('demo:cargar', ['proceso:listar']);
  const hayDemo = procesos.data?.some((p) => p.esDemostracion) === true;
  const [aEliminar, setAEliminar] = useState<ProcesoDto | null>(null);

  const enCurso = (procesos.data ?? []).filter((p) => p.estado === 'EN_CURSO');
  const finalizados = (procesos.data ?? []).filter((p) => p.estado === 'FINALIZADO');

  return (
    <>
      <Encabezado
        titulo="Procesos de valuación"
        subtitulo="Cada proceso es una valuación completa y aparte: los datos del hospital, el inventario que se cargue, el cálculo a su fecha de corte y el informe."
        acciones={
          <>
            {!hayDemo && (
              <Boton icono={<FlaskConical className="h-4 w-4" aria-hidden />} cargando={cargarDemo.isPending} onClick={() => cargarDemo.mutate(undefined)} title="Proceso ficticio con 50 bienes para capacitación; se borra de un clic">
                Cargar proceso de demostración
              </Boton>
            )}
            <Boton variante="primario" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => void navegar('/nuevo-proceso')}>
              Iniciar un proceso nuevo
            </Boton>
          </>
        }
      />
      {cargarDemo.isError && (
        <Aviso tono="peligro" className="mb-4">
          {mensajeError(cargarDemo.error)}
        </Aviso>
      )}
      {procesos.isPending && <Cargando texto="Cargando procesos…" />}
      {procesos.isError && <Aviso tono="peligro">{procesos.error.message}</Aviso>}
      {procesos.data !== undefined && procesos.data.length === 0 && (
        <EstadoVacio
          titulo="Todavía no hay ningún proceso"
          descripcion="Un proceso empieza con los datos del hospital y la fecha de corte; después se configuran las clases de activo, se carga el inventario y se calcula."
          accion={
            <Boton variante="primario" onClick={() => void navegar('/nuevo-proceso')}>
              Iniciar el primer proceso
            </Boton>
          }
        />
      )}

      {procesos.data !== undefined && procesos.data.length > 0 && (
        <div className="flex flex-col gap-5">
          <Seccion titulo="Continuar un proceso en curso" descripcion="Se puede corregir todo: configuración, inventario, cálculo y bajas. Termina cuando usted lo finaliza.">
            {enCurso.length === 0 ? (
              <p className="text-texto-secundario">No hay procesos en curso. Inicie uno nuevo con el botón de arriba.</p>
            ) : (
              <ListaProcesos procesos={enCurso} onEliminar={setAEliminar} />
            )}
          </Seccion>
          {finalizados.length > 0 && (
            <Seccion titulo="Procesos finalizados" descripcion="De solo lectura: se consultan y se puede volver a sacar su informe.">
              <ListaProcesos procesos={finalizados} onEliminar={setAEliminar} />
            </Seccion>
          )}
        </div>
      )}

      {aEliminar !== null && <DialogoEliminar proceso={aEliminar} onCerrar={() => setAEliminar(null)} />}
    </>
  );
}

function ListaProcesos({ procesos, onEliminar }: { procesos: readonly ProcesoDto[]; onEliminar: (p: ProcesoDto) => void }): JSX.Element {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {procesos.map((p) => {
        const finalizado = p.estado === 'FINALIZADO';
        const Icono = finalizado ? Lock : PlayCircle;
        return (
          <li key={p.id} className="relative">
            <Link to={`/proceso/${p.id}`} className="flex items-center gap-3 rounded-lg border border-borde bg-elevada px-4 py-3 pr-12 hover:border-acento">
              <Icono className={finalizado ? 'h-6 w-6 shrink-0 text-texto-secundario' : 'h-6 w-6 shrink-0 text-acento'} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-texto">{p.nombre}</span>
                <span className="block truncate text-sm text-texto-secundario">
                  {p.razonSocial} · NIT {p.nit}
                </span>
                <span className="block text-sm text-texto-secundario">
                  Corte al {formatearFecha(p.fechaCorte)}
                  {finalizado && p.finalizadoEn !== null ? ` · finalizado el ${formatearFecha(p.finalizadoEn.slice(0, 10))}` : ''}
                </span>
              </span>
              {p.esDemostracion && <Insignia tono="aviso">Demostración</Insignia>}
              <ChevronRight className="h-4 w-4 shrink-0 text-texto-secundario" aria-hidden />
            </Link>
            {/* Fuera del enlace: pulsar "eliminar" no puede ser también "entrar". */}
            {!p.esDemostracion && !finalizado && (
              <button
                type="button"
                aria-label={`Eliminar ${p.nombre}`}
                title="Eliminar este proceso"
                onClick={() => onEliminar(p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-texto-secundario hover:bg-peligro/10 hover:text-peligro"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Eliminar un proceso en curso —el que se inició por error— es irreversible:
 * exige escribir el motivo, que queda en la bitácora. Solo se puede mientras no
 * tenga inventario (un bien nunca se elimina, RN-09-09); si ya lo tiene, el
 * main lo explica y aquí se muestra tal cual. Uno finalizado no se elimina, y
 * por eso ni siquiera se ofrece.
 */
function DialogoEliminar({ proceso, onCerrar }: { proceso: ProcesoDto; onCerrar: () => void }): JSX.Element {
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const eliminar = useMutacion('proceso:eliminar', ['proceso:listar']);

  return (
    <Dialogo
      abierto
      onCambioAbierto={(a) => {
        if (!a) onCerrar();
      }}
      titulo={`¿Eliminar «${proceso.nombre}»?`}
      descripcion="Se borra el proceso con su configuración. Los demás procesos no se tocan. No se puede deshacer."
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton
            variante="peligro"
            cargando={eliminar.isPending}
            disabled={justificacion.trim().length < 5}
            onClick={() => {
              setError(null);
              eliminar.mutate({ id: proceso.id, justificacion }, { onSuccess: onCerrar, onError: (e) => setError(mensajeError(e)) });
            }}
          >
            Sí, eliminar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error !== null && (
          <Aviso tono="peligro" titulo="No se eliminó">
            {error}
          </Aviso>
        )}
        <Aviso tono="info">
          Solo se puede eliminar mientras <strong>no tenga inventario</strong>: un bien cargado nunca se borra (RN-09-09).
        </Aviso>
        <AreaTexto
          etiqueta="Motivo"
          obligatorio
          ayuda="Queda en la bitácora. Por ejemplo: “iniciado con la fecha de corte equivocada” o “duplicado por error”."
          value={justificacion}
          onChange={(ev) => setJustificacion(ev.target.value)}
          placeholder="Proceso iniciado por error durante una prueba."
        />
      </div>
    </Dialogo>
  );
}
