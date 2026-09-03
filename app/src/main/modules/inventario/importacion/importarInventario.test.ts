/**
 * T-C-07 — importación de PL-03 y PL-05 sobre las PLANTILLAS REALES de
 * Plantillas_Valuacion_Activos/excel. Es la etapa 3 de ADR-026: lo que llena la
 * base con lo que el motor de cálculo necesita.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arnesPaso01, ENTIDAD_PRUEBA, valor } from '../../configuracion/pruebas';
import { limpiarPrevisualizaciones } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { TIPO_SOPORTE_RECONOCIMIENTO_INICIAL } from '../../hojas-vida';

const raizRepo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..');
const plantillas = join(raizRepo, 'Plantillas_Valuacion_Activos', 'excel');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valuacion-pl03-'));
  limpiarPrevisualizaciones();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Copia la plantilla real y escribe desde la fila 8: la 7 es el ejemplo y se deja. */
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

/** Fecha de corte del ejercicio de prueba; el arnés fija "hoy" en 2026-09-02. */
const FECHA_CORTE = '2026-06-30';

/** Entidad con una clase, una sede, un servicio y un ejercicio abierto. */
async function arnesConEjercicio() {
  const a = await arnesPaso01({ rutaDatos: join(dir, 'datos') });
  const entidad = valor(await a.registro.invocar('entidad:crear', { ...ENTIDAD_PRUEBA, precargarSemillas: false }));
  const clase = valor(
    await a.registro.invocar('clase:crear', {
      entidadId: entidad.id,
      codigo: 'EMC',
      nombre: 'EQUIPO MEDICO CIENTIFICO',
      subcuentaContable: '167002',
      esDepreciable: true,
      vidaUtilContableMeses: 120,
      vidaUtilTecnicaAnios: 10,
      requiereHojaVida: true,
      requiereInvima: false,
      responsableTecnico: 'Ingeniería biomédica',
      activo: true,
    }),
  );
  const sede = valor(await a.registro.invocar('sede:crear', { entidadId: entidad.id, codigo: '01', nombre: 'Sede principal', direccion: 'Calle 1', municipio: 'Popayán', activa: true }));
  const servicio = valor(await a.registro.invocar('servicio:crear', { sedeId: sede.id, codigo: 'LAB', nombre: 'LABORATORIO CLINICO', tipo: 'asistencial', responsable: null, activo: true }));
  const firmante = valor(
    await a.registro.invocar('responsable:crear', { entidadId: entidad.id, nombreCompleto: 'Ana Coordinadora', documentoIdentidad: '1', perfil: 'COORDINADOR', cargo: 'Líder' }),
  );
  const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: entidad.id, nombre: 'Ejercicio 2026', fechaCorte: FECHA_CORTE, responsableId: firmante.id }));
  return { ...a, entidadId: entidad.id, ejercicioId: ejercicio.id, claseId: clase.id, servicioId: servicio.id };
}

/** Una fila de PL-03 completa, en el orden exacto de las 17 columnas del archivo. */
function filaPl03(codigo: string, placa: string, extra: Partial<Record<'clase' | 'sede' | 'servicio' | 'estado' | 'tenencia' | 'serie' | 'fecha', string>> = {}): unknown[] {
  return [
    codigo,
    placa,
    'AGITADOR DE MAZZINI',
    extra.clase ?? 'EQUIPO MEDICO CIENTIFICO',
    'LW SCIENTIFIC',
    'RTL-24',
    extra.serie ?? `SN-${codigo}`,
    extra.sede ?? '01',
    extra.servicio ?? 'LABORATORIO CLINICO',
    1,
    extra.estado ?? 'BUENO',
    extra.tenencia ?? 'PROPIO',
    'JUAN PEREZ',
    extra.fecha ?? '2026-06-15',
    'TECNICO 1',
    null,
    'NO',
  ];
}

