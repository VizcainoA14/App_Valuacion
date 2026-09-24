/**
 * Definiciones de PL-01, PL-02 y PL-02b tal como existen en
 * especificacion/plantillas/excel (fila 6 encabezados, fila 7 ejemplo).
 * Los nombres de columna son los del archivo real; el lector normaliza tildes
 * (PL-01 trae `dirección`/`teléfono`, CT-18).
 */
import type { DefinicionPlantilla } from '../../../infraestructura/documental/excel/importador';
import type { TipoColumna } from '../../../infraestructura/documental/excel/normalizador';
import { TIPO_SERVICIO, NIVEL_COMPLEJIDAD } from '../../../../compartido/enums/plataforma';
import { METODO_CONTEO_MESES, METODO_DEPRECIACION, ENFOQUE_ADICIONES, BASE_COMPARACION_AVALUO } from '../../../../compartido/enums/parametros';

export const PL_02: DefinicionPlantilla = {
  hojas: [
    {
      nombre: 'CLASES',
      claveUnica: ['codigo_clase'],
      columnas: [
        { nombre: 'codigo_clase', tipo: 'texto', obligatoria: true },
        { nombre: 'nombre_clase', tipo: 'texto', obligatoria: true },
        { nombre: 'subcuenta_contable', tipo: 'texto', obligatoria: true },
        { nombre: 'es_depreciable', tipo: 'si_no', obligatoria: true },
        { nombre: 'vida_util_contable_meses', tipo: 'entero', obligatoria: false, noNegativo: true },
        { nombre: 'vida_util_tecnica_anios', tipo: 'numero', obligatoria: false, noNegativo: true },
        { nombre: 'requiere_hoja_vida', tipo: 'si_no', obligatoria: true },
        { nombre: 'requiere_invima', tipo: 'si_no', obligatoria: true },
        { nombre: 'responsable_tecnico', tipo: 'texto', obligatoria: true },
        { nombre: 'activo', tipo: 'si_no', obligatoria: true },
      ],
    },
  ],
};

export const PL_02B: DefinicionPlantilla = {
  hojas: [
    {
      nombre: 'SEDES',
      claveUnica: ['codigo_sede'],
      columnas: [
        { nombre: 'codigo_sede', tipo: 'texto', obligatoria: true },
        { nombre: 'nombre_sede', tipo: 'texto', obligatoria: true },
        { nombre: 'direccion', tipo: 'texto', obligatoria: true },
        { nombre: 'municipio', tipo: 'texto', obligatoria: true },
        { nombre: 'activa', tipo: 'si_no', obligatoria: true },
      ],
    },
    {
      nombre: 'SERVICIOS',
      claveUnica: ['codigo_sede', 'codigo_servicio'],
      columnas: [
        { nombre: 'codigo_servicio', tipo: 'texto', obligatoria: true },
        { nombre: 'nombre_servicio', tipo: 'texto', obligatoria: true },
        { nombre: 'codigo_sede', tipo: 'texto', obligatoria: true },
        { nombre: 'tipo', tipo: 'lista', obligatoria: true, catalogo: TIPO_SERVICIO.valores },
        { nombre: 'responsable', tipo: 'texto', obligatoria: false },
        { nombre: 'activo', tipo: 'si_no', obligatoria: true },
      ],
    },
  ],
};

/** PL-01 es clave/valor: se lee con el lector y cada clave se normaliza con su propio tipo. */
export const PL_01_HOJA = { nombre: 'PARAMETROS', columnas: ['campo', 'valor', 'observacion'] } as const;

export interface ClavePl01 {
  readonly tipo: TipoColumna;
  readonly catalogo?: readonly string[];
  /** `proceso`: la fecha de corte; crea el proceso si no existe, y si existe solo se compara. */
  readonly destino: 'hospital' | 'parametro' | 'proceso' | 'ignorar';
  readonly campo: string;
}

export const CLAVES_PL_01: Readonly<Record<string, ClavePl01>> = {
  razon_social: { tipo: 'texto', destino: 'hospital', campo: 'razonSocial' },
  nit: { tipo: 'texto', destino: 'hospital', campo: 'nit' },
  municipio: { tipo: 'texto', destino: 'hospital', campo: 'municipio' },
  departamento: { tipo: 'texto', destino: 'hospital', campo: 'departamento' },
  nivel_complejidad: { tipo: 'lista', catalogo: NIVEL_COMPLEJIDAD.valores, destino: 'hospital', campo: 'nivelComplejidad' },
  nombre_gerente: { tipo: 'texto', destino: 'hospital', campo: 'nombreGerente' },
  acto_nombramiento_gerente: { tipo: 'texto', destino: 'hospital', campo: 'actoNombramientoGerente' },
  direccion: { tipo: 'texto', destino: 'hospital', campo: 'direccion' },
  telefono: { tipo: 'texto', destino: 'hospital', campo: 'telefono' },
  email: { tipo: 'texto', destino: 'hospital', campo: 'email' },
  ruta_logo: { tipo: 'texto', destino: 'ignorar', campo: 'logoUrl' },
  // ADR-029: la fecha de corte del proceso. Al crear el proceso desde PL-01 es obligatoria.
  fecha_corte_ejercicio: { tipo: 'fecha', destino: 'proceso', campo: 'fechaCorte' },
  metodo_depreciacion: { tipo: 'lista', catalogo: METODO_DEPRECIACION.valores, destino: 'parametro', campo: 'metodo_depreciacion' },
  metodo_conteo_meses: { tipo: 'lista', catalogo: METODO_CONTEO_MESES.valores, destino: 'parametro', campo: 'metodo_conteo_meses' },
  deprecia_mes_adquisicion: { tipo: 'si_no', destino: 'parametro', campo: 'deprecia_mes_adquisicion' },
  usa_puesta_en_servicio: { tipo: 'si_no', destino: 'parametro', campo: 'usa_puesta_en_servicio' },
  enfoque_adiciones: { tipo: 'lista', catalogo: ENFOQUE_ADICIONES.valores, destino: 'parametro', campo: 'enfoque_adiciones' },
  base_comparacion_avaluo: { tipo: 'lista', catalogo: BASE_COMPARACION_AVALUO.valores, destino: 'parametro', campo: 'base_comparacion_avaluo' },
  valor_residual_pct: { tipo: 'numero', destino: 'parametro', campo: 'valor_residual_pct' },
  decimales_calculo: { tipo: 'entero', destino: 'parametro', campo: 'decimales_calculo' },
  umbral_capitalizacion: { tipo: 'moneda', destino: 'parametro', campo: 'umbral_capitalizacion' },
  umbral_semaforo_verde: { tipo: 'numero', destino: 'parametro', campo: 'umbral_semaforo_verde' },
  umbral_semaforo_amarillo: { tipo: 'numero', destino: 'parametro', campo: 'umbral_semaforo_amarillo' },
  umbral_semaforo_naranja: { tipo: 'numero', destino: 'parametro', campo: 'umbral_semaforo_naranja' },
  umbral_reparacion_baja_pct: { tipo: 'numero', destino: 'parametro', campo: 'umbral_reparacion_baja_pct' },
  tolerancia_cruce_valor_pct: { tipo: 'numero', destino: 'parametro', campo: 'tolerancia_cruce_valor_pct' },
  vigencia_avaluo_meses: { tipo: 'entero', destino: 'parametro', campo: 'vigencia_avaluo_meses' },
  moneda: { tipo: 'texto', destino: 'parametro', campo: 'moneda' },
};
