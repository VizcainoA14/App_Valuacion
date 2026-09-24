import { ErrorIntegridad, ErrorInfraestructura, esErrorAplicacion } from '../../../compartido/errores';

interface ErrorSqlite {
  readonly code: string;
  readonly message: string;
}

function esErrorSqlite(e: unknown): e is ErrorSqlite {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { code?: unknown }).code === 'string' &&
    (e as { code: string }).code.startsWith('SQLITE_')
  );
}

/**
 * Traduce un error de SQLite a la jerarquía de la aplicación. Los triggers
 * generados empiezan su mensaje por el código de regla (`INT-09: …`,
 * `RN-10-07: …`), que aquí se recupera como `codigo`.
 */
export function traducirErrorSqlite(e: unknown): unknown {
  if (esErrorAplicacion(e) || !esErrorSqlite(e)) return e;

  if (e.code.startsWith('SQLITE_CONSTRAINT')) {
    // ADR-029: el mensaje más frecuente de los disparadores merece un código propio.
    if (e.message.includes('FINALIZADO y es de solo lectura')) {
      return new ErrorIntegridad('PROCESO_FINALIZADO', 'El proceso está finalizado y es de solo lectura. Para valorar otra vez, inicie un proceso nuevo.');
    }
    const m = /((?:INT|RN|VAL)-\d{2}(?:-\d{2})?):\s*(.+)$/.exec(e.message);
    if (m?.[1] !== undefined && m[2] !== undefined) return new ErrorIntegridad(m[1], m[2]);
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new ErrorIntegridad('REGISTRO_DUPLICADO', 'Ya existe un registro con esos datos únicos.', {
        detalle: e.message,
      });
    }
    if (e.code === 'SQLITE_CONSTRAINT_CHECK') {
      return new ErrorIntegridad('VALOR_FUERA_DE_CATALOGO', 'Un valor no cumple las restricciones de la base.', {
        detalle: e.message,
      });
    }
    if (e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return new ErrorIntegridad('REFERENCIA_INVALIDA', 'El registro referencia a otro que no existe o está en uso.', {
        detalle: e.message,
      });
    }
    return new ErrorIntegridad(e.code, e.message);
  }
  return new ErrorInfraestructura(e.code, e.message);
}
