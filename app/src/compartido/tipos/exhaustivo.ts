/**
 * Cierre de `switch` exhaustivos sobre enums. Si se añade un valor a un enum y
 * algún `switch` no lo atiende, la compilación falla aquí (ADR-001).
 *
 *   switch (estado) {
 *     case 'BUENO': …
 *     default: return casoImposible(estado);
 *   }
 */
export function casoImposible(valor: never): never {
  throw new Error(`Caso no contemplado: ${String(valor)}`);
}