describe('PL-03 · toma de inventario físico', () => {
  it('importa los bienes resolviendo clase, sede y servicio contra el catálogo', async () => {
    const a = await arnesConEjercicio();
    a.seleccionarArchivo(await rellenar('PL-03_toma_inventario_fisico.xlsx', { INVENTARIO: [filaPl03('HSV01AGM01', '166002008'), filaPl03('HSV01AGM02', '166002009')] }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.hojas).toEqual([{ hoja: 'INVENTARIO', filaEncabezados: 6, filasLeidas: 2, filasValidas: 2, filasConError: 0, filasEjemploOmitidas: 1 }]);
    expect(informe.importable).toBe(true);

    const r = valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));
    expect(r.creados).toBe(2);

    const pagina = valor(await a.registro.invocar('bien:listar', { ejercicioId: a.ejercicioId, filtros: {}, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 10 }));
    expect(pagina.total).toBe(2);
    const primero = pagina.filas[0];
    expect(primero?.codigoInstitucional).toBe('HSV01AGM01');
    expect(primero?.claseCodigo).toBe('EMC');
    expect(primero?.servicioCodigo).toBe('LAB');
    // RN-03-01: sin hoja de vida no hay fecha ni costo, así que nace INCOMPLETO.
    expect(primero?.estadoRegistro).toBe('INCOMPLETO');
  });

  it('rechaza la fila cuya clase, sede o servicio no existe, y dice cuál falta', async () => {
    const a = await arnesConEjercicio();
    a.seleccionarArchivo(
      await rellenar('PL-03_toma_inventario_fisico.xlsx', {
        INVENTARIO: [
          filaPl03('OK-01', 'P-1'),
          filaPl03('MALA-CLASE', 'P-2', { clase: 'MOBILIARIO' }),
          filaPl03('MALA-SEDE', 'P-3', { sede: '99' }),
          filaPl03('MAL-SERVICIO', 'P-4', { servicio: 'URGENCIAS' }),
        ],
      }),
    );

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.hojas[0]).toMatchObject({ filasValidas: 1, filasConError: 3 });
    const motivos = informe.incidencias.filter((i) => i.severidad === 'ERROR').map((i) => `${i.columna}:${i.motivo}`);
    expect(motivos.some((m) => m.startsWith('clase_activo:') && m.includes('PL-02'))).toBe(true);
    expect(motivos.some((m) => m.startsWith('sede:') && m.includes('PL-02b'))).toBe(true);
    expect(motivos.some((m) => m.startsWith('servicio_ubicacion:') && m.includes('01'))).toBe(true);
  });

  it('RN-02-01: código y placa repetidos son error; RN-02-05: la serie repetida solo advierte', async () => {
    const a = await arnesConEjercicio();
    a.seleccionarArchivo(
      await rellenar('PL-03_toma_inventario_fisico.xlsx', {
        INVENTARIO: [
          filaPl03('A-1', 'P-1', { serie: 'IGUAL' }),
          filaPl03('A-1', 'P-2', { serie: 'X' }), // código repetido
          filaPl03('A-2', 'P-1', { serie: 'Y' }), // placa repetida
          filaPl03('A-3', 'P-3', { serie: 'IGUAL' }), // serie repetida: entra
        ],
      }),
    );

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.hojas[0]).toMatchObject({ filasValidas: 2, filasConError: 2 });
    expect(informe.incidencias.some((i) => i.severidad === 'ERROR' && i.columna === 'codigo_institucional')).toBe(true);
    expect(informe.incidencias.some((i) => i.severidad === 'ERROR' && i.columna === 'placa' && i.motivo.includes('RN-02-01'))).toBe(true);
    const serie = informe.incidencias.find((i) => i.columna === 'serie');
    expect(serie?.severidad).toBe('ADVERTENCIA');
    expect(serie?.motivo).toContain('RN-02-05');
  });

  it('rechaza reimportar un bien que ya está en el ejercicio', async () => {
    const a = await arnesConEjercicio();
    const archivo = await rellenar('PL-03_toma_inventario_fisico.xlsx', { INVENTARIO: [filaPl03('REPE-01', 'PP-1')] });
    a.seleccionarArchivo(archivo);
    const primero = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (primero === null) throw new Error('sin informe');
    await a.registro.invocar('importacion:confirmar', { token: primero.token, aceptarConErrores: false });

    a.seleccionarArchivo(archivo);
    const segundo = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (segundo === null) throw new Error('sin informe');
    expect(segundo.importable).toBe(false);
    expect(segundo.incidencias.some((i) => i.motivo.includes('ya existe un bien con este código'))).toBe(true);
  });

  it('no se puede importar sin ejercicio: PL-03 escribe dentro de uno', async () => {
    const a = await arnesConEjercicio();
    const r = await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: null, plantilla: 'PL-03' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('EJERCICIO_REQUERIDO');
  });
});

