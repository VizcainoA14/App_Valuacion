import { and, eq, inArray } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { sede, servicio } from '../../../infraestructura/db/esquema';
import type { ServicioDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid } from '../../../../compartido/tipos/basicos';

type Fila = typeof servicio.$inferSelect;
export type NuevoServicio = typeof servicio.$inferInsert;

function aDto(f: Fila): ServicioDto {
  return {
    id: f.id as Uuid,
    sedeId: f.sedeId as Uuid,
    codigo: f.codigo,
    nombre: f.nombre,
    tipo: f.tipo,
    responsable: f.responsable,
    activo: f.activo,
  };
}

export const servicioRepo = {
  listarPorEntidad(db: BaseDatos, entidadId: string, incluirInactivos: boolean): ServicioDto[] {
    const sedes = db.select({ id: sede.id }).from(sede).where(eq(sede.entidadId, entidadId)).all().map((s) => s.id);
    if (sedes.length === 0) return [];
    const cond = incluirInactivos ? inArray(servicio.sedeId, sedes) : and(inArray(servicio.sedeId, sedes), eq(servicio.activo, true));
    return db.select().from(servicio).where(cond).orderBy(servicio.sedeId, servicio.codigo).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): ServicioDto | null {
    const f = db.select().from(servicio).where(eq(servicio.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  porCodigo(db: BaseDatos, sedeId: string, codigo: string): ServicioDto | null {
    const f = db.select().from(servicio).where(and(eq(servicio.sedeId, sedeId), eq(servicio.codigo, codigo))).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevoServicio): ServicioDto {
    return aDto(db.insert(servicio).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevoServicio>, actualizadoEn: string): ServicioDto {
    const f = db.update(servicio).set({ ...cambios, actualizadoEn }).where(eq(servicio.id, id)).returning().get();
    if (f === undefined) throw new Error(`Servicio ${id} no existe`);
    return aDto(f);
  },
};
