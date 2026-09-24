import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { convencionCodigo, abreviaturaTipo } from '../../../infraestructura/db/esquema';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import type { AbreviaturaDto, ConvencionCodigoDto, SegmentoCodigo } from '../../../../compartido/dtos/configuracion';
import type { Uuid } from '../../../../compartido/tipos/basicos';
import { CONVENCION_GENERICA, LONGITUD_CONSECUTIVO_GENERICA } from '../../../../compartido/reglas/codigoInstitucional';

export const convencionRepo = {
  obtener(db: BaseDatos, procesoId: string): ConvencionCodigoDto {
    const f = db.select().from(convencionCodigo).where(eq(convencionCodigo.procesoId, procesoId)).get();
    if (f === undefined) {
      return { procesoId: procesoId as Uuid, segmentos: CONVENCION_GENERICA, longitudConsecutivo: LONGITUD_CONSECUTIVO_GENERICA, definida: false };
    }
    return {
      procesoId: procesoId as Uuid,
      segmentos: JSON.parse(f.segmentosJson) as SegmentoCodigo[],
      longitudConsecutivo: f.longitudConsecutivo,
      definida: true,
    };
  },

  guardar(db: BaseDatos, procesoId: string, segmentos: readonly SegmentoCodigo[], longitudConsecutivo: number, actualizadoEn: string): ConvencionCodigoDto {
    const segmentosJson = JSON.stringify(segmentos);
    db.insert(convencionCodigo)
      .values({ id: nuevoId(), procesoId, segmentosJson, longitudConsecutivo, actualizadoEn })
      .onConflictDoUpdate({ target: convencionCodigo.procesoId, set: { segmentosJson, longitudConsecutivo, actualizadoEn } })
      .run();
    return { procesoId: procesoId as Uuid, segmentos, longitudConsecutivo, definida: true };
  },
};

export const abreviaturaRepo = {
  listar(db: BaseDatos, procesoId: string): AbreviaturaDto[] {
    return db
      .select()
      .from(abreviaturaTipo)
      .where(eq(abreviaturaTipo.procesoId, procesoId))
      .orderBy(abreviaturaTipo.abreviatura)
      .all()
      .map((f) => ({ id: f.id as Uuid, abreviatura: f.abreviatura, descripcion: f.descripcion }));
  },

  /** Reemplaza el catálogo completo de la entidad. */
  reemplazar(db: BaseDatos, procesoId: string, abreviaturas: readonly { abreviatura: string; descripcion: string }[]): AbreviaturaDto[] {
    db.delete(abreviaturaTipo).where(eq(abreviaturaTipo.procesoId, procesoId)).run();
    if (abreviaturas.length > 0) {
      db.insert(abreviaturaTipo)
        .values(abreviaturas.map((a) => ({ id: nuevoId(), procesoId, abreviatura: a.abreviatura.toUpperCase(), descripcion: a.descripcion })))
        .run();
    }
    return abreviaturaRepo.listar(db, procesoId);
  },
};
