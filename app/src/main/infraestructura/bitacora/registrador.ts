/**
 * TR-06 — Bitácora (T-B-09; ANEXO_B §7.1, RNF-07).
 * Evidencia de auditoría: vive en la base, nunca se borra, y para los ocho campos
 * sensibles exige justificación. Se escribe con la MISMA conexión que el caso de
 * uso, así que dentro de una transacción del middleware ambos confirman o
 * ninguno. No es el registro técnico (`arranque/registro.ts`).
 */
import type { ConexionSqlite } from '../db/conexion';
import { nuevoId } from '../db/identificadores';
import type { Uuid } from '../../../compartido/tipos/basicos';
import type { AccionBitacora } from '../../../compartido/enums/plataforma';
import { CAMPOS_SENSIBLES } from '../../../compartido/enums/plataforma';
import { ErrorValidacion } from '../../../compartido/errores';

export interface EntradaBitacora {
  readonly entidadAfectada: string;
  readonly registroId: string;
  readonly accion: AccionBitacora;
  readonly campo?: string | null;
  readonly valorAnterior?: string | null;
  readonly valorNuevo?: string | null;
  readonly justificacion?: string | null;
}

export interface ContextoCambio {
  readonly entidadAfectada: string;
  readonly registroId: string;
  readonly justificacion?: string | null;
}

export interface Bitacora {
  registrar(entrada: EntradaBitacora): Uuid;
  /**
   * Una fila por campo que cambió. Si cambia un campo sensible sin justificación,
   * lanza `ErrorValidacion` ANTES de escribir nada.
   */
  registrarCambios(
    contexto: ContextoCambio,
    anterior: Readonly<Record<string, unknown>>,
    nuevo: Readonly<Record<string, unknown>>,
  ): number;
}

export function esCampoSensible(campo: string): boolean {
  return (CAMPOS_SENSIBLES as readonly string[]).includes(campo);
}

function serializar(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  return typeof valor === 'string' ? valor : JSON.stringify(valor);
}

export function crearBitacora(
  sqlite: ConexionSqlite,
  origen: string,
  ahoraIso: () => string,
): Bitacora {
  const insertar = sqlite.prepare(
    `INSERT INTO bitacora (id, entidad_afectada, registro_id, accion, campo,
       valor_anterior, valor_nuevo, fecha, origen, justificacion)
     VALUES (@id, @entidadAfectada, @registroId, @accion, @campo,
       @valorAnterior, @valorNuevo, @fecha, @origen, @justificacion)`,
  );

  const registrar = (e: EntradaBitacora): Uuid => {
    const id = nuevoId();
    insertar.run({
      id,
      entidadAfectada: e.entidadAfectada,
      registroId: e.registroId,
      accion: e.accion,
      campo: e.campo ?? null,
      valorAnterior: e.valorAnterior ?? null,
      valorNuevo: e.valorNuevo ?? null,
      fecha: ahoraIso(),
      origen,
      justificacion: e.justificacion ?? null,
    });
    return id;
  };

  return {
    registrar,
    registrarCambios(contexto, anterior, nuevo) {
      const campos = Object.keys(nuevo).filter(
        (campo) => serializar(anterior[campo]) !== serializar(nuevo[campo]),
      );
      const justificacion = contexto.justificacion?.trim() ?? '';
      const sensiblesSinJustificar = campos.filter((c) => esCampoSensible(c) && justificacion === '');
      if (sensiblesSinJustificar.length > 0) {
        throw new ErrorValidacion(
          'JUSTIFICACION_REQUERIDA',
          `Modificar ${sensiblesSinJustificar.join(', ')} exige una justificación (ANEXO_B §7.1).`,
          { campo: sensiblesSinJustificar[0] ?? 'justificacion' },
        );
      }
      for (const campo of campos) {
        registrar({
          entidadAfectada: contexto.entidadAfectada,
          registroId: contexto.registroId,
          accion: 'ACTUALIZAR',
          campo,
          valorAnterior: serializar(anterior[campo]),
          valorNuevo: serializar(nuevo[campo]),
          justificacion: justificacion === '' ? null : justificacion,
        });
      }
      return campos.length;
    },
  };
}
