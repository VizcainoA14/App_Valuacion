/**
 * TR-03 (ADR-026 etapa 2) — la aplicación entrega sus plantillas ya parametrizadas
 * con los catálogos del hospital (ANEXO_A §6.1). Se comprueba contra los libros
 * reales de `especificacion/plantillas`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { PLANTILLAS } from '../../infraestructura/documental/excel/catalogoPlantillas';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-plantillas-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('plantilla:listar', () => {
  it('publica las 28 plantillas de ANEXO_A §1 y todas están presentes en la instalación', async () => {
    const { registro } = await arnesPaso01();
    const lista = valor(await registro.invocar('plantilla:listar', undefined));
    expect(lista).toHaveLength(28);
    expect(lista).toHaveLength(PLANTILLAS.length);

    const faltantes = lista.filter((p) => !p.disponible).map((p) => p.codigo);
    expect(faltantes, `sin archivo: ${faltantes.join(', ')}`).toEqual([]);
    expect(lista.filter((p) => p.formato === 'xlsx')).toHaveLength(20);
    expect(lista.filter((p) => p.formato === 'docx')).toHaveLength(8);
  });

  it('marca las cinco que el hospital diligencia y puede volver a cargar', async () => {
    const { registro } = await arnesPaso01();
    const importables = valor(await registro.invocar('plantilla:listar', undefined)).filter((p) => p.seDiligencia && p.importable);
    expect(importables.map((p) => p.codigo)).toEqual(['PL-01', 'PL-02', 'PL-02b', 'PL-03', 'PL-05']);
  });
});

describe('plantilla:descargar', () => {
  it('PL-03 sale con las clases, sedes y servicios del hospital como listas desplegables', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const ejercicio = valor(await a.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    a.guardarEn(dir);

    const r = valor(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-03', entidadId: demo.id, ejercicioId: ejercicio?.id }));
    if (r === null) throw new Error('no entregó');
    expect([...r.catalogosInyectados].sort()).toEqual(['clases', 'sedes', 'servicios']);
    expect(existsSync(r.ruta)).toBe(true);
    expect(a.reveladas).toContain(r.ruta); // se le muestra dónde quedó

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(r.ruta);
    const hoja = libro.getWorksheet('INVENTARIO');
    if (hoja === undefined) throw new Error('sin hoja INVENTARIO');

    // Membrete con la razón social y la fecha de corte reales, no los marcadores.
    const encabezado = JSON.stringify(hoja.getRow(1).values) + JSON.stringify(hoja.getRow(3).values);
    expect(encabezado).toContain('HOSPITAL DE DEMOSTRACIÓN');
    expect(encabezado).not.toContain('{{ENTIDAD_RAZON_SOCIAL}}');
    expect(encabezado).toContain('2025-06-30');

    // Listas desplegables en las tres columnas declaradas, desde la primera fila de captura.
    const validacionClase = hoja.getCell('D8').dataValidation;
    expect(validacionClase?.type).toBe('list');
    const formulaClase = String(validacionClase?.formulae?.[0] ?? '');
    expect(formulaClase).toMatch(/Equipo médico-científico|CATALOGOS!/);
    expect(hoja.getCell('H8').dataValidation?.type).toBe('list');
    expect(String(hoja.getCell('H8').dataValidation?.formulae?.[0] ?? '')).toContain('01');
    expect(hoja.getCell('I8').dataValidation?.type).toBe('list');
    expect(String(hoja.getCell('I8').dataValidation?.formulae?.[0] ?? '')).toContain('Urgencias');

    // La fila de ejemplo se conserva: el importador la reconoce por su color y la omite.
    expect(hoja.getCell('A7').value).toBeTruthy();
  });

  it('lo entregado se puede volver a importar sin perder nada (ida y vuelta)', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    a.guardarEn(dir);

    const r = valor(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-02b', entidadId: demo.id }));
    if (r === null) throw new Error('no entregó');

    // El hospital lo diligencia…
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(r.ruta);
    const sedes = libro.getWorksheet('SEDES');
    if (sedes === undefined) throw new Error('sin hoja SEDES');
    const fila = sedes.getRow(8);
    fila.values = ['03', 'Sede nueva', 'Calle 9', 'Villa Ejemplo', 'SI'];
    fila.commit();
    await libro.xlsx.writeFile(r.ruta);

    // …y lo vuelve a cargar.
    a.seleccionarArchivo(r.ruta);
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: demo.id, plantilla: 'PL-02b' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.hojas.find((h) => h.hoja === 'SEDES')?.filaEncabezados).toBe(6);
    expect(informe.errores).toBe(0);

    valor(await a.registro.invocar('importacion:confirmar', { token: informe.token }));
    expect(valor(await a.registro.invocar('sede:listar', { entidadId: demo.id })).map((s) => s.codigo)).toContain('03');
  });

  it('sin entidad configurada se entrega igual, pero sin listas desplegables', async () => {
    const a = await arnesPaso01();
    a.guardarEn(dir);
    const r = valor(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-03' }));
    expect(r?.catalogosInyectados).toEqual([]);
    expect(existsSync(r?.ruta ?? '')).toBe(true);
  });

  it('si el usuario cancela el diálogo no se entrega nada', async () => {
    const a = await arnesPaso01();
    a.guardarEn(null);
    expect(valor(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-03' }))).toBeNull();
    expect(readdirSync(dir)).toEqual([]);
  });

  it('un código inexistente se rechaza con error de validación', async () => {
    const a = await arnesPaso01();
    a.guardarEn(dir);
    expect(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-99' })).toMatchObject({ ok: false, error: { codigo: 'PLANTILLA_DESCONOCIDA' } });
  });
});

describe('plantilla:descargarPaquete', () => {
  it('entrega de una vez los cinco formatos indispensables', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    a.guardarEn(dir);

    const r = valor(await a.registro.invocar('plantilla:descargarPaquete', { codigos: ['PL-01', 'PL-02', 'PL-02b', 'PL-03', 'PL-05'], entidadId: demo.id }));
    expect(r?.entregadas).toHaveLength(5);
    expect(readdirSync(dir).sort()).toEqual([
      'PL-01_parametros_entidad.xlsx',
      'PL-02_clases_vida_util.xlsx',
      'PL-02b_sedes_servicios.xlsx',
      'PL-03_toma_inventario_fisico.xlsx',
      'PL-05_hoja_de_vida.xlsx',
    ]);
  });
});
