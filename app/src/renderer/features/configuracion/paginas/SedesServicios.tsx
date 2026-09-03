/**
 * Pantalla 3 — Árbol de sedes y servicios (IN-01-02, IN-01-03). Primero sedes,
 * luego servicios (procedimiento §6.3). El arrastrar y soltar del plan queda para
 * cuando exista un volumen que lo justifique; hoy se edita en su sitio.
 */
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, MapPin, Stethoscope } from 'lucide-react';
import { camposSede, camposServicio } from '@compartido/ipc/contrato';
import { TIPO_SERVICIO } from '@compartido/enums/plataforma';
import type { SedeDto, ServicioDto } from '@compartido/dtos/configuracion';
import { useCanal, useMutacion, EFECTOS_PASO_01 } from '../../../ipc/consultas';
import { Aviso, Boton, Campo, Cargando, Casilla, Encabezado, EstadoVacio, Insignia, Seccion, Selector } from '../../../componentes/ui';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { useEntidadId, mensajeError } from '../hooks';

const INVALIDA = ['sede:listar', 'servicio:listar', ...EFECTOS_PASO_01] as const;

const esquemaSede = z.object({ ...camposSede, activa: z.boolean().default(true) });
const esquemaServicio = z.object({ ...camposServicio, activo: z.boolean().default(true) });

export function SedesServicios(): JSX.Element {
  const entidadId = useEntidadId();
  const sedes = useCanal('sede:listar', { entidadId, incluirInactivas: true });
  const servicios = useCanal('servicio:listar', { entidadId, incluirInactivos: true });
  const [nuevaSede, setNuevaSede] = useState(false);

  if (sedes.isPending || servicios.isPending) return <Cargando />;
  if (sedes.isError) return <Aviso tono="peligro">{sedes.error.message}</Aviso>;

  const lista = sedes.data ?? [];
  const porSede = new Map<string, ServicioDto[]>();
  for (const s of servicios.data ?? []) porSede.set(s.sedeId, [...(porSede.get(s.sedeId) ?? []), s]);

  return (
    <>
      <Encabezado
        titulo="Sedes y servicios"
        subtitulo="Estructura organizacional: cada bien se ubica en una sede y un servicio."
        acciones={
          <>
            <ImportarPlantilla entidadId={entidadId} plantilla="PL-02b" invalida={['sede:listar', 'servicio:listar']} />
            <Boton variante="primario" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setNuevaSede(true)}>
              Nueva sede
            </Boton>
          </>
        }
      />
      {nuevaSede && (
        <Seccion titulo="Nueva sede">
          <FormularioSede entidadId={entidadId} onListo={() => setNuevaSede(false)} />
        </Seccion>
      )}
      {lista.length === 0 && !nuevaSede && (
        <EstadoVacio titulo="Sin sedes" descripcion="Cree la sede principal o importe PL-02b (Recursos Físicos la diligencia)." accion={<Boton variante="primario" onClick={() => setNuevaSede(true)}>Crear sede</Boton>} />
      )}
      <div className="flex flex-col gap-4">
        {lista.map((sede) => (
          <TarjetaSede key={sede.id} sede={sede} servicios={porSede.get(sede.id) ?? []} />
        ))}
      </div>
    </>
  );
}

