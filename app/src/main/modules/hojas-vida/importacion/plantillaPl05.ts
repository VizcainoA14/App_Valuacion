/**
 * Definición de `PL-05_hoja_de_vida.xlsx` (especificacion/plantillas/excel):
 * hojas HOJA_VIDA, MANTENIMIENTOS y SIN_SOPORTE; encabezados en la fila 6.
 *
 * `fecha_adquisicion` y `costo_adquisicion` son OPCIONALES en el archivo a
 * propósito: RN-03-01 dice que su ausencia deja el bien INCOMPLETO, no que la
 * fila sea inválida. Exigirlas aquí impediría importar precisamente los bienes
 * cuyo soporte falta, que son los que hay que ver para gestionarlos.
 */
import type { DefinicionPlantilla } from '../../../infraestructura/documental/excel/importador';
import { ESTADO_OPERATIVO, FORMA_ADQUISICION } from '../../../../compartido/enums/catalogos';
import { TIPO_INSTALACION } from '../../../../compartido/enums/plataforma';

export const HOJA_VIDA = 'HOJA_VIDA';
export const HOJA_MANTENIMIENTOS = 'MANTENIMIENTOS';
export const HOJA_SIN_SOPORTE = 'SIN_SOPORTE';

export const PL_05: DefinicionPlantilla = {
  hojas: [
    {
      nombre: HOJA_VIDA,
      claveUnica: ['codigo_institucional'],
      columnas: [
        { nombre: 'codigo_institucional', tipo: 'texto', obligatoria: true },
        { nombre: 'tipo_instalacion', tipo: 'lista', obligatoria: false, catalogo: TIPO_INSTALACION.valores },
        { nombre: 'registro_invima', tipo: 'texto', obligatoria: false },
        { nombre: 'fabricante', tipo: 'texto', obligatoria: false },
        { nombre: 'pais_origen', tipo: 'texto', obligatoria: false },
        { nombre: 'especificaciones', tipo: 'texto', obligatoria: false },
        { nombre: 'estado_operativo', tipo: 'lista', obligatoria: true, catalogo: ESTADO_OPERATIVO.valores },
        { nombre: 'forma_adquisicion', tipo: 'lista', obligatoria: true, catalogo: FORMA_ADQUISICION.valores },
        { nombre: 'fecha_adquisicion', tipo: 'fecha', obligatoria: false },
        { nombre: 'documento_adquisicion', tipo: 'texto', obligatoria: false },
        { nombre: 'numero_factura', tipo: 'texto', obligatoria: false },
        { nombre: 'proveedor', tipo: 'texto', obligatoria: false },
        { nombre: 'costo_adquisicion', tipo: 'moneda', obligatoria: false, noNegativo: true },
        { nombre: 'adiciones_mejoras', tipo: 'moneda', obligatoria: false, noNegativo: true },
        { nombre: 'fuente_financiacion', tipo: 'texto', obligatoria: false },
        { nombre: 'fecha_puesta_servicio', tipo: 'fecha', obligatoria: false },
        { nombre: 'vida_util_tecnica_override', tipo: 'numero', obligatoria: false, noNegativo: true },
        { nombre: 'justificacion_override', tipo: 'texto', obligatoria: false },
      ],
    },
    {
      nombre: HOJA_MANTENIMIENTOS,
      columnas: [
        { nombre: 'codigo_institucional', tipo: 'texto', obligatoria: true },
        { nombre: 'fecha_mantenimiento', tipo: 'fecha', obligatoria: true },
        { nombre: 'tipo', tipo: 'texto', obligatoria: true },
        { nombre: 'descripcion', tipo: 'texto', obligatoria: true },
        { nombre: 'ejecutado_por', tipo: 'texto', obligatoria: false },
        { nombre: 'costo', tipo: 'moneda', obligatoria: false, noNegativo: true },
        { nombre: 'resultado', tipo: 'texto', obligatoria: false },
      ],
    },
    {
      nombre: HOJA_SIN_SOPORTE,
      columnas: [
        { nombre: 'codigo_institucional', tipo: 'texto', obligatoria: true },
        { nombre: 'descripcion_bien', tipo: 'texto', obligatoria: false },
        { nombre: 'gestion_realizada', tipo: 'texto', obligatoria: true },
        { nombre: 'valor_estimado_tecnico', tipo: 'moneda', obligatoria: true, noNegativo: true },
        { nombre: 'fecha_probable_adquisicion', tipo: 'fecha', obligatoria: true },
        { nombre: 'especialista', tipo: 'texto', obligatoria: true },
      ],
    },
  ],
};
