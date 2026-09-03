/**
 * RF-01-02 — importación de PL-01, PL-02 y PL-02b usando las PLANTILLAS REALES de
 * Plantillas_Valuacion_Activos/excel (fila 6 encabezados, fila 7 ejemplo en azul).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from '../pruebas';
import { limpiarPrevisualizaciones } from '../../../infraestructura/documental/excel/orquestadorImportacion';

const raizRepo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..');
const plantillas = join(raizRepo, 'Plantillas_Valuacion_Activos', 'excel');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-import-'));
  limpiarPrevisualizaciones();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Copia la plantilla real y escribe filas a partir de la 8 (la 7 es el ejemplo, se deja). */
async function rellenar(plantilla: string, hojas: Record<string, unknown[][]>): Promise<string> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(join(plantillas, plantilla));
  for (const [nombre, filas] of Object.entries(hojas)) {
    const hoja = libro.getWorksheet(nombre);
    if (hoja === undefined) throw new Error(`Sin hoja ${nombre}`);
    filas.forEach((valores, i) => {
      const fila = hoja.getRow(8 + i);
      valores.forEach((v, j) => {
        fila.getCell(j + 1).value = v as ExcelJS.CellValue;
      });
      fila.commit();
    });
  }
  const destino = join(dir, plantilla);
  await libro.xlsx.writeFile(destino);
  return destino;
}

async function arnesConEntidad() {
  const arnes = await arnesPaso01({ rutaDatos: join(dir, 'datos') });
  const entidad = valor(await arnes.registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, precargarSemillas: false }));
  return { ...arnes, entidad };
}

describe('PL-02b · sedes y servicios', () => {
  it('previsualiza fila por fila: omite el ejemplo, normaliza listas, detecta duplicados y sedes inexistentes', async () => {
    const a = await arnesConEntidad();
    a.seleccionarArchivo(await rellenar('PL-02b_sedes_servicios.xlsx', {
      SEDES: [
        ['01', 'Sede principal', 'Calle 5 # 4-20', 'Popayán', 'SI'],
        ['02', 'Centro de salud', 'Carrera 9', 'Timbío', 'no'],
        ['01', 'Repetida', 'x', 'y', 'SI'],
      ],
      SERVICIOS: [
        ['URG', 'Urgencias', '01', 'ASISTENCIAL', 'Jefe de enfermería', 'SI'],
        ['ADM', 'Administración', '02', 'administrativo', null, 'SI'],
        ['LAB', 'Laboratorio', '99', 'ASISTENCIAL', null, 'SI'],
        ['FAR', 'Farmacia', '01', 'CLINICO', null, 'SI'],
      ],
    }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-02b' }));
    if (informe === null) throw new Error('sin informe');

    expect(informe.hojas).toEqual([
      { hoja: 'SEDES', filaEncabezados: 6, filasLeidas: 3, filasValidas: 2, filasConError: 1, filasEjemploOmitidas: 1 },
      // 4 leídas: URG y ADM válidas; LAB (sede 99 inexistente) y FAR (tipo CLINICO) rechazadas.
      { hoja: 'SERVICIOS', filaEncabezados: 6, filasLeidas: 4, filasValidas: 2, filasConError: 2, filasEjemploOmitidas: 1 },
    ]);
    expect(informe.importable).toBe(false);
    const motivos = informe.incidencias.map((i) => `${i.hoja}:${i.fila}:${i.columna}:${i.motivo}`);
    expect(motivos).toContain('SEDES:10:codigo_sede:Duplicado de la fila 8');
    expect(motivos.some((m) => m.startsWith('SERVICIOS:11:tipo:') && m.includes('CLINICO'))).toBe(true);
    expect(motivos.some((m) => m.startsWith('SERVICIOS:10:codigo_sede:') && m.includes('no existe'))).toBe(true);
    expect(informe.normalizaciones.some((n) => n.columna === 'tipo' && n.recibido === 'ASISTENCIAL' && n.interpretado === 'asistencial')).toBe(true);
    expect(informe.normalizaciones.some((n) => n.regla.includes('ejemplo'))).toBe(true);
  });

  it('con errores no importa sin confirmación explícita; al aceptar, importa solo las válidas y conserva el archivo', async () => {
    const a = await arnesConEntidad();
    a.seleccionarArchivo(await rellenar('PL-02b_sedes_servicios.xlsx', {
      SEDES: [['01', 'Sede principal', 'Calle 5', 'Popayán', 'SI']],
      SERVICIOS: [
        ['URG', 'Urgencias', '01', 'ASISTENCIAL', 'Jefe', 'SI'],
        ['LAB', 'Laboratorio', '99', 'ASISTENCIAL', null, 'SI'],
      ],
    }));
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-02b' }));
    if (informe === null) throw new Error('sin informe');

    expect(await a.registro.invocar('importacion:confirmar', { token: informe.token })).toMatchObject({ ok: false, error: { codigo: 'IMPORTACION_CON_ERRORES' } });

    const r = valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: true }));
    expect(r).toMatchObject({ plantilla: 'PL-02b', creados: 2, actualizados: 0, omitidos: 1 });
    expect(valor(await a.registro.invocar('sede:listar', { entidadId: a.entidad.id }))).toHaveLength(1);
    expect(valor(await a.registro.invocar('servicio:listar', { entidadId: a.entidad.id }))).toMatchObject([{ codigo: 'URG', tipo: 'asistencial' }]);

    const carpeta = join(dir, 'datos', 'almacen', 'importaciones', a.entidad.id);
    expect(existsSync(carpeta)).toBe(true);
    expect(readdirSync(carpeta).some((f) => f.includes('PL-02b'))).toBe(true);
    const bit = a.sqlite.prepare(`SELECT campo, valor_nuevo FROM bitacora WHERE accion = 'IMPORTAR'`).get() as { campo: string; valor_nuevo: string };
    expect(bit.campo).toBe('PL-02b');
    expect(bit.valor_nuevo).toContain('2 creados');

    // Reimportar el mismo archivo actualiza en vez de duplicar.
    const informe2 = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-02b' }));
    const r2 = valor(await a.registro.invocar('importacion:confirmar', { token: informe2?.token ?? '', aceptarConErrores: true }));
    expect(r2).toMatchObject({ creados: 0, actualizados: 2 });
  });

  it('el usuario cancela el diálogo → null, sin previsualización', async () => {
    const a = await arnesConEntidad();
    a.seleccionarArchivo(null);
    expect(valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-02b' }))).toBeNull();
  });
});

