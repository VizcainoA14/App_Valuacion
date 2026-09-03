/** TR-02 — Informe de importación fila por fila (ANEXO_A §3.3). */

export type PlantillaImportable = 'PL-01' | 'PL-02' | 'PL-02b' | 'PL-03' | 'PL-05';

export interface IncidenciaImportacion {
  readonly hoja: string;
  readonly fila: number;
  readonly columna: string | null;
  readonly valorRecibido: string | null;
  readonly motivo: string;
  readonly severidad: 'ERROR' | 'ADVERTENCIA';
}

/** Qué se normalizó y cómo (ANEXO_A §3.3 regla 4: nunca en silencio). */
export interface NormalizacionAplicada {
  readonly hoja: string;
  readonly fila: number;
  readonly columna: string;
  readonly recibido: string;
  readonly interpretado: string;
  readonly regla: string;
}

export interface ResumenHojaImportada {
  readonly hoja: string;
  readonly filaEncabezados: number;
  readonly filasLeidas: number;
  readonly filasValidas: number;
  readonly filasConError: number;
  readonly filasEjemploOmitidas: number;
}

export interface InformeImportacion {
  /** Token con el que se confirma la importación previsualizada. */
  readonly token: string;
  readonly plantilla: PlantillaImportable;
  readonly archivo: string;
  readonly hojas: readonly ResumenHojaImportada[];
  readonly incidencias: readonly IncidenciaImportacion[];
  readonly normalizaciones: readonly NormalizacionAplicada[];
  /** Vista previa de lo que se importaría (hasta 200 filas por hoja). */
  readonly vistaPrevia: Readonly<Record<string, readonly Record<string, string | number | boolean | null>[]>>;
  readonly errores: number;
  readonly advertencias: number;
  /** ANEXO_A §3.3 regla 3: con errores no se importa sin confirmación explícita. */
  readonly importable: boolean;
}

export interface ResultadoImportacion {
  readonly plantilla: PlantillaImportable;
  readonly creados: number;
  readonly actualizados: number;
  readonly omitidos: number;
  readonly archivoConservado: string;
}
