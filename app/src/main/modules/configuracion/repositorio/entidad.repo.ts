import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { entidad } from '../../../infraestructura/db/esquema';
import type { EntidadDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid, MarcaTiempo } from '../../../../compartido/tipos/basicos';

type Fila = typeof entidad.$inferSelect;
export type NuevaEntidad = typeof entidad.$inferInsert;

function aDto(f: Fila): EntidadDto {
  return {
    id: f.id as Uuid,
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

export const entidadRepo = {
  listar(db: BaseDatos): EntidadDto[] {
    return db.select().from(entidad).orderBy(entidad.razonSocial).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): EntidadDto | null {
    const f = db.select().from(entidad).where(eq(entidad.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  porNit(db: BaseDatos, nit: string): EntidadDto | null {
    const f = db.select().from(entidad).where(eq(entidad.nit, nit)).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevaEntidad): EntidadDto {
    return aDto(db.insert(entidad).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevaEntidad>, actualizadoEn: string): EntidadDto {
    const f = db.update(entidad).set({ ...cambios, actualizadoEn }).where(eq(entidad.id, id)).returning().get();
    if (f === undefined) throw new Error(`Entidad ${id} no existe`);
    return aDto(f);
  },
};
