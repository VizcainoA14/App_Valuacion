/**
 * Formulario del proceso (ADR-029): su nombre, su fecha de corte y los datos
 * del hospital (IN-01-01). Lo usan el asistente de inicio y la edición.
 */
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { camposHospital, camposProceso } from '@compartido/ipc/contrato';
import { NIVEL_COMPLEJIDAD } from '@compartido/enums/plataforma';
import { Boton, Campo, Selector } from '../../../componentes/ui';

const esquema = z.object({ ...camposProceso, ...camposHospital });
export type ValoresProceso = z.input<typeof esquema>;
export type ValoresProcesoValidados = z.output<typeof esquema>;

const hoy = (): string => new Date().toISOString().slice(0, 10);

export function FormularioProceso({
  valoresIniciales,
  textoGuardar,
  guardando,
  soloLectura = false,
  avisoFecha,
  onGuardar,
}: {
  valoresIniciales?: Partial<ValoresProceso>;
  textoGuardar: string;
  guardando: boolean;
  soloLectura?: boolean;
  /** Lo que pasa si cambia la fecha: en la edición, se descarta el cálculo hecho. */
  avisoFecha?: string;
  onGuardar: (valores: ValoresProcesoValidados) => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ValoresProceso, unknown, ValoresProcesoValidados>({
    resolver: zodResolver(esquema),
    defaultValues: { nivelComplejidad: 'I', ...valoresIniciales },
  });

  return (
    <form onSubmit={handleSubmit(onGuardar)} className="flex flex-col gap-4" noValidate>
      <fieldset disabled={soloLectura} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Nombre del proceso" obligatorio ayuda='Para reconocerlo en la lista, p. ej. "Valuación cierre 2025"' error={errors.nombre?.message} {...register('nombre')} />
        <Campo etiqueta="Fecha de corte" type="date" obligatorio max={hoy()} ayuda={avisoFecha ?? 'El día al que se calcula todo el proceso. No puede ser futura.'} error={errors.fechaCorte?.message} {...register('fechaCorte')} />
      </div>
      <p className="border-t border-borde pt-3 font-medium text-texto">Datos del hospital</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Campo etiqueta="Razón social" obligatorio ayuda="Exacta según el acto de creación: encabeza todos los documentos" error={errors.razonSocial?.message} {...register('razonSocial')} />
        </div>
        <Campo etiqueta="NIT" obligatorio ayuda="Con dígito de verificación, p. ej. 890000000-1" error={errors.nit?.message} {...register('nit')} />
        <Selector etiqueta="Nivel de complejidad" obligatorio opciones={NIVEL_COMPLEJIDAD.valores.map((v) => ({ valor: v, etiqueta: NIVEL_COMPLEJIDAD.etiqueta(v) }))} error={errors.nivelComplejidad?.message} {...register('nivelComplejidad')} />
        <Campo etiqueta="Municipio" obligatorio error={errors.municipio?.message} {...register('municipio')} />
        <Campo etiqueta="Departamento" obligatorio error={errors.departamento?.message} {...register('departamento')} />
        <Campo etiqueta="Nombre del gerente" obligatorio error={errors.nombreGerente?.message} {...register('nombreGerente')} />
        <Campo etiqueta="Acto de nombramiento del gerente" ayuda="Decreto o resolución y fecha" error={errors.actoNombramientoGerente?.message} {...register('actoNombramientoGerente')} />
        <div className="md:col-span-2">
          <Campo etiqueta="Dirección de la sede principal" obligatorio error={errors.direccion?.message} {...register('direccion')} />
        </div>
        <Campo etiqueta="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
        <Campo etiqueta="Correo electrónico" type="email" error={errors.email?.message} {...register('email')} />
      </div>
      {!soloLectura && (
        <div className="flex justify-end gap-2">
          <Boton type="submit" variante="primario" cargando={guardando} disabled={valoresIniciales?.razonSocial !== undefined && !isDirty}>
            {textoGuardar}
          </Boton>
        </div>
      )}
      </fieldset>
    </form>
  );
}
