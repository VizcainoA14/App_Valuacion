/**
 * ADR-027 — Los firmantes del informe dejaron de ser un catálogo de personas y
 * pasaron a ser dos campos de la entidad: **Gerente** y **Contador**.
 *
 * La tabla `responsable` sobrevive, pero como **detalle interno de integridad
 * referencial**, no como concepto del producto: catorce columnas del esquema
 * apuntan a ella (`ejercicio.creado_por_responsable_id`,
 * `propuesta_baja.especialista_id`, las actas del Comité, el cierre…), y
 * eliminarla obligaría a reconstruir catorce tablas en SQLite a cambio de nada
 * que el usuario vea. Las extensiones que aún no se construyen —Comité,
 * resoluciones, entrega— la necesitan intacta.
 *
 * Así que este repositorio mantiene **exactamente dos filas por entidad**,
 * derivadas de lo que el hospital escribió en sus datos, y las vuelve a
 * sincronizar cada vez que esos datos cambian. Nadie las administra a mano;
 * no hay pantalla, ni canal IPC, ni catálogo.
 */
import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { responsable } from '../../../infraestructura/db/esquema';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import type { Uuid } from '../../../../compartido/tipos/basicos';

/** Lo que la entidad aporta para firmar. */
export interface DatosFirmantes {
  readonly nombreGerente: string;
  readonly nombreContador: string | null;
  readonly tarjetaProfesionalContador: string | null;
}

type Perfil = 'GERENTE' | 'CONTADOR';

function sincronizarUno(
  db: BaseDatos,
  entidadId: string,
  perfil: Perfil,
  nombre: string,
  cargo: string,
  tarjeta: string | null,
  ahora: string,
): Uuid {
  const existente = db
    .select({ id: responsable.id })
    .from(responsable)
    .where(and(eq(responsable.entidadId, entidadId), eq(responsable.perfil, perfil)))
    .get();

  if (existente !== undefined) {
    db.update(responsable)
      .set({ nombreCompleto: nombre, cargo, tarjetaProfesional: tarjeta, activo: true, actualizadoEn: ahora })
      .where(eq(responsable.id, existente.id))
      .run();
    return existente.id as Uuid;
  }

  const id = nuevoId();
  db.insert(responsable)
    .values({
      id,
      entidadId,
      nombreCompleto: nombre,
      // No se le pide el documento al hospital: el informe firma por cargo.
      documentoIdentidad: 'N/D',
      perfil,
      cargo,
      tarjetaProfesional: tarjeta,
      registroRaa: null,
      esExterno: false,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    .run();
  return id as Uuid;
}

export const firmanteRepo = {
  /**
   * Deja las dos filas al día y devuelve el id del Gerente, que es el
   * representante legal y a quien se atribuye lo que el esquema exige atribuir.
   */
  sincronizar(db: BaseDatos, entidadId: string, datos: DatosFirmantes, ahora: string): Uuid {
    const gerenteId = sincronizarUno(db, entidadId, 'GERENTE', datos.nombreGerente, 'Gerente', null, ahora);
    sincronizarUno(
      db,
      entidadId,
      'CONTADOR',
      datos.nombreContador ?? 'Por designar',
      'Contador',
      datos.tarjetaProfesionalContador,
      ahora,
    );
    return gerenteId;
  },

  /**
   * El Gerente de la entidad. Nunca debería faltar —se crea al crear la
   * entidad—, pero una base anterior a ADR-027 puede no tenerlo.
   */
  gerente(db: BaseDatos, entidadId: string): Uuid | null {
    const fila = db
      .select({ id: responsable.id })
      .from(responsable)
      .where(and(eq(responsable.entidadId, entidadId), eq(responsable.perfil, 'GERENTE')))
      .get();
    return fila === undefined ? null : (fila.id as Uuid);
  },
};
