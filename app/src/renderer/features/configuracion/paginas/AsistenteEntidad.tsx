/**
 * Pantalla 1 — Nueva entidad. Dos caminos que llevan al mismo sitio:
 *
 *   a) tecleando la identificación, o
 *   b) **importando `PL-01` ya diligenciado**, que es como llega un hospital que
 *      recibió el formato y lo devolvió lleno. Sin esta segunda vía había que
 *      copiar a mano lo que ya estaba escrito en el Excel.
 */
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { FileUp, Keyboard } from 'lucide-react';
import { cliente, useMutacion } from '../../../ipc/consultas';
import { useEstadoInterfaz } from '../../../app/estado';
import { Aviso, Boton, Casilla, Encabezado, Seccion } from '../../../componentes/ui';
import { FormularioEntidad } from '../componentes/FormularioEntidad';
import { InformeImportacionDialogo } from '../../../componentes/ImportarPlantilla';
import type { InformeImportacion } from '@compartido/dtos/importacion';
import { mensajeError } from '../hooks';

export function AsistenteEntidad(): JSX.Element {
  const navegar = useNavigate();
  const fijarEntidadActiva = useEstadoInterfaz((s) => s.fijarEntidadActiva);
  const [precargar, setPrecargar] = useState(true);
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const crear = useMutacion('entidad:crear', ['entidad:listar']);
  const confirmar = useMutacion('importacion:confirmar', ['entidad:listar']);

  function irA(entidadId: string): void {
    fijarEntidadActiva(entidadId);
    void navegar(`/entidad/${entidadId}/paso/01/sedes`);
  }

  async function elegirPl01(): Promise<void> {
    setImportando(true);
    setErrorImportacion(null);
    try {
      // `entidadId: null` = créela desde la plantilla.
      const r = await cliente().invocar('importacion:previsualizar', { entidadId: null, plantilla: 'PL-01', ejercicioId: null });
      if (r !== null) setInforme(r);
    } catch (e) {
      setErrorImportacion(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Nueva entidad" subtitulo="Paso 01 · Parametrización. Después de crearla seguirán sedes y servicios, clases de activo, parámetros y el ejercicio." />

      <Seccion
        titulo="¿Ya tiene el formato PL-01 diligenciado?"
        descripcion="Si el hospital devolvió la plantilla llena, la entidad se crea desde ahí: razón social, NIT, gerente y los parámetros de cálculo entran de una vez, sin volver a teclearlos."
        acciones={
          <Boton icono={<FileUp className="h-4 w-4" aria-hidden />} cargando={importando} onClick={() => void elegirPl01()}>
            Crear desde PL-01
          </Boton>
        }
      >
        {errorImportacion !== null && <Aviso tono="peligro">{errorImportacion}</Aviso>}
        <p className="text-texto-secundario">
          Verá la previsualización antes de que se cree nada. Si le falta algún dato de identificación, se le dirá cuál y podrá completarlo en el Excel o seguir tecleando abajo. El formato en
          blanco está en <strong>2. Formatos</strong>.
        </p>
      </Seccion>

      <Seccion titulo="O tecléela: identificación de la E.S.E" descripcion="Insumo IN-01-01. Estos datos encabezan todos los documentos y resoluciones.">
        {crear.isError && (
          <Aviso tono="peligro" className="mb-4">
            {mensajeError(crear.error)}
          </Aviso>
        )}
        <FormularioEntidad
          textoGuardar="Crear entidad y continuar"
          guardando={crear.isPending}
          onGuardar={(valores) => {
            crear.mutate({ ...valores, precargarSemillas: precargar }, { onSuccess: (entidad) => irA(entidad.id) });
          }}
        />
        <div className="mt-4 border-t border-borde pt-4">
          <Casilla
            etiqueta="Precargar el catálogo sugerido"
            ayuda="8 clases de activo con vidas útiles de referencia, 20 abreviaturas de plaqueteo y los parámetros por defecto de ANEXO_B. Todo se puede ajustar después (RF-01-03)."
            checked={precargar}
            onChange={(e) => setPrecargar(e.target.checked)}
          />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-texto-secundario">
          <Keyboard className="h-4 w-4 shrink-0" aria-hidden /> Los datos que falten se pueden completar después desde la pantalla de la entidad.
        </p>
      </Seccion>

      <InformeImportacionDialogo
        informe={informe}
        plantilla="PL-01"
        onCerrar={() => setInforme(null)}
        confirmando={confirmar.isPending}
        onConfirmar={(aceptarConErrores) => {
          if (informe === null) return;
          confirmar.mutate(
            { token: informe.token, aceptarConErrores },
            {
              onSuccess: (r) => {
                setInforme(null);
                if (r.entidadId !== null) irA(r.entidadId);
              },
              onError: (e) => setErrorImportacion(mensajeError(e)),
            },
          );
        }}
      />
    </>
  );
}
