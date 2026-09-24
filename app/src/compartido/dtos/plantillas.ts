/** Catálogo de plantillas que la aplicación entrega al hospital (ANEXO_A §6.1). */

export type FormatoPlantilla = 'xlsx' | 'docx';

/** Para qué se usa: dejar lista la entidad, o registrar lo que hay (ADR-028). */
export type EtapaPlantilla = 'configurar' | 'inventario';

export interface PlantillaDto {
  readonly codigo: string;
  readonly archivo: string;
  readonly formato: FormatoPlantilla;
  readonly nombre: string;
  /** Para qué sirve, en una frase que el personal del hospital entienda. */
  readonly proposito: string;
  readonly paso: number;
  readonly etapa: EtapaPlantilla;
  /** Verdadero si el hospital la diligencia; falso si la genera la aplicación. */
  readonly seDiligencia: boolean;
  /** Se puede importar de vuelta a la aplicación. */
  readonly importable: boolean;
  /** Qué catálogos de la entidad se inyectan como listas desplegables al descargarla. */
  readonly catalogosInyectados: readonly string[];
  readonly disponible: boolean;
}

export interface ResultadoDescargaPlantilla {
  readonly codigo: string;
  readonly ruta: string;
  /** Catálogos que se inyectaron, para poder decírselo al usuario. */
  readonly catalogosInyectados: readonly string[];
  readonly filasEjemploConservadas: boolean;
}
