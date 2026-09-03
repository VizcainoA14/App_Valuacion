/**
 * ADR-026 etapa 3 — cargar el inventario. Dos importaciones y en este orden:
 * primero los bienes (PL-03) y después sus datos económicos (PL-05). Se muestra
 * el avance real para que el hospital sepa cuánto le falta antes de calcular.
 */
import type { JSX } from 'react';
import { Link } from 'react-router';
import { Boxes, FileSpreadsheet } from 'lucide-react';
import { useCanal } from '../../../ipc/consultas';
import { ImportarPlantilla } from '../../../componentes/ImportarPlantilla';
import { Aviso, Cargando, Insignia, Seccion } from '../../../componentes/ui';
import { useContextoEjercicio } from '../hooks';

const CANALES_INVENTARIO = ['bien:listar', 'bien:cobertura', 'bien:idsDelFiltro', 'validaciones:evaluar'] as const;

export function ImportarInventario(): JSX.Element {
  const { entidadId, ejercicioId } = useContextoEjercicio();
  const clases = useCanal('clase:listar', { entidadId, incluirInactivas: false });
  const sedes = useCanal('sede:listar', { entidadId, incluirInactivas: false });
  const todos = useCanal('bien:listar', { ejercicioId, filtros: {}, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 1 });
  const incompletos = useCanal('bien:listar', { ejercicioId, filtros: { estadoRegistro: 'INCOMPLETO' }, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 1 });

  if (clases.isPending || sedes.isPending) return <Cargando />;

  const faltaCatalogo = (clases.data?.length ?? 0) === 0 || (sedes.data?.length ?? 0) === 0;
  const bienes = todos.data?.total ?? 0;
  const sinDatosEconomicos = incompletos.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {faltaCatalogo && (
        <Aviso tono="aviso" titulo="Antes hay que tener el catálogo">
          PL-03 nombra las clases, sedes y servicios de la entidad, así que tienen que existir primero. Complete la{' '}
          <Link className="underline" to={`/entidad/${entidadId}/paso/01`}>
            etapa 1
          </Link>{' '}
          o impórtelos con PL-02 y PL-02b.
        </Aviso>
      )}

      <Seccion
        titulo="1 · Los bienes — PL-03"
        descripcion="La toma de inventario físico. Es la única entrada del inventario: la aplicación no se usa en campo (ADR-015)."
        acciones={<ImportarPlantilla entidadId={entidadId} ejercicioId={ejercicioId} plantilla="PL-03" invalida={CANALES_INVENTARIO} variante={bienes === 0 ? 'primario' : 'normal'} />}
      >
        <p className="text-texto-secundario">
          {bienes === 0 ? (
            'Todavía no hay ningún bien en este ejercicio.'
          ) : (
            <>
              <Insignia tono="exito">{bienes.toLocaleString('es-CO')} bienes</Insignia> registrados en el ejercicio.
            </>
          )}
        </p>
      </Seccion>

      <Seccion
        titulo="2 · Fecha y costo de adquisición — PL-05"
        descripcion="Sin estos dos datos el bien no entra al cálculo de la depreciación (RN-03-01). Un costo en cero cuenta como dato faltante, no como bien gratuito (RN-03-02)."
        acciones={<ImportarPlantilla entidadId={entidadId} ejercicioId={ejercicioId} plantilla="PL-05" invalida={CANALES_INVENTARIO} variante={bienes > 0 && sinDatosEconomicos > 0 ? 'primario' : 'normal'} />}
      >
        {bienes === 0 ? (
          <p className="text-texto-secundario">Importe antes PL-03: PL-05 se apoya en el código institucional de cada bien.</p>
        ) : sinDatosEconomicos === 0 ? (
          <p className="text-texto-secundario">Todos los bienes tienen fecha y costo. El inventario está listo para calcular.</p>
        ) : (
          <p className="text-texto-secundario">
            <Insignia tono="aviso">{sinDatosEconomicos.toLocaleString('es-CO')} incompletos</Insignia> de {bienes.toLocaleString('es-CO')}: les falta la fecha o el costo de adquisición. Si el soporte no aparece, use la
            hoja <span className="font-mono">SIN_SOPORTE</span> de PL-05 para registrar el avalúo técnico de reconocimiento inicial (RN-03-04).
          </p>
        )}
      </Seccion>

      <div className="flex flex-wrap gap-3 text-texto-secundario">
        <Link className="inline-flex items-center gap-1 underline" to="/formatos">
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> Descargar los formatos en blanco
        </Link>
        <Link className="inline-flex items-center gap-1 underline" to={`/entidad/${entidadId}/ejercicio/${ejercicioId}/paso/02/bienes`}>
          <Boxes className="h-4 w-4" aria-hidden /> Ver el listado de bienes
        </Link>
      </div>
    </div>
  );
}
