import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { responsable } from '../../../infraestructura/db/esquema';
import type { ResponsableDto } from '../../../../compartido/dtos/responsable';
import type { Uuid, MarcaTiempo } from '../../../../compartido/tipos/basicos';

type Fila = typeof responsable.$inferSelect;
export type NuevoResponsable = typeof responsable.$inferInsert;

function aDto(f: Fila): ResponsableDto {
  return {
    id: f.id as Uuid,
    entidadId: f.entidadId as Uuid,
    nombreCompleto: f.nombreCompleto,
    documentoIdentidad: f.documentoIdentidad,
    perfil: f.perfil,
    cargo: f.cargo,
    tarjetaProfesional: f.tarjetaProfesional,
    registroRaa: f.registroRaa,
    esExterno: f.esExterno,
    activo: f.activo,
    creadoEn: f.creadoEn as MarcaTiempo,
    actualizadoEn: f.actualizadoEn as MarcaTiempo,
  };
}

/** Toda la superficie de Drizzle queda aquí (ADR-005). */
export const responsableRepo = {
  listar(db: BaseDatos, entidadId: string, incluirInactivos: boolean): ResponsableDto[] {
    const condicion = incluirInactivos
      ? eq(responsable.entidadId, entidadId)
      : and(eq(responsable.entidadId, entidadId), eq(responsable.activo, true));
    return db.select().from(responsable).where(condicion).orderBy(responsable.nombreCompleto).all().map(aDto);
  },

  porId(db: BaseDatos, id: string): ResponsableDto | null {
    const fila = db.select().from(responsable).where(eq(responsable.id, id)).get();
    return fila === undefined ? null : aDto(fila);
  },

  porDocumento(db: BaseDatos, entidadId: string, documentoIdentidad: string): ResponsableDto | null {
    const fila = db
      .select()
      .from(responsable)
      .where(and(eq(responsable.entidadId, entidadId), eq(responsable.documentoIdentidad, documentoIdentidad)))
      .get();
    return fila === undefined ? null : aDto(fila);
  },

  insertar(db: BaseDatos, datos: NuevoResponsable): ResponsableDto {
    const fila = db.insert(responsable).values(datos).returning().get();
    return aDto(fila);
  },

  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevoResponsable>, actualizadoEn: string): ResponsableDto {
    const fila = db
      .update(responsable)
      .set({ ...cambios, actualizadoEn })
      .where(eq(responsable.id, id))
      .returning()
      .get();
    if (fila === undefined) throw new Error(`Responsable ${id} no existe`);
    return aDto(fila);
  },
};
