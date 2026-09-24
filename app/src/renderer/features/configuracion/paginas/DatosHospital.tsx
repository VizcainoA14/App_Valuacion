/** El proceso y su hospital: edición con bitácora e importación de PL-01. */
import type { JSX } from 'react';
import { useCanal, useMutacion, EFECTOS_CONFIGURACION } from '../../../ipc/consultas';
import { Aviso, Cargando, Encabezado, Seccion } from '../../../componentes/ui';
import { FormularioProceso } from '../componentes/FormularioProceso';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { useProcesoId, mensajeError } from '../hooks';

export function DatosHospital(): JSX.Element {
  const procesoId = useProcesoId();
  const proceso = useCanal('proceso:porId', { id: procesoId });
  // Cambiar la fecha de corte descarta el cálculo: todo lo que cuelga de él se refresca.
  const actualizar = useMutacion('proceso:actualizar', ['proceso:porId', 'proceso:listar', 'corte:actual', 'corte:porId', 'calculo:resumen', 'baja:candidatos', ...EFECTOS_CONFIGURACION]);

  if (proceso.isPending) return <Cargando />;
  if (proceso.data === undefined || proceso.data === null) return <Aviso tono="peligro">El proceso no existe.</Aviso>;
  const e = proceso.data;
  const soloLectura = e.estado === 'FINALIZADO';

  return (
    <>
      <Encabezado
        titulo="El proceso y el hospital"
        subtitulo="IN-01-01 · Todo cambio queda en bitácora (RF-01-08)."
        acciones={soloLectura ? undefined : <ImportarPlantilla procesoId={procesoId} plantilla="PL-01" invalida={['proceso:porId', 'proceso:listar', 'parametros:obtener']} />}
      />
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
      <Seccion titulo="Identificación" descripcion="El nombre y la fecha de corte del proceso; la razón social exacta, el NIT con dígito de verificación y el representante legal del hospital.">
        <FormularioProceso
          key={e.actualizadoEn}
          soloLectura={soloLectura}
          avisoFecha="Si la cambia, el cálculo hecho se descarta y hay que volver a calcular."
          valoresIniciales={{
            nombre: e.nombre,
            fechaCorte: e.fechaCorte,
            razonSocial: e.razonSocial,
            nit: e.nit,
            municipio: e.municipio,
            departamento: e.departamento,
            nivelComplejidad: e.nivelComplejidad,
            nombreGerente: e.nombreGerente,
            actoNombramientoGerente: e.actoNombramientoGerente,
            direccion: e.direccion,
            telefono: e.telefono,
            email: e.email,
          }}
          textoGuardar="Guardar cambios"
          guardando={actualizar.isPending}
          onGuardar={(valores) => actualizar.mutate({ id: procesoId, cambios: valores })}
        />
      </Seccion>
    </>
  );
}
