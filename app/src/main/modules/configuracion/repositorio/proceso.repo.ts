import { desc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { proceso } from '../../../infraestructura/db/esquema';
import type { ProcesoDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid, FechaIso, MarcaTiempo } from '../../../../compartido/tipos/basicos';

type Fila = typeof proceso.$inferSelect;
export type NuevoProceso = typeof proceso.$inferInsert;

function aDto(f: Fila): ProcesoDto {
  return {
    id: f.id as Uuid,
    nombre: f.nombre,
    fechaCorte: f.fechaCorte as FechaIso,
    estado: f.estado,
    finalizadoEn: f.finalizadoEn as MarcaTiempo | null,
    razonSocial: f.razonSocial,
    nit: f.nit,
    municipio: f.municipio,
    departamento: f.departamento,
    nivelComplejidad: f.nivelComplejidad,
    nombreGerente: f.nombreGerente,
    actoNombramientoGerente: f.actoNombramientoGerente,
    direccion: f.direccion,
    telefono: f.telefono,
    email: f.email,
    logoUrl: f.logoUrl,
    esDemostracion: f.esDemostracion,
    creadoEn: f.creadoEn as MarcaTiempo,
    actualizadoEn: f.actualizadoEn as MarcaTiempo,
  };
}

export const procesoRepo = {
  /** Los más recientes primero: lo que se está trabajando está arriba. */
  listar(db: BaseDatos): ProcesoDto[] {
    return db.select().from(proceso).orderBy(desc(proceso.creadoEn)).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): ProcesoDto | null {
    const f = db.select().from(proceso).where(eq(proceso.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevoProceso): ProcesoDto {
    return aDto(db.insert(proceso).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevoProceso>, actualizadoEn: string): ProcesoDto {
    const f = db.update(proceso).set({ ...cambios, actualizadoEn }).where(eq(proceso.id, id)).returning().get();
    if (f === undefined) throw new Error(`Proceso ${id} no existe`);
    return aDto(f);
  },
};
