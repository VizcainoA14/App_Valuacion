import { desc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { ejercicio } from '../../../infraestructura/db/esquema';
import type { EjercicioDto } from '../../../../compartido/dtos/configuracion';
import type { Uuid, FechaIso, MarcaTiempo } from '../../../../compartido/tipos/basicos';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';

type Fila = typeof ejercicio.$inferSelect;
export type NuevoEjercicio = typeof ejercicio.$inferInsert;

function aDto(f: Fila): EjercicioDto {
  return {
    id: f.id as Uuid,
    entidadId: f.entidadId as Uuid,
    nombre: f.nombre,
    fechaCorte: f.fechaCorte as FechaIso,
    estado: f.estado,
    pasoActual: f.pasoActual,
    parametrosCongelados: EsquemaParametrosCalculo.parse(JSON.parse(f.parametrosCongeladosJson)),
    contratoNumero: f.contratoNumero,
    creadoPorResponsableId: f.creadoPorResponsableId as Uuid,
    creadoEn: f.creadoEn as MarcaTiempo,
    cerradoEn: f.cerradoEn as MarcaTiempo | null,
    inmutable: f.inmutable,
  };
}

export const ejercicioRepo = {
  listar(db: BaseDatos, entidadId: string): EjercicioDto[] {
    return db.select().from(ejercicio).where(eq(ejercicio.entidadId, entidadId)).orderBy(desc(ejercicio.fechaCorte)).all().map(aDto);
  },
  porId(db: BaseDatos, id: string): EjercicioDto | null {
    const f = db.select().from(ejercicio).where(eq(ejercicio.id, id)).get();
    return f === undefined ? null : aDto(f);
  },
  insertar(db: BaseDatos, datos: NuevoEjercicio): EjercicioDto {
    return aDto(db.insert(ejercicio).values(datos).returning().get());
  },
  actualizar(db: BaseDatos, id: string, cambios: Partial<NuevoEjercicio>): EjercicioDto {
    const f = db.update(ejercicio).set(cambios).where(eq(ejercicio.id, id)).returning().get();
    if (f === undefined) throw new Error(`Ejercicio ${id} no existe`);
    return aDto(f);
  },
};
