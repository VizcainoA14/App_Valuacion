/**
 * Pantalla 5 — Panel del ejercicio: semáforo de validaciones bloqueantes (RF-01-06),
 * creación del ejercicio con parámetros congelados (RF-01-05).
 */
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, Plus, Snowflake } from 'lucide-react';
import { zFechaIso, zTexto, zTextoNulable } from '@compartido/esquemas/basicos';
import { ESTADO_EJERCICIO } from '@compartido/enums/estados';
import { useMutacion, EFECTOS_PASO_01 } from '../../../ipc/consultas';
import { useEstadoInterfaz } from '../../../app/estado';
import { PanelValidaciones } from '../../../componentes/PanelValidaciones/PanelValidaciones';
import { Aviso, Boton, Campo, Cargando, Encabezado, EstadoVacio, Insignia, Seccion, TablaSimple, AreaTexto } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { formatearFecha, formatearMarcaTiempo } from '../../../formato';
import { useEntidadId, useEjercicioVigente, useValidaciones, mensajeError } from '../hooks';

const esquemaEjercicio = z.object({ nombre: zTexto(150), fechaCorte: zFechaIso, contratoNumero: zTextoNulable(50) });
const esquemaFecha = z.object({ fechaCorte: zFechaIso, justificacion: zTexto(500) });

export function PanelEjercicio(): JSX.Element {
  const entidadId = useEntidadId();
  const { data: ejercicios, isPending, vigente } = useEjercicioVigente(entidadId);
  const validaciones = useValidaciones(1, entidadId, vigente?.id ?? null);
  const fijarEjercicioActivo = useEstadoInterfaz((s) => s.fijarEjercicioActivo);
  const navegar = useNavigate();
  const [creando, setCreando] = useState(false);
  const [avisoAvance, setAvisoAvance] = useState(false);

  if (isPending || validaciones.isPending) return <Cargando />;

  return (
    <>
      <Encabezado
        titulo="Ejercicio de valuación"
        subtitulo="EN-01-04 · El ejercicio nace en estado ABIERTO con una copia congelada de los parámetros (RN-01-01)."
        acciones={
          <Boton variante="primario" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setCreando(true)}>
            Nuevo ejercicio
          </Boton>
        }
      />
      <div className="flex flex-col gap-5">
        {avisoAvance && (
          <Aviso tono="aviso" titulo="Todavía no hay ejercicio">
            Cree el ejercicio con la fecha de corte acordada para poder avanzar al paso 02.
          </Aviso>
        )}
        {validaciones.data !== undefined && (
          <PanelValidaciones
            resultado={validaciones.data}
            textoAvanzar="Avanzar al paso 02"
            onAvanzar={() => {
              if (vigente === null) {
                setAvisoAvance(true);
                return;
              }
              fijarEjercicioActivo(vigente.id);
              void navegar(`/entidad/${entidadId}/ejercicio/${vigente.id}/paso/02`);
            }}
          />
        )}

        <Seccion titulo="Ejercicios de la entidad" descripcion="El más reciente es el vigente para las validaciones del paso 01.">
          <TablaSimple
            columnas={[
              { clave: 'nombre', titulo: 'Ejercicio', celda: (e) => <span className="font-medium">{e.nombre}</span> },
              { clave: 'corte', titulo: 'Fecha de corte', celda: (e) => <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-texto-secundario" aria-hidden />{formatearFecha(e.fechaCorte)}</span> },
              { clave: 'estado', titulo: 'Estado', celda: (e) => <Insignia tono={e.estado === 'CERRADO' ? 'neutro' : 'info'}>{ESTADO_EJERCICIO.etiqueta(e.estado)}</Insignia> },
              { clave: 'metodo', titulo: 'Parámetros congelados', celda: (e) => <span className="flex items-center gap-1.5 text-sm"><Snowflake className="h-4 w-4 text-acento" aria-hidden />{e.parametrosCongelados.metodo_conteo_meses}{e.parametrosCongelados.metodo_conteo_meses_confirmado ? ' (confirmado)' : ' (sin confirmar)'}</span> },
              { clave: 'contrato', titulo: 'Contrato', celda: (e) => e.contratoNumero ?? '—' },
              { clave: 'creado', titulo: 'Creado', celda: (e) => formatearMarcaTiempo(e.creadoEn) },
              { clave: 'acc', titulo: '', celda: (e) => (e.estado === 'CERRADO' ? null : <CambiarFechaCorte ejercicioId={e.id} fechaActual={e.fechaCorte} />) },
            ]}
            filas={ejercicios ?? []}
            claveFila={(e) => e.id}
            vacio={<EstadoVacio titulo="Sin ejercicios" descripcion="Cree el ejercicio con la fecha de corte acordada (IN-01-08). Sin él, VAL-01-06 queda pendiente." accion={<Boton variante="primario" onClick={() => setCreando(true)}>Crear ejercicio</Boton>} />}
          />
        </Seccion>

      </div>
      <DialogoNuevoEjercicio entidadId={entidadId} abierto={creando} onCerrar={() => setCreando(false)} />
    </>
  );
}

