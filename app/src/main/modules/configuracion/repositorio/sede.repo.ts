import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { sede } from '../../../infraestructura/db/esquema';
import type { SedeDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid } from '../../../../compartido/tipos/basicos';

type Fila = typeof sede.$inferSelect;
export type NuevaSede = typeof sede.$inferInsert;

function aDto(f: Fila): SedeDto {
  return {
    id: f.id as Uuid,
    procesoId: f.procesoId as Uuid,
    codigo: f.codigo,
    nombre: f.nombre,
    direccion: f.direccion,
    municipio: f.municipio,
    activa: f.activa,
  };
}

export const sedeRepo = {
  listar(db: BaseDatos, procesoId: string, incluirInactivas: boolean): SedeDto[] {
    const cond = incluirInactivas ? eq(sede.procesoId, procesoId) : and(eq(sede.procesoId, procesoId), eq(sede.activa, true));
    return db.select().from(sede).where(cond).orderBy(sede.codigo).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): SedeDto | null {
    const f = db.select().from(sede).where(eq(sede.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  porCodigo(db: BaseDatos, procesoId: string, codigo: string): SedeDto | null {
    const f = db.select().from(sede).where(and(eq(sede.procesoId, procesoId), eq(sede.codigo, codigo))).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevaSede): SedeDto {
    return aDto(db.insert(sede).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevaSede>, actualizadoEn: string): SedeDto {
    const f = db.update(sede).set({ ...cambios, actualizadoEn }).where(eq(sede.id, id)).returning().get();
    if (f === undefined) throw new Error(`Sede ${id} no existe`);
    return aDto(f);
  },
};
