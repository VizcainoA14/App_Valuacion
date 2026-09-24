/**
 * Definición de `PL-03_toma_inventario_fisico.xlsx` tal como existe en
 * especificacion/plantillas/excel: hoja INVENTARIO, encabezados en la fila 6
 * y ejemplo en la 7. Los nombres de columna son literalmente los del archivo.
 *
 * `clase_activo`, `sede` y `servicio_ubicacion` llegan como TEXTO —lo que la
 * plantilla ofrece en su lista desplegable (nombre de clase, código de sede,
 * nombre de servicio)— y se resuelven contra el catálogo al importar (VAL-02-03).
 */
import type { DefinicionPlantilla } from '../../../infraestructura/documental/excel/importador';
import { ESTADO_ACTUAL, CONDICION_TENENCIA } from '../../../../compartido/enums/catalogos';

export const HOJA_INVENTARIO = 'INVENTARIO';

export const PL_03: DefinicionPlantilla = {
  hojas: [
    {
      nombre: HOJA_INVENTARIO,
      // RN-02-01: unicidad dentro de la entidad. La placa se comprueba aparte
      // porque las dos claves son independientes y cada una da su propio motivo.
      claveUnica: ['codigo_institucional'],
      columnas: [
        { nombre: 'codigo_institucional', tipo: 'texto', obligatoria: true },
        { nombre: 'placa', tipo: 'texto', obligatoria: true },
        { nombre: 'descripcion_funcional', tipo: 'texto', obligatoria: true },
        { nombre: 'clase_activo', tipo: 'texto', obligatoria: true },
        { nombre: 'marca', tipo: 'texto', obligatoria: false },
        { nombre: 'modelo', tipo: 'texto', obligatoria: false },
        { nombre: 'serie', tipo: 'texto', obligatoria: false },
        { nombre: 'sede', tipo: 'texto', obligatoria: true },
        { nombre: 'servicio_ubicacion', tipo: 'texto', obligatoria: true },
        { nombre: 'cantidad', tipo: 'entero', obligatoria: false, noNegativo: true },
        { nombre: 'estado_actual', tipo: 'lista', obligatoria: true, catalogo: ESTADO_ACTUAL.valores },
        { nombre: 'condicion_tenencia', tipo: 'lista', obligatoria: true, catalogo: CONDICION_TENENCIA.valores },
        { nombre: 'responsable_custodia', tipo: 'texto', obligatoria: false },
        { nombre: 'fecha_toma', tipo: 'fecha', obligatoria: true },
        { nombre: 'funcionario_que_cuenta', tipo: 'texto', obligatoria: true },
        { nombre: 'observaciones', tipo: 'texto', obligatoria: false },
        { nombre: 'tiene_foto', tipo: 'si_no', obligatoria: false },
      ],
    },
  ],
};
