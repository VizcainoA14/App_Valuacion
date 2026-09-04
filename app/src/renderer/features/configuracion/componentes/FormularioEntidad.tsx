/** Formulario de la entidad (IN-01-01), reutilizado por el asistente y por la edición. */
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { camposEntidad } from '@compartido/ipc/contrato';
import { NIVEL_COMPLEJIDAD } from '@compartido/enums/plataforma';
import { Boton, Campo, Selector } from '../../../componentes/ui';

const esquema = z.object(camposEntidad);
export type ValoresEntidad = z.input<typeof esquema>;
export type ValoresEntidadValidados = z.output<typeof esquema>;

export function FormularioEntidad({ valoresIniciales, textoGuardar, guardando, onGuardar }: { valoresIniciales?: Partial<ValoresEntidad>; textoGuardar: string; guardando: boolean; onGuardar: (valores: ValoresEntidadValidados) => void }): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ValoresEntidad, unknown, ValoresEntidadValidados>({
    resolver: zodResolver(esquema),
    defaultValues: { nivelComplejidad: 'I', ...valoresIniciales },
  });

  return (
    <form onSubmit={handleSubmit(onGuardar)} className="flex flex-col gap-4" noValidate>
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
        <Campo etiqueta="Nombre del contador" ayuda="Firma el informe junto al gerente (Resolución 193 de 2016)" error={errors.nombreContador?.message} {...register('nombreContador')} />
        <Campo etiqueta="Tarjeta profesional del contador" ayuda="Aparece bajo su firma en el informe" error={errors.tarjetaProfesionalContador?.message} {...register('tarjetaProfesionalContador')} />
        <div className="md:col-span-2">
          <Campo etiqueta="Dirección de la sede principal" obligatorio error={errors.direccion?.message} {...register('direccion')} />
        </div>
        <Campo etiqueta="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
        <Campo etiqueta="Correo electrónico" type="email" error={errors.email?.message} {...register('email')} />
      </div>
      <div className="flex justify-end gap-2">
        <Boton type="submit" variante="primario" cargando={guardando} disabled={valoresIniciales !== undefined && !isDirty}>
          {textoGuardar}
        </Boton>
      </div>
    </form>
  );
}
