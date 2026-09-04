/** Subpaso 1 — datos de la entidad: edición con bitácora e importación de PL-01. */
import type { JSX } from 'react';
import { useCanal, useMutacion, EFECTOS_PASO_01 } from '../../../ipc/consultas';
import { Aviso, Cargando, Encabezado, Seccion } from '../../../componentes/ui';
import { FormularioEntidad } from '../componentes/FormularioEntidad';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { useEntidadId, mensajeError } from '../hooks';

export function DatosEntidad(): JSX.Element {
  const entidadId = useEntidadId();
  const entidad = useCanal('entidad:porId', { id: entidadId });
  const actualizar = useMutacion('entidad:actualizar', ['entidad:porId', 'entidad:listar', ...EFECTOS_PASO_01]);

  if (entidad.isPending) return <Cargando />;
  if (entidad.data === undefined || entidad.data === null) return <Aviso tono="peligro">La entidad no existe.</Aviso>;
  const e = entidad.data;

  return (
    <>
      <Encabezado titulo="Datos de la entidad" subtitulo="IN-01-01 · Todo cambio queda en bitácora (RF-01-08)." acciones={<ImportarPlantilla entidadId={entidadId} plantilla="PL-01" invalida={['entidad:porId', 'entidad:listar', 'parametros:obtener']} />} />
      {actualizar.isError && (
        <Aviso tono="peligro" className="mb-4">
          {mensajeError(actualizar.error)}
        </Aviso>
      )}
      {actualizar.isSuccess && (
        <Aviso tono="exito" className="mb-4">
          Cambios guardados.
        </Aviso>
      )}
      <Seccion titulo="Identificación" descripcion="Razón social exacta, NIT con dígito de verificación y representante legal.">
        <FormularioEntidad
          key={e.actualizadoEn}
          valoresIniciales={{
            razonSocial: e.razonSocial,
            nit: e.nit,
            municipio: e.municipio,
            departamento: e.departamento,
            nivelComplejidad: e.nivelComplejidad,
            nombreGerente: e.nombreGerente,
            nombreContador: e.nombreContador,
            tarjetaProfesionalContador: e.tarjetaProfesionalContador,
            actoNombramientoGerente: e.actoNombramientoGerente,
            direccion: e.direccion,
            telefono: e.telefono,
            email: e.email,
          }}
          textoGuardar="Guardar cambios"
          guardando={actualizar.isPending}
          onGuardar={(valores) => actualizar.mutate({ id: entidadId, cambios: valores })}
        />
      </Seccion>
    </>
  );
}
