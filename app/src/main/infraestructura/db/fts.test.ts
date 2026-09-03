/** T-B-03 — búsqueda FTS5 sincronizada por triggers (plan 2.4 §3). */
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { abrirBaseDePrueba, sembrarMinimo, crearBien } from './pruebas/semilla';
import * as esquema from './esquema';

function buscar(sqlite: Awaited<ReturnType<typeof abrirBaseDePrueba>>['sqlite'], termino: string) {
  return (
    sqlite.prepare('SELECT bien_id FROM bien_fts WHERE bien_fts MATCH ?').all(termino) as {
      bien_id: string;
    }[]
  ).map((f) => f.bien_id);
}

describe('bien_fts', () => {
  it('indexa al insertar, ignora mayúsculas y tildes', async () => {
    const { sqlite, db } = await abrirBaseDePrueba();
    const ids = sembrarMinimo(db);
    const monitor = crearBien(db, ids, { descripcionFuncional: 'Monitor de signos vitales' });
    const camara = crearBien(db, ids, {
      descripcionFuncional: 'Cámara de flujo laminar',
      marca: 'ESCO',
      serie: 'SN-778',
    });

    expect(buscar(sqlite, 'signos')).toEqual([monitor]);
    expect(buscar(sqlite, 'CAMARA')).toEqual([camara]);
    expect(buscar(sqlite, 'esco')).toEqual([camara]);
    expect(buscar(sqlite, '"SN-778"')).toEqual([camara]);
  });

  it('se actualiza al modificar la descripción', async () => {
    const { sqlite, db } = await abrirBaseDePrueba();
    const ids = sembrarMinimo(db);
    const id = crearBien(db, ids, { descripcionFuncional: 'Ecógrafo portátil' });
    expect(buscar(sqlite, 'ecografo')).toEqual([id]);

    db.update(esquema.bien)
      .set({ descripcionFuncional: 'Electrocardiógrafo de 12 derivaciones' })
      .where(eq(esquema.bien.id, id))
      .run();

    expect(buscar(sqlite, 'ecografo')).toEqual([]);
    expect(buscar(sqlite, 'electrocardiografo')).toEqual([id]);
  });
});
