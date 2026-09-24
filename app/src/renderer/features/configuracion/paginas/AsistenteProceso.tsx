/**
 * Iniciar un proceso (ADR-029). Dos caminos que llevan al mismo sitio:
 *
 *   a) tecleando el nombre, la fecha de corte y los datos del hospital, o
 *   b) **importando `PL-01` ya diligenciado**, que es como llega un hospital que
 *      recibió el formato y lo devolvió lleno. Sin esta segunda vía había que
 *      copiar a mano lo que ya estaba escrito en el Excel.
 */
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { FileUp, Keyboard } from 'lucide-react';
import { cliente, useMutacion } from '../../../ipc/consultas';
import { Aviso, Boton, Casilla, Encabezado, Seccion } from '../../../componentes/ui';
import { FormularioProceso } from '../componentes/FormularioProceso';
import { InformeImportacionDialogo } from '../../../componentes/ImportarPlantilla';
import type { InformeImportacion } from '@compartido/dtos/importacion';
import { mensajeError } from '../hooks';

export function AsistenteProceso(): JSX.Element {
  const navegar = useNavigate();
  const [precargar, setPrecargar] = useState(true);
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const crear = useMutacion('proceso:crear', ['proceso:listar']);
  const confirmar = useMutacion('importacion:confirmar', ['proceso:listar']);

  function irA(procesoId: string): void {
    void navegar(`/proceso/${procesoId}/configuracion/sedes`);
  }

  async function elegirPl01(): Promise<void> {
    setImportando(true);
    setErrorImportacion(null);
    try {
      // `procesoId: null` = créelo desde la plantilla.
      const r = await cliente().invocar('importacion:previsualizar', { procesoId: null, plantilla: 'PL-01' });
      if (r !== null) setInforme(r);
    } catch (e) {
      setErrorImportacion(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Iniciar un proceso" subtitulo="Cada proceso es una valuación aparte, con su propio hospital, inventario y cálculo. Después de iniciarlo seguirán sedes y servicios, clases de activo y parámetros." />

      <Seccion
        titulo="¿Ya tiene el formato PL-01 diligenciado?"
        descripcion="Si el hospital devolvió la plantilla llena, el proceso se inicia desde ahí: razón social, NIT, gerente, fecha de corte y parámetros de cálculo entran de una vez, sin volver a teclearlos."
        acciones={
          <Boton icono={<FileUp className="h-4 w-4" aria-hidden />} cargando={importando} onClick={() => void elegirPl01()}>
            Crear desde PL-01
          </Boton>
        }
      >
        {errorImportacion !== null && <Aviso tono="peligro">{errorImportacion}</Aviso>}
        <p className="text-texto-secundario">
          Verá la previsualización antes de que se cree nada. Si le falta algún dato de identificación o la fecha de corte, se le dirá cuál y podrá completarlo en el Excel o seguir tecleando abajo. El formato en
          blanco está en <strong>Formatos</strong>.
        </p>
      </Seccion>

      <Seccion titulo="O tecléelo" descripcion="Insumo IN-01-01. Estos datos encabezan el informe del proceso.">
        {crear.isError && (
          <Aviso tono="peligro" className="mb-4">
            {mensajeError(crear.error)}
          </Aviso>
        )}
        <FormularioProceso
          textoGuardar="Iniciar el proceso y continuar"
          guardando={crear.isPending}
          onGuardar={(valores) => {
            crear.mutate({ ...valores, precargarSemillas: precargar }, { onSuccess: (proceso) => irA(proceso.id) });
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
          <Keyboard className="h-4 w-4 shrink-0" aria-hidden /> Los datos que falten se pueden completar después en Configurar.
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
                if (r.procesoId !== null) irA(r.procesoId);
              },
              onError: (e) => setErrorImportacion(mensajeError(e)),
            },
          );
        }}
      />
    </>
  );
}
