/** Pantalla 2 — Catálogo de clases de activo y vida útil: la tabla más importante de la parametrización. */
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Sparkles } from 'lucide-react';
import { camposClase } from '@compartido/ipc/contrato';
import { PERFIL_RESPONSABLE } from '@compartido/enums/plataforma';
import type { ClaseActivoDto } from '@compartido/dtos/configuracion';
import { useCanal, useMutacion, EFECTOS_PASO_01 } from '../../../ipc/consultas';
import { Aviso, Boton, Campo, Cargando, Casilla, Encabezado, EstadoVacio, Insignia, Selector, TablaSimple, AreaTexto } from '../../../componentes/ui';
import { Dialogo } from '../../../componentes/Dialogo/Dialogo';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { formatearDecimal, formatearEntero } from '../../../formato';
import { useEntidadId, mensajeError } from '../hooks';

const INVALIDA = ['clase:listar', ...EFECTOS_PASO_01] as const;

const esquema = z.object({
  ...camposClase,
  activo: z.boolean().default(true),
  vidaUtilContableMeses: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), camposClase.vidaUtilContableMeses),
  vidaUtilTecnicaAnios: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.'))), camposClase.vidaUtilTecnicaAnios),
  justificacion: z.string().trim().max(500).optional(),
});
type Valores = z.input<typeof esquema>;
type Validados = z.output<typeof esquema>;

export function CatalogoClases(): JSX.Element {
  const entidadId = useEntidadId();
  const clases = useCanal('clase:listar', { entidadId, incluirInactivas: true });
  const precargar = useMutacion('clase:precargarSugeridas', [...INVALIDA]);
  const [editando, setEditando] = useState<ClaseActivoDto | 'nueva' | null>(null);

  if (clases.isPending) return <Cargando />;
  if (clases.isError) return <Aviso tono="peligro">{clases.error.message}</Aviso>;
  const lista = clases.data ?? [];

  return (
    <>
      <Encabezado
        titulo="Clases de activo y vida útil"
        subtitulo="RN-01-03: la vida útil contable (depreciación) y la técnica (obsolescencia) son independientes. Se validan contra el Manual de Políticas Contables."
        acciones={
          <>
            <ImportarPlantilla entidadId={entidadId} plantilla="PL-02" invalida={['clase:listar']} />
            <Boton icono={<Sparkles className="h-4 w-4" aria-hidden />} cargando={precargar.isPending} onClick={() => precargar.mutate({ entidadId })}>
              Precargar sugeridas
            </Boton>
            <Boton variante="primario" icono={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEditando('nueva')}>
              Nueva clase
            </Boton>
          </>
        }
      />
      {precargar.isSuccess && (
        <Aviso tono="exito" className="mb-4">
          Catálogo sugerido: {precargar.data.creadas} clases creadas, {precargar.data.omitidas} ya existían.
        </Aviso>
      )}
      <TablaSimple
        columnas={[
          { clave: 'codigo', titulo: 'Código', celda: (c) => <span className="font-mono">{c.codigo}</span>, ancho: '90px' },
          { clave: 'nombre', titulo: 'Clase', celda: (c) => <span className="flex items-center gap-2">{c.nombre}{!c.activo && <Insignia tono="neutro">Inactiva</Insignia>}</span> },
          { clave: 'sub', titulo: 'Subcuenta', celda: (c) => <span className="font-mono">{c.subcuentaContable}</span> },
          { clave: 'vuc', titulo: 'V. útil contable (meses)', celda: (c) => (c.esDepreciable ? formatearEntero(c.vidaUtilContableMeses) : <Insignia tono="neutro">No deprecia</Insignia>), alineacion: 'derecha' },
          { clave: 'vut', titulo: 'V. útil técnica (años)', celda: (c) => formatearDecimal(c.vidaUtilTecnicaAnios), alineacion: 'derecha' },
          { clave: 'hv', titulo: 'Hoja de vida', celda: (c) => (c.requiereHojaVida ? 'Sí' : 'No') },
          { clave: 'invima', titulo: 'INVIMA', celda: (c) => (c.requiereInvima ? 'Sí' : 'No') },
          { clave: 'resp', titulo: 'Responsable técnico', celda: (c) => (PERFIL_RESPONSABLE.es(c.responsableTecnico) ? PERFIL_RESPONSABLE.etiqueta(c.responsableTecnico) : c.responsableTecnico) },
          { clave: 'acc', titulo: '', celda: (c) => <Boton variante="sutil" aria-label={`Editar ${c.codigo}`} icono={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => setEditando(c)} />, ancho: '48px' },
        ]}
        filas={lista}
        claveFila={(c) => c.id}
        vacio={<EstadoVacio titulo="Sin clases de activo" descripcion="Precargue el catálogo sugerido, importe PL-02 o cree las clases una a una." accion={<Boton variante="primario" onClick={() => precargar.mutate({ entidadId })}>Precargar sugeridas</Boton>} />}
      />
      <DialogoClase entidadId={entidadId} clase={editando} onCerrar={() => setEditando(null)} />
    </>
  );
}

