import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { claseActivo } from '../../../infraestructura/db/esquema';
import type { ClaseActivoDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid } from '../../../../compartido/tipos/basicos';
import { aX10k, desdeX10k } from '../../../../compartido/motor/dinero';
import { comoX10k } from '../../../../compartido/tipos/basicos';

type Fila = typeof claseActivo.$inferSelect;
export type NuevaClase = typeof claseActivo.$inferInsert;

function aDto(f: Fila): ClaseActivoDto {
  return {
    id: f.id as Uuid,
    entidadId: f.entidadId as Uuid,
    codigo: f.codigo,
    nombre: f.nombre,
    subcuentaContable: f.subcuentaContable,
    vidaUtilContableMeses: f.vidaUtilContableMeses,
    vidaUtilTecnicaAnios: f.vidaUtilTecnicaAnios === null ? null : desdeX10k(comoX10k(f.vidaUtilTecnicaAnios)).toNumber(),
    esDepreciable: f.esDepreciable,
    requiereHojaVida: f.requiereHojaVida,
    requiereInvima: f.requiereInvima,
    responsableTecnico: f.responsableTecnico,
    activo: f.activo,
  };
}

/** Años con decimales → entero ×10.000 (RED-03). */
export function aniosAX10k(anios: number | null | undefined): number | null {
  return anios === null || anios === undefined ? null : aX10k(anios);
}

export const claseRepo = {
  listar(db: BaseDatos, entidadId: string, incluirInactivas: boolean): ClaseActivoDto[] {
    const cond = incluirInactivas
      ? eq(claseActivo.entidadId, entidadId)
      : and(eq(claseActivo.entidadId, entidadId), eq(claseActivo.activo, true));
    return db.select().from(claseActivo).where(cond).orderBy(claseActivo.codigo).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): ClaseActivoDto | null {
    const f = db.select().from(claseActivo).where(eq(claseActivo.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  porCodigo(db: BaseDatos, entidadId: string, codigo: string): ClaseActivoDto | null {
    const f = db.select().from(claseActivo).where(and(eq(claseActivo.entidadId, entidadId), eq(claseActivo.codigo, codigo))).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevaClase): ClaseActivoDto {
    return aDto(db.insert(claseActivo).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevaClase>, actualizadoEn: string): ClaseActivoDto {
    const f = db.update(claseActivo).set({ ...cambios, actualizadoEn }).where(eq(claseActivo.id, id)).returning().get();
    if (f === undefined) throw new Error(`Clase ${id} no existe`);
    return aDto(f);
  },
};