/** Una fila de HOJA_VIDA en el orden de las 18 columnas del archivo real. */
function filaPl05(codigo: string, fecha: string | null, costo: number | null, forma = 'COMPRA'): unknown[] {
  return [codigo, 'FIJO', null, 'LW SCIENTIFIC INC', 'ESTADOS UNIDOS', '110V', 'OPERATIVO', forma, fecha, 'FACTURA', 'FV-1', 'DISTRIBUIDORA', costo, 0, 'RECURSOS PROPIOS', null, null, null];
}

describe('PL-05 · datos económicos (lo que el motor necesita)', () => {
  async function conBienes(a: Awaited<ReturnType<typeof arnesConEjercicio>>, codigos: readonly string[]): Promise<void> {
    a.seleccionarArchivo(await rellenar('PL-03_toma_inventario_fisico.xlsx', { INVENTARIO: codigos.map((c, i) => filaPl03(c, `PL-${i}`)) }));
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (informe === null) throw new Error('sin informe');
    await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false });
  }

  it('con fecha y costo el bien deja de estar INCOMPLETO y guarda el costo en centavos', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['B-1']);
    a.seleccionarArchivo(await rellenar('PL-05_hoja_de_vida.xlsx', { HOJA_VIDA: [filaPl05('B-1', '2015-02-23', 1788720)] }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.importable).toBe(true);
    valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));

    const pagina = valor(await a.registro.invocar('bien:listar', { ejercicioId: a.ejercicioId, filtros: {}, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 10 }));
    const bien = pagina.filas[0];
    expect(bien?.estadoRegistro).toBe('VALIDADO');
    expect(bien?.fechaAdquisicion).toBe('2015-02-23');
    // RED-01: 1.788.720 pesos son 178.872.000 centavos, nunca un flotante de pesos.
    expect(bien?.costoAdquisicion).toBe(178_872_000);
    expect(bien?.tieneHojaVida).toBe(true);
  });

  it('RN-03-02: un costo en cero es dato faltante, no un bien gratuito', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['C-1']);
    a.seleccionarArchivo(await rellenar('PL-05_hoja_de_vida.xlsx', { HOJA_VIDA: [filaPl05('C-1', '2015-02-23', 0)] }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.incidencias.some((i) => i.motivo.includes('RN-03-02') && i.severidad === 'ADVERTENCIA')).toBe(true);
    valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));

    const pagina = valor(await a.registro.invocar('bien:listar', { ejercicioId: a.ejercicioId, filtros: {}, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 10 }));
    expect(pagina.filas[0]?.costoAdquisicion).toBeNull();
    expect(pagina.filas[0]?.estadoRegistro).toBe('INCOMPLETO');
  });

  it('VAL-03-02: la adquisición posterior a la fecha de corte se rechaza', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['D-1']);
    a.seleccionarArchivo(await rellenar('PL-05_hoja_de_vida.xlsx', { HOJA_VIDA: [filaPl05('D-1', '2027-03-01', 100000)] }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.importable).toBe(false);
    expect(informe.incidencias.some((i) => i.motivo.includes('VAL-03-02') && i.motivo.includes(FECHA_CORTE))).toBe(true);
  });

  it('rechaza la hoja de vida de un bien que no está en el inventario', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['E-1']);
    a.seleccionarArchivo(await rellenar('PL-05_hoja_de_vida.xlsx', { HOJA_VIDA: [filaPl05('NO-EXISTE', '2015-01-01', 1000)] }));

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.incidencias.some((i) => i.motivo.includes('PL-03'))).toBe(true);
  });

  it('RN-03-04: SIN_SOPORTE da fecha y costo, y deja el libro importado como acta', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['F-1']);
    a.seleccionarArchivo(
      await rellenar('PL-05_hoja_de_vida.xlsx', {
        HOJA_VIDA: [filaPl05('F-1', null, null)],
        SIN_SOPORTE: [['F-1', 'MICROSCOPIO BINOCULAR', 'Se solicitó a contabilidad y no aparece', 2500000, '2016-01-01', 'ING. BIOMEDICA T.P. 12345']],
      }),
    );

    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.incidencias.some((i) => i.motivo.includes('RN-03-04'))).toBe(true);
    valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));

    const pagina = valor(await a.registro.invocar('bien:listar', { ejercicioId: a.ejercicioId, filtros: {}, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 10 }));
    expect(pagina.filas[0]?.costoAdquisicion).toBe(250_000_000);
    expect(pagina.filas[0]?.fechaAdquisicion).toBe('2016-01-01');

    const soporte = a.sqlite.prepare('SELECT tipo_documento, url, hash_sha256 FROM soporte_documental').get() as { tipo_documento: string; url: string; hash_sha256: string };
    expect(soporte.tipo_documento).toBe(TIPO_SOPORTE_RECONOCIMIENTO_INICIAL);
    expect(soporte.url).toContain('almacen');
    expect(soporte.hash_sha256).toHaveLength(64);

    // Con acta, VAL-03-03 ya no lo señala.
    const validaciones = valor(await a.registro.invocar('validaciones:evaluar', { paso: 3, entidadId: a.entidadId, ejercicioId: a.ejercicioId }));
    expect(validaciones.resultados.find((v) => v.codigo === 'VAL-03-03')?.cumple).toBe(true);
  });

  it('reimportar PL-05 corregido actualiza la hoja en vez de duplicarla', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['G-1']);
    for (const costo of [1000, 2000]) {
      a.seleccionarArchivo(await rellenar('PL-05_hoja_de_vida.xlsx', { HOJA_VIDA: [filaPl05('G-1', '2015-02-23', costo)] }));
      const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
      if (informe === null) throw new Error('sin informe');
      valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));
    }
    const hojas = a.sqlite.prepare('SELECT COUNT(*) AS n, MAX(costo_adquisicion_cent) AS c FROM hoja_vida').get() as { n: number; c: number };
    expect(hojas.n).toBe(1);
    expect(hojas.c).toBe(200_000);
  });

  it('los mantenimientos entran una sola vez aunque se reimporte el mismo archivo', async () => {
    const a = await arnesConEjercicio();
    await conBienes(a, ['H-1']);
    for (let i = 0; i < 2; i += 1) {
      a.seleccionarArchivo(
        await rellenar('PL-05_hoja_de_vida.xlsx', {
          HOJA_VIDA: [filaPl05('H-1', '2015-02-23', 1000)],
          MANTENIMIENTOS: [['H-1', '2025-03-10', 'PREVENTIVO', 'Limpieza general', 'BIOMEDICA LTDA', 180000, 'SATISFACTORIO']],
        }),
      );
      const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-05' }));
      if (informe === null) throw new Error('sin informe');
      valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));
    }
    const n = (a.sqlite.prepare('SELECT COUNT(*) AS n FROM mantenimiento').get() as { n: number }).n;
    expect(n).toBe(1);
  });
});

describe('lo entregado se puede volver a importar (ida y vuelta con las listas inyectadas)', () => {
  it('PL-03 descargada desde la aplicación se diligencia y vuelve a entrar', async () => {
    const a = await arnesConEjercicio();
    a.guardarEn(dir);
    const entrega = valor(await a.registro.invocar('plantilla:descargar', { codigo: 'PL-03', entidadId: a.entidadId, ejercicioId: a.ejercicioId }));
    if (entrega === null) throw new Error('no se entregó la plantilla');

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(entrega.ruta);
    const hoja = libro.getWorksheet('INVENTARIO');
    if (hoja === undefined) throw new Error('sin hoja INVENTARIO');
    filaPl03('IDA-01', 'IV-1').forEach((v, j) => {
      hoja.getRow(8).getCell(j + 1).value = v as ExcelJS.CellValue;
    });
    hoja.getRow(8).commit();
    const diligenciada = join(dir, 'PL-03_diligenciada.xlsx');
    await libro.xlsx.writeFile(diligenciada);

    a.seleccionarArchivo(diligenciada);
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: a.entidadId, ejercicioId: a.ejercicioId, plantilla: 'PL-03' }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.importable).toBe(true);
    const r = valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));
    expect(r.creados).toBe(1);
  });
});