describe('PL-02 · clases', () => {
  it('importa clases con vida técnica decimal y SI/NO', async () => {
    const a = await arnesConEntidad();
    a.seleccionarArchivo(await rellenar('PL-02_clases_vida_util.xlsx', {
      CLASES: [
        ['EMC', 'Equipo médico científico', '1660', 'SI', 180, 15, 'SI', 'SI', 'ESPECIALISTA_BIOMEDICO', 'SI'],
        ['TER', 'Terrenos', '1605', 'NO', null, null, 'NO', 'NO', 'PERITO', 'SI'],
        ['COM', 'Cómputo', '1670', 'SI', 60, '5,5', 'SI', 'NO', 'ESPECIALISTA_SISTEMAS', 'SI'],
      ],
    }));
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-02' }));
    expect(informe?.importable).toBe(true);
    valor(await a.registro.invocar('importacion:confirmar', { token: informe?.token ?? '' }));
    const clases = valor(await a.registro.invocar('clase:listar', { entidadId: a.entidad.id }));
    expect(clases.map((c) => [c.codigo, c.vidaUtilContableMeses, c.vidaUtilTecnicaAnios, c.esDepreciable])).toEqual([
      ['COM', 60, 5.5, true],
      ['EMC', 180, 15, true],
      ['TER', null, null, false],
    ]);
  });
});

describe('PL-01 · parámetros de la entidad (clave/valor)', () => {
  it('actualiza la entidad y los parámetros; tolera tildes en las claves y reporta la fecha de corte', async () => {
    const a = await arnesConEntidad();
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(join(plantillas, 'PL-01_parametros_entidad.xlsx'));
    const hoja = libro.getWorksheet('PARAMETROS');
    if (hoja === undefined) throw new Error('sin hoja');
    const valores: Record<string, unknown> = {
      razon_social: 'E.S.E Hospital Importado',
      nit: '900123456-7',
      municipio: 'Cali',
      departamento: 'Valle del Cauca',
      nivel_complejidad: 'iii',
      nombre_gerente: 'Gerente Importado',
      dirección: 'Avenida 3N # 45-10',
      teléfono: '3001234567',
      fecha_corte_ejercicio: '30/06/2025',
      metodo_conteo_meses: 'MES_COMPLETO',
      deprecia_mes_adquisicion: 'NO',
      umbral_semaforo_verde: 0.45,
      umbral_capitalizacion: '$ 2.000.000',
    };
    for (let r = 7; r <= 30; r++) {
      const clave = String(hoja.getRow(r).getCell(1).value ?? '');
      if (clave in valores) hoja.getRow(r).getCell(2).value = valores[clave] as ExcelJS.CellValue;
    }
    const ruta = join(dir, 'PL-01.xlsx');
    await libro.xlsx.writeFile(ruta);
    a.seleccionarArchivo(ruta);

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidad.id, plantilla: 'PL-01' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.errores).toBe(0);
    expect(informe.incidencias.some((i) => i.columna === 'fecha_corte_ejercicio' && i.severidad === 'ADVERTENCIA')).toBe(true);
    expect(informe.normalizaciones.some((n) => n.columna === 'fecha_corte_ejercicio' && n.interpretado === '2025-06-30')).toBe(true);

    valor(await a.registro.invocar('importacion:confirmar', { token: informe.token }));
    const entidad = valor(await a.registro.invocar('entidad:porId', { id: a.entidad.id }));
    expect(entidad).toMatchObject({ razonSocial: 'E.S.E Hospital Importado', nit: '900123456-7', nivelComplejidad: 'III', direccion: 'Avenida 3N # 45-10', telefono: '3001234567' });
    const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: a.entidad.id }));
    expect(p).toMatchObject({ metodo_conteo_meses: 'mes_completo', metodo_conteo_meses_confirmado: false, deprecia_mes_adquisicion: false, umbral_semaforo_verde: 0.45, umbral_capitalizacion: 2000000 });
  });
});