function DialogoClase({ entidadId, clase, onCerrar }: { entidadId: string; clase: ClaseActivoDto | 'nueva' | null; onCerrar: () => void }): JSX.Element {
  const crear = useMutacion('clase:crear', [...INVALIDA]);
  const actualizar = useMutacion('clase:actualizar', [...INVALIDA]);
  const esNueva = clase === 'nueva';
  const valores: Partial<Valores> = esNueva || clase === null
    ? { esDepreciable: true, requiereHojaVida: false, requiereInvima: false, activo: true, responsableTecnico: 'ESPECIALISTA_FISICOS' }
    : { ...clase };
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Valores, unknown, Validados>({ resolver: zodResolver(esquema), defaultValues: valores, values: valores as Valores });
  const depreciable = watch('esDepreciable');
  const error = crear.error ?? actualizar.error;

  const guardar = (v: Validados): void => {
    const { justificacion, ...campos } = v;
    if (esNueva) crear.mutate({ entidadId, ...campos }, { onSuccess: onCerrar });
    else if (clase !== null) actualizar.mutate({ id: clase.id, cambios: campos, justificacion: justificacion ?? null }, { onSuccess: onCerrar });
  };

  return (
    <Dialogo abierto={clase !== null} onCambioAbierto={(a) => { if (!a) onCerrar(); }} titulo={esNueva ? 'Nueva clase de activo' : `Editar clase ${clase === null ? '' : clase.codigo}`} ancho="lg">
      <form id="form-clase" noValidate onSubmit={handleSubmit(guardar)} className="flex flex-col gap-4">
        {error !== null && <Aviso tono="peligro">{mensajeError(error)}</Aviso>}
        <div className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Código" obligatorio ayuda="P. ej. EMC" error={errors.codigo?.message} {...register('codigo')} />
          <div className="md:col-span-2">
            <Campo etiqueta="Nombre" obligatorio error={errors.nombre?.message} {...register('nombre')} />
          </div>
          <Campo etiqueta="Subcuenta contable" obligatorio ayuda="Código del plan de cuentas (IN-01-05)" error={errors.subcuentaContable?.message} {...register('subcuentaContable')} />
          <Campo etiqueta="Vida útil contable (meses)" type="number" min={1} disabled={!depreciable} ayuda="Para la depreciación" error={errors.vidaUtilContableMeses?.message} {...register('vidaUtilContableMeses')} />
          <Campo etiqueta="Vida útil técnica (años)" type="number" step="0.01" min={0} ayuda="Para el índice de obsolescencia" error={errors.vidaUtilTecnicaAnios?.message} {...register('vidaUtilTecnicaAnios')} />
          <Selector etiqueta="Responsable técnico" obligatorio ayuda="Perfil que valúa esta clase" opciones={PERFIL_RESPONSABLE.valores.map((v) => ({ valor: v, etiqueta: PERFIL_RESPONSABLE.etiqueta(v) }))} error={errors.responsableTecnico?.message} {...register('responsableTecnico')} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Casilla etiqueta="Es depreciable" ayuda="Desmarcar para terrenos (RN-06-07)" {...register('esDepreciable')} />
          <Casilla etiqueta="Requiere hoja de vida detallada" {...register('requiereHojaVida')} />
          <Casilla etiqueta="Requiere registro INVIMA" ayuda="Equipo biomédico" {...register('requiereInvima')} />
          <Casilla etiqueta="Activa" ayuda="Las clases no se borran: se desactivan" {...register('activo')} />
        </div>
        {!esNueva && <AreaTexto etiqueta="Justificación del cambio" ayuda="Cambiar una vida útil invalida los cálculos de los ejercicios abiertos (ANEXO_C §10) y queda en bitácora." error={errors.justificacion?.message} {...register('justificacion')} />}
        <div className="flex justify-end gap-2">
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" variante="primario" cargando={crear.isPending || actualizar.isPending}>
            {esNueva ? 'Crear clase' : 'Guardar cambios'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