function FormularioSede({ entidadId, onListo }: { entidadId: string; onListo: () => void }): JSX.Element {
  const crear = useMutacion('sede:crear', [...INVALIDA]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof esquemaSede>, unknown, z.output<typeof esquemaSede>>({ resolver: zodResolver(esquemaSede), defaultValues: { activa: true } });
  return (
    <form noValidate onSubmit={handleSubmit((v) => crear.mutate({ entidadId, ...v }, { onSuccess: onListo }))} className="flex flex-col gap-3">
      {crear.isError && <Aviso tono="peligro">{mensajeError(crear.error)}</Aviso>}
      <div className="grid gap-3 md:grid-cols-4">
        <Campo etiqueta="Código" obligatorio ayuda="Corto y único, p. ej. 01" error={errors.codigo?.message} {...register('codigo')} />
        <div className="md:col-span-3">
          <Campo etiqueta="Nombre" obligatorio error={errors.nombre?.message} {...register('nombre')} />
        </div>
        <div className="md:col-span-2">
          <Campo etiqueta="Dirección" obligatorio error={errors.direccion?.message} {...register('direccion')} />
        </div>
        <div className="md:col-span-2">
          <Campo etiqueta="Municipio" obligatorio error={errors.municipio?.message} {...register('municipio')} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Boton onClick={onListo}>Cancelar</Boton>
        <Boton type="submit" variante="primario" cargando={crear.isPending}>
          Guardar sede
        </Boton>
      </div>
    </form>
  );
}

function TarjetaSede({ sede, servicios }: { sede: SedeDto; servicios: ServicioDto[] }): JSX.Element {
  const [nuevo, setNuevo] = useState(false);
  const actualizarSede = useMutacion('sede:actualizar', [...INVALIDA]);
  const actualizarServicio = useMutacion('servicio:actualizar', [...INVALIDA]);
  return (
    <section aria-labelledby={`sede-${sede.id}`} className="rounded-lg border border-borde bg-elevada">
      <header className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-acento" aria-hidden />
          <h2 id={`sede-${sede.id}`} className="text-md font-semibold text-texto">
            <span className="mr-2 font-mono text-sm text-texto-secundario">{sede.codigo}</span>
            {sede.nombre}
          </h2>
          {!sede.activa && <Insignia tono="neutro">Inactiva</Insignia>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-texto-secundario">
            {sede.direccion} · {sede.municipio}
          </span>
          <Casilla etiqueta="Activa" checked={sede.activa} onChange={(e) => actualizarSede.mutate({ id: sede.id, cambios: { activa: e.target.checked } })} />
          <Boton variante="sutil" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setNuevo(true)}>
            Servicio
          </Boton>
        </div>
      </header>
      <div className="px-4 py-3">
        {nuevo && <FormularioServicio sedeId={sede.id} onListo={() => setNuevo(false)} />}
        {servicios.length === 0 && !nuevo ? (
          <p className="text-sm text-texto-secundario">Sin servicios. Cada bien necesita un servicio de ubicación (VAL-01-03).</p>
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {servicios.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-texto-secundario" aria-hidden />
                  <span className="font-mono text-sm text-texto-secundario">{s.codigo}</span>
                  <span className="text-texto">{s.nombre}</span>
                  <Insignia tono="neutro">{TIPO_SERVICIO.etiqueta(s.tipo)}</Insignia>
                  {s.responsable !== null && <span className="text-sm text-texto-secundario">· {s.responsable}</span>}
                </span>
                <Casilla etiqueta="Activo" checked={s.activo} onChange={(e) => actualizarServicio.mutate({ id: s.id, cambios: { activo: e.target.checked } })} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FormularioServicio({ sedeId, onListo }: { sedeId: string; onListo: () => void }): JSX.Element {
  const crear = useMutacion('servicio:crear', [...INVALIDA]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof esquemaServicio>, unknown, z.output<typeof esquemaServicio>>({ resolver: zodResolver(esquemaServicio), defaultValues: { tipo: 'asistencial', activo: true } });
  return (
    <form noValidate onSubmit={handleSubmit((v) => crear.mutate({ sedeId, ...v }, { onSuccess: onListo }))} className="mb-3 flex flex-col gap-3 rounded-md border border-borde bg-superficie p-3">
      {crear.isError && <Aviso tono="peligro">{mensajeError(crear.error)}</Aviso>}
      <div className="grid gap-3 md:grid-cols-4">
        <Campo etiqueta="Código" obligatorio error={errors.codigo?.message} {...register('codigo')} />
        <Campo etiqueta="Nombre" obligatorio error={errors.nombre?.message} {...register('nombre')} />
        <Selector etiqueta="Tipo" obligatorio opciones={TIPO_SERVICIO.valores.map((v) => ({ valor: v, etiqueta: TIPO_SERVICIO.etiqueta(v) }))} error={errors.tipo?.message} {...register('tipo')} />
        <Campo etiqueta="Responsable" ayuda="Jefe del servicio (custodia)" error={errors.responsable?.message} {...register('responsable')} />
      </div>
      <div className="flex justify-end gap-2">
        <Boton onClick={onListo}>Cancelar</Boton>
        <Boton type="submit" variante="primario" cargando={crear.isPending}>
          Guardar servicio
        </Boton>
      </div>
    </form>
  );
}
