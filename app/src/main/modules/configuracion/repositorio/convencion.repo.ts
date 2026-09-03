import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { convencionCodigo, abreviaturaTipo } from '../../../infraestructura/db/esquema';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import type { AbreviaturaDto, ConvencionCodigoDto, SegmentoCodigo } from '../../../../compartido/dtos/configuracion';
import type { Uuid } from '../../../../compartido/tipos/basicos';
import { CONVENCION_GENERICA, LONGITUD_CONSECUTIVO_GENERICA } from '../../../../compartido/reglas/codigoInstitucional';

export const convencionRepo = {
  obtener(db: BaseDatos, entidadId: string): ConvencionCodigoDto {
    const f = db.select().from(convencionCodigo).where(eq(convencionCodigo.entidadId, entidadId)).get();
    if (f === undefined) {
      return { entidadId: entidadId as Uuid, segmentos: CONVENCION_GENERICA, longitudConsecutivo: LONGITUD_CONSECUTIVO_GENERICA, definida: false };
    }
    return {
      entidadId: entidadId as Uuid,
      segmentos: JSON.parse(f.segmentosJson) as SegmentoCodigo[],
      longitudConsecutivo: f.longitudConsecutivo,
      definida: true,
    };
  },

  guardar(db: BaseDatos, entidadId: string, segmentos: readonly SegmentoCodigo[], longitudConsecutivo: number, actualizadoEn: string): ConvencionCodigoDto {
    const segmentosJson = JSON.stringify(segmentos);
    db.insert(convencionCodigo)
      .values({ id: nuevoId(), entidadId, segmentosJson, longitudConsecutivo, actualizadoEn })
      .onConflictDoUpdate({ target: convencionCodigo.entidadId, set: { segmentosJson, longitudConsecutivo, actualizadoEn } })
      .run();
    return { entidadId: entidadId as Uuid, segmentos, longitudConsecutivo, definida: true };
  },
};

export const abreviaturaRepo = {
  listar(db: BaseDatos, entidadId: string): AbreviaturaDto[] {
    return db
      .select()
      .from(abreviaturaTipo)
      .where(eq(abreviaturaTipo.entidadId, entidadId))
      .orderBy(abreviaturaTipo.abreviatura)
      .all()
      .map((f) => ({ id: f.id as Uuid, abreviatura: f.abreviatura, descripcion: f.descripcion }));
  },

  /** Reemplaza el catálogo completo de la entidad. */
  reemplazar(db: BaseDatos, entidadId: string, abreviaturas: readonly { abreviatura: string; descripcion: string }[]): AbreviaturaDto[] {
    db.delete(abreviaturaTipo).where(eq(abreviaturaTipo.entidadId, entidadId)).run();
    if (abreviaturas.length > 0) {
      db.insert(abreviaturaTipo)
        .values(abreviaturas.map((a) => ({ id: nuevoId(), entidadId, abreviatura: a.abreviatura.toUpperCase(), descripcion: a.descripcion })))
        .run();
    }
    return abreviaturaRepo.listar(db, entidadId);
  },
};