function DialogoNuevoEjercicio({ entidadId, abierto, onCerrar }: { entidadId: string; abierto: boolean; onCerrar: () => void }): JSX.Element {
  const crear = useMutacion('ejercicio:crear', [...EFECTOS_PASO_01]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof esquemaEjercicio>, unknown, z.output<typeof esquemaEjercicio>>({ resolver: zodResolver(esquemaEjercicio) });
  return (
    <Dialogo abierto={abierto} onCambioAbierto={(a) => { if (!a) onCerrar(); }} titulo="Nuevo ejercicio de valuación" descripcion="Se congela una copia de los parámetros vigentes. Lo firma el Gerente registrado en los datos de la entidad.">
      <form noValidate onSubmit={handleSubmit((v) => crear.mutate({ entidadId, ...v }, { onSuccess: onCerrar }))} className="flex flex-col gap-3">
        {crear.isError && <Aviso tono="peligro">{mensajeError(crear.error)}</Aviso>}
        <Campo etiqueta="Nombre" obligatorio ayuda='P. ej. "Valuación corte junio 2026"' error={errors.nombre?.message} {...register('nombre')} />
        <Campo etiqueta="Fecha de corte" type="date" obligatorio ayuda="Parámetro central de todos los cálculos (IN-01-08). No puede ser futura." error={errors.fechaCorte?.message} {...register('fechaCorte')} />
        <Campo etiqueta="Número de contrato" error={errors.contratoNumero?.message} {...register('contratoNumero')} />
        <div className="flex justify-end gap-2">
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" variante="primario" cargando={crear.isPending}>
            Crear ejercicio
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}

function CambiarFechaCorte({ ejercicioId, fechaActual }: { ejercicioId: string; fechaActual: string }): JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const cambiar = useMutacion('ejercicio:cambiarFechaCorte', [...EFECTOS_PASO_01]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof esquemaFecha>, unknown, z.output<typeof esquemaFecha>>({ resolver: zodResolver(esquemaFecha), defaultValues: { fechaCorte: fechaActual } });
  return (
    <>
      <Boton variante="sutil" onClick={() => setAbierto(true)}>
        Cambiar corte
      </Boton>
      <Dialogo abierto={abierto} onCambioAbierto={setAbierto} titulo="Cambiar la fecha de corte" descripcion="RN-01-06: obliga a recalcular todo el ejercicio y exige justificación (campo sensible, ANEXO_B §7.1).">
        <form noValidate onSubmit={handleSubmit((v) => cambiar.mutate({ id: ejercicioId, ...v }, { onSuccess: () => setAbierto(false) }))} className="flex flex-col gap-3">
          {cambiar.isError && <Aviso tono="peligro">{mensajeError(cambiar.error)}</Aviso>}
          <Campo etiqueta="Nueva fecha de corte" type="date" obligatorio error={errors.fechaCorte?.message} {...register('fechaCorte')} />
          <AreaTexto etiqueta="Justificación" obligatorio error={errors.justificacion?.message} {...register('justificacion')} />
          <div className="flex justify-end gap-2">
            <Boton onClick={() => setAbierto(false)}>Cancelar</Boton>
            <Boton type="submit" variante="primario" cargando={cambiar.isPending}>
              Cambiar fecha
            </Boton>
          </div>
        </form>
      </Dialogo>
    </>
  );
}

