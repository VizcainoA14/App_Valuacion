import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../infraestructura/db/conexion';
import { parametroCalculo } from '../../../infraestructura/db/esquema';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import {
  parametrosDesdeFilas,
  serializarParametro,
  TIPO_DATO_PARAMETRO_DE,
  CLAVES_PARAMETRO,
  type ParametrosCalculo,
  type ClaveParametro,
} from '../../../../compartido/parametros/parametrosCalculo';

export const parametroRepo = {
  /** Lo que falte en la base toma el valor por defecto de ANEXO_B §2.5. */
  obtener(db: BaseDatos, procesoId: string): ParametrosCalculo {
    const filas = db
      .select({ clave: parametroCalculo.clave, valor: parametroCalculo.valor })
      .from(parametroCalculo)
      .where(eq(parametroCalculo.procesoId, procesoId))
      .all();
    return parametrosDesdeFilas(filas);
  },

  /** Escribe TODAS las claves (upsert por entidad+clave). */
  guardar(db: BaseDatos, procesoId: string, parametros: ParametrosCalculo, actualizadoEn: string): void {
    for (const clave of CLAVES_PARAMETRO) {
      const valor = serializarParametro(clave, parametros[clave]);
      db.insert(parametroCalculo)
        .values({ id: nuevoId(), procesoId, clave, valor, tipoDato: TIPO_DATO_PARAMETRO_DE[clave], actualizadoEn })
        .onConflictDoUpdate({
          target: [parametroCalculo.procesoId, parametroCalculo.clave],
          set: { valor, tipoDato: TIPO_DATO_PARAMETRO_DE[clave], actualizadoEn },
        })
        .run();
    }
  },

  claves(): readonly ClaveParametro[] {
    return CLAVES_PARAMETRO;
  },
};
