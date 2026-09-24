/** T-B-03 — el esquema Drizzle (tipos) y la base migrada (SQL) no divergen. */
import { describe, expect, it } from 'vitest';
import { getTableName, getTableColumns, type Table } from 'drizzle-orm';
import * as esquema from './esquema';
import { abrirBaseDePrueba } from './pruebas/semilla';
import { TODOS_LOS_CATALOGOS } from '../../../compartido/enums';

const tablasDrizzle = Object.values(esquema as Record<string, unknown>).filter(
  (v): v is Table => typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in v,
);

describe('esquema Drizzle ↔ base migrada', () => {
  it('define 18 tablas (ADR-028)', () => {
    expect(tablasDrizzle).toHaveLength(18);
  });

  it('toda columna del esquema existe en la base con el mismo nombre', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    for (const tabla of tablasDrizzle) {
      const nombre = getTableName(tabla);
      const enBase = new Set(
        (sqlite.pragma(`table_info(${nombre})`) as { name: string }[]).map((c) => c.name),
      );
      for (const col of Object.values(getTableColumns(tabla))) {
        expect(enBase, `${nombre}.${col.name}`).toContain(col.name);
      }
    }
  });

  it('los sufijos físicos son coherentes: _cent y _x10k son INTEGER; fechas y marcas, TEXT', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    for (const tabla of tablasDrizzle) {
      const info = sqlite.pragma(`table_info(${getTableName(tabla)})`) as {
        name: string;
        type: string;
      }[];
      for (const c of info) {
        const tipo = c.type.toLowerCase();
        if (c.name.endsWith('_cent') || c.name.endsWith('_x10k')) expect(tipo).toBe('integer');
        if (c.name.startsWith('fecha') || c.name.endsWith('_en')) expect(tipo).toBe('text');
      }
    }
  });

  it('cada CHECK de enum acepta sus valores y rechaza un valor extraño', async () => {
    const { sqlite } = await abrirBaseDePrueba();
    const catalogo = TODOS_LOS_CATALOGOS.find((c) => c.nombre === 'nivel_complejidad');
    expect(catalogo).toBeDefined();
    const insertar = sqlite.prepare(
      `INSERT INTO proceso (id, nombre, fecha_corte, razon_social, nit, municipio, departamento, nivel_complejidad, nombre_gerente, direccion)
       VALUES (?, 'P', '2025-06-30', 'X', ?, 'M', 'D', ?, 'G', 'Dir')`,
    );
    expect(() => insertar.run('a', '1', 'II')).not.toThrow();
    expect(() => insertar.run('b', '2', 'IV')).toThrow(/CHECK/);
  });
});
