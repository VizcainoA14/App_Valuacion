/**
 * Cargar el inventario. Dos importaciones y en este orden: primero el barrido
 * (PL-03, lo que se contó) y después los datos económicos (PL-05, fecha y
 * costo). Cada proceso lo importa de cero (ADR-029), y mientras siga en curso
 * se puede repetir: un barrido nuevo actualiza lo que ya estaba (ADR-028).
 */
import type { JSX } from 'react';
import { Link } from 'react-router';
import { Boxes, Calculator, FileSpreadsheet } from 'lucide-react';
import { useCanal, EFECTOS_INVENTARIO } from '../../../ipc/consultas';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { Aviso, Cargando, Insignia, Seccion } from '../../../componentes/ui';
import { formatearEntero, formatearFecha } from '../../../formato';
import { useProcesoRuta } from '../hooks';
import { useSoloLectura } from '../../configuracion/hooks';

export function ImportarInventario(): JSX.Element {
  const procesoId = useProcesoRuta();
  const clases = useCanal('clase:listar', { procesoId, incluirInactivas: false });
  const sedes = useCanal('sede:listar', { procesoId, incluirInactivas: false });
  const todos = useCanal('bien:listar', { procesoId, pagina: 0, tamano: 1 });
  const sinDatos = useCanal('bien:listar', { procesoId, filtros: { sinHojaVida: true }, pagina: 0, tamano: 1 });
  const perdidos = useCanal('bien:listar', { procesoId, filtros: { estadoRegistro: 'NO_ENCONTRADO' }, pagina: 0, tamano: 1 });
  const barridos = useCanal('barrido:listar', { procesoId });
  const soloLectura = useSoloLectura(procesoId);

  if (clases.isPending || sedes.isPending) return <Cargando />;
  if (soloLectura) {
    return (
      <Aviso tono="info" titulo="El proceso está finalizado">
        Su inventario ya no se carga ni se corrige. Consúltelo en{' '}
        <Link className="underline" to={`/proceso/${procesoId}/inventario/bienes`}>
          Listado de bienes
        </Link>
        .
      </Aviso>
    );
  }

  const faltaCatalogo = (clases.data?.length ?? 0) === 0 || (sedes.data?.length ?? 0) === 0;
  const bienes = todos.data?.total ?? 0;
  const sinDatosEconomicos = sinDatos.data?.total ?? 0;
  const noEncontrados = perdidos.data?.total ?? 0;
  const ultimo = barridos.data?.[0];

  return (
    <div className="flex flex-col gap-5">
      {faltaCatalogo && (
        <Aviso tono="aviso" titulo="Antes hay que tener el catálogo">
          PL-03 nombra las clases, sedes y servicios del proceso, así que tienen que existir primero. Complételos en{' '}
          <Link className="underline" to={`/proceso/${procesoId}/configuracion`}>
            Configurar
          </Link>{' '}
          o impórtelos con PL-02 y PL-02b.
        </Aviso>
      )}

      <Seccion
        titulo="1 · El barrido — PL-03"
        descripcion="Lo que se contó físicamente, servicio por servicio. Un barrido nuevo actualiza los bienes que ya estaban, agrega los nuevos y marca como no encontrados los que faltan en los servicios que recorrió."
        acciones={<ImportarPlantilla procesoId={procesoId} plantilla="PL-03" invalida={EFECTOS_INVENTARIO} variante={bienes === 0 ? 'primario' : 'normal'} />}
      >
        <div className="flex flex-col gap-2 text-texto-secundario">
          {bienes === 0 ? (
            <p>Todavía no hay ningún bien registrado.</p>
          ) : (
            <p>
              <Insignia tono="exito">{formatearEntero(bienes)} bienes</Insignia> en el inventario
              {ultimo !== undefined && <> · último barrido del {formatearFecha(ultimo.fecha)} ({ultimo.archivo})</>}.
            </p>
          )}
          {noEncontrados > 0 && (
            <p>
              <Insignia tono="aviso">{formatearEntero(noEncontrados)} no encontrados</Insignia> en el último barrido de su servicio. Siguen en el cálculo hasta que se registre su baja; si
              aparecen en otro barrido, vuelven a quedar activos.
            </p>
          )}
        </div>
      </Seccion>

      <Seccion
        titulo="2 · Fecha y costo de adquisición — PL-05"
        descripcion="Sin estos dos datos el bien no entra al cálculo de la depreciación (RN-03-01). Un costo en cero cuenta como dato faltante, no como bien gratuito (RN-03-02)."
        acciones={<ImportarPlantilla procesoId={procesoId} plantilla="PL-05" invalida={EFECTOS_INVENTARIO} variante={bienes > 0 && sinDatosEconomicos > 0 ? 'primario' : 'normal'} />}
      >
        {bienes === 0 ? (
          <p className="text-texto-secundario">Importe antes un barrido: PL-05 se apoya en el código institucional de cada bien.</p>
        ) : sinDatosEconomicos === 0 ? (
          <p className="text-texto-secundario">Todos los bienes tienen su hoja de vida. El inventario está listo para calcular.</p>
        ) : (
          <p className="text-texto-secundario">
            <Insignia tono="aviso">{formatearEntero(sinDatosEconomicos)} sin datos económicos</Insignia> de {formatearEntero(bienes)}. Si el soporte no aparece, use la hoja{' '}
            <span className="font-mono">SIN_SOPORTE</span> de PL-05 para registrar el avalúo técnico de reconocimiento inicial (RN-03-04).
          </p>
        )}
      </Seccion>

      <div className="flex flex-wrap gap-4 text-texto-secundario">
        <Link className="inline-flex items-center gap-1 underline" to="/formatos">
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> Descargar los formatos en blanco
        </Link>
        <Link className="inline-flex items-center gap-1 underline" to={`/proceso/${procesoId}/inventario/bienes`}>
          <Boxes className="h-4 w-4" aria-hidden /> Ver el listado de bienes
        </Link>
        {bienes > 0 && (
          <Link className="inline-flex items-center gap-1 underline" to={`/proceso/${procesoId}/calculos`}>
            <Calculator className="h-4 w-4" aria-hidden /> Calcular
          </Link>
        )}
      </div>
    </div>
  );
}
