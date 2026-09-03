/** Pantalla 1 — Asistente de nueva entidad: crea la entidad con las semillas y lleva al paso 01. */
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { useMutacion } from '../../../ipc/consultas';
import { useEstadoInterfaz } from '../../../app/estado';
import { Aviso, Casilla, Encabezado, Seccion } from '../../../componentes/ui';
import { FormularioEntidad } from '../componentes/FormularioEntidad';
import { mensajeError } from '../hooks';

export function AsistenteEntidad(): JSX.Element {
  const navegar = useNavigate();
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const [precargar, setPrecargar] = useState(true);
  const crear = useMutacion('entidad:crear', ['entidad:listar']);

  return (
    <>
      <Encabezado titulo="Nueva entidad" subtitulo="Paso 01 · Parametrización. Después de crearla seguirán sedes y servicios, clases de activo, parámetros y el ejercicio." />
      {crear.isError && (
        <Aviso tono="peligro" className="mb-4">
          {mensajeError(crear.error)}
        </Aviso>
      )}
      <Seccion titulo="Identificación de la E.S.E" descripcion="Insumo IN-01-01. Estos datos encabezan todos los documentos y resoluciones.">
        <FormularioEntidad
          textoGuardar="Crear entidad y continuar"
          guardando={crear.isPending}
          onGuardar={(valores) => {
            crear.mutate(
              { ...valores, precargarSemillas: precargar },
              {
                onSuccess: (entidad) => {
                  fijarEntidadActiva(entidad.id);
                  void navegar(`/entidad/${entidad.id}/paso/01/sedes`);
                },
              },
            );
          }}
        />
        <div className="mt-4 border-t border-borde pt-4">
          <Casilla etiqueta="Precargar el catálogo sugerido" ayuda="8 clases de activo con vidas útiles de referencia, 20 abreviaturas de plaqueteo y los parámetros por defecto de ANEXO_B. Todo se puede ajustar después (RF-01-03)." checked={precargar} onChange={(e) => setPrecargar(e.target.checked)} />
        </div>
      </Seccion>
    </>
  );
}
