/**
 * Un catálogo es un enum de `ANEXO_B` con sus etiquetas es-CO.
 *
 * Los valores se derivan de las claves del objeto de etiquetas: por construcción
 * es imposible tener un valor sin etiqueta. El registro de catálogos alimenta
 * (1) la prueba de exhaustividad, (2) los `CHECK (col IN (...))` del esquema
 * SQLite (T-B-03) y (3) los desplegables de la interfaz y de las plantillas.
 */
export interface Catalogo<V extends string> {
  /** Nombre `snake_case`, idéntico al de `ANEXO_B`. */
  readonly nombre: string;
  /** Dónde lo define `/especificacion/teoria`. */
  readonly fuente: string;
  readonly valores: readonly V[];
  readonly etiquetas: Readonly<Record<V, string>>;
  es(valor: unknown): valor is V;
  etiqueta(valor: V): string;
}

export type ValoresDe<C> = C extends Catalogo<infer V> ? V : never;

export function definirCatalogo<V extends string>(
  nombre: string,
  fuente: string,
  etiquetas: Record<V, string>,
): Catalogo<V> {
  const valores = Object.freeze(Object.keys(etiquetas) as V[]);
  const conjunto: ReadonlySet<string> = new Set(valores);
  return Object.freeze({
    nombre,
    fuente,
    valores,
    etiquetas: Object.freeze({ ...etiquetas }),
    es: (valor: unknown): valor is V => typeof valor === 'string' && conjunto.has(valor),
    etiqueta: (valor: V): string => etiquetas[valor],
  });
}
