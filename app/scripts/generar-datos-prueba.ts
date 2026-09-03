/**
 * Genera un juego de datos de prueba para un hospital ficticio, partiendo de las
 * PLANTILLAS REALES de `Plantillas_Valuacion_Activos/excel`.
 *
 * Se parte de los archivos reales a propósito: así las columnas, la fila de
 * encabezados y la fila de ejemplo son exactamente las que la aplicación espera,
 * y lo que se prueba es el camino de verdad, no una imitación.
 *
 *   npm run datos:prueba
 *
 * Produce dos escenarios:
 *   01_caso_limpio       importa sin un solo error
 *   02_caso_con_problemas cada defecto está puesto a propósito y documentado
 */
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizApp = join(dirname(fileURLToPath(import.meta.url)), '..');
const raizRepo = join(raizApp, '..');
const plantillas = join(raizRepo, 'Plantillas_Valuacion_Activos', 'excel');
const salida = join(raizRepo, 'Datos_de_prueba');

/** La fila 7 de cada plantilla es el ejemplo (azul); los datos empiezan en la 8. */
const PRIMERA_FILA = 8;

const HOSPITAL = {
  razonSocial: 'E.S.E. HOSPITAL SANTA ANA DE GUARNE',
  nit: '890905137-4',
  municipio: 'GUARNE',
  departamento: 'ANTIOQUIA',
  nivel: 'II',
  gerente: 'MARTHA LUCIA RESTREPO OSORIO',
  acto: 'Decreto 118 del 15/02/2024',
  direccion: 'CARRERA 51 No. 50-12',
  telefono: '604 551 2020',
  email: 'gerencia@hospitalsantaana-ejemplo.gov.co',
  fechaCorte: '2025-12-31',
} as const;

type Fila = readonly (string | number | null)[];

async function abrir(plantilla: string): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(join(plantillas, plantilla));
  return libro;
}

function escribir(libro: ExcelJS.Workbook, hoja: string, filas: readonly Fila[]): void {
  const ws = libro.getWorksheet(hoja);
  if (ws === undefined) throw new Error(`La plantilla no tiene la hoja ${hoja}`);
  filas.forEach((valores, i) => {
    const fila = ws.getRow(PRIMERA_FILA + i);
    valores.forEach((v, j) => {
      fila.getCell(j + 1).value = v as ExcelJS.CellValue;
    });
    fila.commit();
  });
}

async function guardar(libro: ExcelJS.Workbook, carpeta: string, archivo: string): Promise<void> {
  mkdirSync(carpeta, { recursive: true });
  await libro.xlsx.writeFile(join(carpeta, archivo));
  console.log(`  ✓ ${archivo}`);
}

// ── PL-01 · parámetros de la entidad (clave/valor) ───────────────────────────

const VALORES_PL_01: Readonly<Record<string, string | number>> = {
  razon_social: HOSPITAL.razonSocial,
  nit: HOSPITAL.nit,
  municipio: HOSPITAL.municipio,
  departamento: HOSPITAL.departamento,
  nivel_complejidad: HOSPITAL.nivel,
  nombre_gerente: HOSPITAL.gerente,
  acto_nombramiento_gerente: HOSPITAL.acto,
  dirección: HOSPITAL.direccion,
  teléfono: HOSPITAL.telefono,
  email: HOSPITAL.email,
  fecha_corte_ejercicio: HOSPITAL.fechaCorte,
  metodo_depreciacion: 'linea_recta',
  metodo_conteo_meses: 'dias_exactos',
  deprecia_mes_adquisicion: 'SI',
  valor_residual_pct: 0,
  decimales_calculo: 2,
  umbral_capitalizacion: 2000000,
  umbral_semaforo_verde: 0.5,
  umbral_semaforo_amarillo: 0.8,
  umbral_reparacion_baja_pct: 50,
  tolerancia_cruce_valor_pct: 5,
  vigencia_avaluo_meses: 12,
  moneda: 'COP',
  prefijo_codigo_bienes: 'HSA',
  longitud_consecutivo: 4,
  numero_contrato: 'CPS-2025-118',
  supervisor_contrato: 'JORGE IVAN GOMEZ - SUBGERENTE ADMINISTRATIVO',
};

async function generarPl01(carpeta: string): Promise<void> {
  const libro = await abrir('PL-01_parametros_entidad.xlsx');
  const ws = libro.getWorksheet('PARAMETROS');
  if (ws === undefined) throw new Error('PL-01 sin hoja PARAMETROS');
  // Es clave/valor: se rellena la columna `valor` de las claves que ya trae.
  for (let r = 7; r <= ws.rowCount; r += 1) {
    const clave = String(ws.getRow(r).getCell(1).value ?? '').trim();
    const valor = VALORES_PL_01[clave];
    if (valor !== undefined) {
      ws.getRow(r).getCell(2).value = valor;
      ws.getRow(r).commit();
    }
  }
  await guardar(libro, carpeta, 'PL-01_parametros_entidad.xlsx');
}

// ── PL-02 · clases de activo ─────────────────────────────────────────────────

const CLASES: readonly Fila[] = [
  ['EMC', 'EQUIPO MEDICO CIENTIFICO', '166002', 'SI', 180, 15, 'SI', 'SI', 'INGENIERO BIOMEDICO', 'SI'],
  ['MEO', 'MUEBLES, ENSERES Y EQUIPO DE OFICINA', '166501', 'SI', 120, 10, 'NO', 'NO', 'ALMACENISTA', 'SI'],
  ['COM', 'EQUIPO DE COMUNICACION Y COMPUTACION', '167002', 'SI', 60, 5, 'NO', 'NO', 'INGENIERO DE SISTEMAS', 'SI'],
  ['MAQ', 'MAQUINARIA Y EQUIPO', '165501', 'SI', 120, 10, 'SI', 'NO', 'JEFE DE MANTENIMIENTO', 'SI'],
  ['TRA', 'EQUIPO DE TRANSPORTE TERRESTRE', '167501', 'SI', 120, 10, 'SI', 'NO', 'JEFE DE MANTENIMIENTO', 'SI'],
  ['TER', 'TERRENOS', '160501', 'NO', null, null, 'NO', 'NO', 'GESTION PREDIAL', 'SI'],
];

// ── PL-02b · sedes y servicios ───────────────────────────────────────────────

const SEDES: readonly Fila[] = [
  ['01', 'SEDE PRINCIPAL', 'CARRERA 51 No. 50-12', 'GUARNE', 'SI'],
  ['02', 'CENTRO DE SALUD LA BRIZUELA', 'VEREDA LA BRIZUELA KM 4', 'GUARNE', 'SI'],
];

const SERVICIOS: readonly Fila[] = [
  ['URG', 'URGENCIAS', '01', 'ASISTENCIAL', 'JEFE DE ENFERMERIA', 'SI'],
  ['HOS', 'HOSPITALIZACION', '01', 'ASISTENCIAL', 'COORDINADORA DE ENFERMERIA', 'SI'],
  ['CEX', 'CONSULTA EXTERNA', '01', 'ASISTENCIAL', 'MEDICO COORDINADOR', 'SI'],
  ['LAB', 'LABORATORIO CLINICO', '01', 'APOYO', 'BACTERIOLOGA', 'SI'],
  ['FAR', 'FARMACIA', '01', 'APOYO', 'REGENTE DE FARMACIA', 'SI'],
  ['ADM', 'ADMINISTRACION', '01', 'ADMINISTRATIVO', 'SUBGERENTE ADMINISTRATIVO', 'SI'],
  ['MAN', 'MANTENIMIENTO', '01', 'APOYO', 'JEFE DE MANTENIMIENTO', 'SI'],
  ['PYP', 'PROMOCION Y PREVENCION', '02', 'ASISTENCIAL', 'ENFERMERA JEFE', 'SI'],
];

// ── PL-03 · inventario físico ────────────────────────────────────────────────

interface Bien {
  readonly codigo: string;
  readonly placa: string;
  readonly descripcion: string;
  readonly clase: string;
  readonly marca: string;
  readonly modelo: string;
  readonly servicio: string;
  readonly sede: string;
  readonly estado: string;
  readonly tenencia?: string;
  readonly custodio: string;
  /** Datos económicos; `null` = el hospital no encontró el soporte. */
  readonly adquisicion: string | null;
  readonly costo: number | null;
}

/**
 * 40 bienes repartidos a propósito para que el semáforo muestre los cuatro
 * colores, haya candidatos a baja por índice y por estado, bienes sin soporte
 * económico y uno que no entra al patrimonio (comodato).
 */
const BIENES: readonly Bien[] = [
  // ── Urgencias ──
  { codigo: 'HSA01MON0001', placa: '166002001', descripcion: 'MONITOR DE SIGNOS VITALES MULTIPARAMETROS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'MINDRAY', modelo: 'uMEC12', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2022-04-12', costo: 15800000 },
  { codigo: 'HSA01DES0002', placa: '166002002', descripcion: 'DESFIBRILADOR BIFASICO CON MARCAPASOS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'PHILIPS', modelo: 'HeartStart XL', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2021-08-30', costo: 31200000 },
  { codigo: 'HSA01ELE0003', placa: '166002003', descripcion: 'ELECTROCARDIOGRAFO DE 12 DERIVACIONES', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'NIHON KOHDEN', modelo: 'ECG-2150', servicio: 'URGENCIAS', sede: '01', estado: 'REGULAR', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2016-05-20', costo: 9800000 },
  { codigo: 'HSA01ASP0004', placa: '166002004', descripcion: 'ASPIRADOR DE SECRECIONES PORTATIL', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'MEDELA', modelo: 'Vario 18', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2023-02-10', costo: 3400000 },
  { codigo: 'HSA01CAM0005', placa: '166002005', descripcion: 'CAMILLA DE TRANSPORTE HIDRAULICA', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'STRYKER', modelo: 'Prime X', servicio: 'URGENCIAS', sede: '01', estado: 'REGULAR', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2014-11-05', costo: 7600000 },
  { codigo: 'HSA01LAR0006', placa: '166002006', descripcion: 'LARINGOSCOPIO DE FIBRA OPTICA ADULTO', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'WELCH ALLYN', modelo: 'MacIntosh', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2024-03-18', costo: 2900000 },

  // ── Hospitalización ──
  { codigo: 'HSA01CAH0007', placa: '166002007', descripcion: 'CAMA HOSPITALARIA ELECTRICA TRES PLANOS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'HILL-ROM', modelo: 'Progressa', servicio: 'HOSPITALIZACION', sede: '01', estado: 'BUENO', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2021-11-22', costo: 12400000 },
  { codigo: 'HSA01CAH0008', placa: '166002008', descripcion: 'CAMA HOSPITALARIA MECANICA DOS PLANOS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'GENERICA', modelo: 'Estandar', servicio: 'HOSPITALIZACION', sede: '01', estado: 'MALO', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2009-06-14', costo: 2800000 },
  { codigo: 'HSA01CAH0009', placa: '166002009', descripcion: 'CAMA HOSPITALARIA MECANICA DOS PLANOS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'GENERICA', modelo: 'Estandar', servicio: 'HOSPITALIZACION', sede: '01', estado: 'INSERVIBLE', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2008-03-01', costo: 2600000 },
  { codigo: 'HSA01BOM0010', placa: '166002010', descripcion: 'BOMBA DE INFUSION VOLUMETRICA', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'B.BRAUN', modelo: 'Infusomat Space', servicio: 'HOSPITALIZACION', sede: '01', estado: 'BUENO', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2023-09-05', costo: 8900000 },
  { codigo: 'HSA01OXI0011', placa: '166002011', descripcion: 'CONCENTRADOR DE OXIGENO 10 LITROS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'PHILIPS', modelo: 'EverFlo', servicio: 'HOSPITALIZACION', sede: '01', estado: 'REGULAR', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2018-07-19', costo: 5200000 },
  { codigo: 'HSA01NEB0012', placa: '166002012', descripcion: 'NEBULIZADOR ULTRASONICO', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'OMRON', modelo: 'NE-U780', servicio: 'HOSPITALIZACION', sede: '01', estado: 'BUENO', custodio: 'COORDINADORA DE ENFERMERIA', adquisicion: '2022-10-08', costo: 1900000 },

  // ── Consulta externa ──
  { codigo: 'HSA01TEN0013', placa: '166002013', descripcion: 'TENSIOMETRO DE PARED ANEROIDE', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'RIESTER', modelo: 'Big Ben', servicio: 'CONSULTA EXTERNA', sede: '01', estado: 'BUENO', custodio: 'MEDICO COORDINADOR', adquisicion: '2023-05-30', costo: 950000 },
  { codigo: 'HSA01OTO0014', placa: '166002014', descripcion: 'OTOSCOPIO CON MANGO RECARGABLE', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'WELCH ALLYN', modelo: 'MacroView', servicio: 'CONSULTA EXTERNA', sede: '01', estado: 'BUENO', custodio: 'MEDICO COORDINADOR', adquisicion: '2024-01-15', costo: 1700000 },
  { codigo: 'HSA01BAL0015', placa: '166002015', descripcion: 'BALANZA MECANICA CON TALLIMETRO', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'DETECTO', modelo: '439', servicio: 'CONSULTA EXTERNA', sede: '01', estado: 'REGULAR', custodio: 'MEDICO COORDINADOR', adquisicion: '2013-02-28', costo: 1400000 },
  { codigo: 'HSA01DOP0016', placa: '166002016', descripcion: 'DOPPLER FETAL PORTATIL', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'EDAN', modelo: 'SD3', servicio: 'CONSULTA EXTERNA', sede: '01', estado: 'BUENO', custodio: 'MEDICO COORDINADOR', adquisicion: '2022-06-11', costo: 2300000 },

  // ── Laboratorio ──
  { codigo: 'HSA01CEN0017', placa: '166002017', descripcion: 'CENTRIFUGA DE 24 TUBOS', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'HETTICH', modelo: 'EBA 200', servicio: 'LABORATORIO CLINICO', sede: '01', estado: 'BUENO', custodio: 'BACTERIOLOGA', adquisicion: '2021-03-17', costo: 6800000 },
  { codigo: 'HSA01MIC0018', placa: '166002018', descripcion: 'MICROSCOPIO BINOCULAR TRIOCULAR', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'OLYMPUS', modelo: 'CX23', servicio: 'LABORATORIO CLINICO', sede: '01', estado: 'BUENO', custodio: 'BACTERIOLOGA', adquisicion: null, costo: null },
  { codigo: 'HSA01ANA0019', placa: '166002019', descripcion: 'ANALIZADOR DE QUIMICA SANGUINEA', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'MINDRAY', modelo: 'BA-88A', servicio: 'LABORATORIO CLINICO', sede: '01', estado: 'BUENO', custodio: 'BACTERIOLOGA', adquisicion: '2020-09-24', costo: 28500000 },
  { codigo: 'HSA01NEV0020', placa: '166002020', descripcion: 'NEVERA PARA REACTIVOS 4 GRADOS', clase: 'MAQUINARIA Y EQUIPO', marca: 'HACEB', modelo: 'Assento 250', servicio: 'LABORATORIO CLINICO', sede: '01', estado: 'REGULAR', custodio: 'BACTERIOLOGA', adquisicion: '2015-08-12', costo: 3100000 },
  { codigo: 'HSA01AGI0021', placa: '166002021', descripcion: 'AGITADOR DE MAZZINI', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'LW SCIENTIFIC', modelo: 'RTL-BLVD-24T1', servicio: 'LABORATORIO CLINICO', sede: '01', estado: 'MALO', custodio: 'BACTERIOLOGA', adquisicion: '2010-02-23', costo: 1788720 },

  // ── Farmacia ──
  { codigo: 'HSA01EST0022', placa: '166501001', descripcion: 'ESTANTERIA METALICA DE 5 ENTREPANOS', clase: 'MUEBLES, ENSERES Y EQUIPO DE OFICINA', marca: 'GENERICA', modelo: 'Industrial', servicio: 'FARMACIA', sede: '01', estado: 'BUENO', custodio: 'REGENTE DE FARMACIA', adquisicion: '2019-04-02', costo: 1250000 },
  { codigo: 'HSA01NEV0023', placa: '166501002', descripcion: 'NEVERA PARA CADENA DE FRIO DE BIOLOGICOS', clase: 'MAQUINARIA Y EQUIPO', marca: 'INDUREY', modelo: 'RF-300', servicio: 'FARMACIA', sede: '01', estado: 'BUENO', custodio: 'REGENTE DE FARMACIA', adquisicion: '2022-01-20', costo: 9700000 },
  { codigo: 'HSA01AIR0024', placa: '166501003', descripcion: 'AIRE ACONDICIONADO MINISPLIT 12000 BTU', clase: 'MAQUINARIA Y EQUIPO', marca: 'LG', modelo: 'Dual Inverter', servicio: 'FARMACIA', sede: '01', estado: 'BUENO', custodio: 'REGENTE DE FARMACIA', adquisicion: '2023-07-14', costo: 2400000 },

  // ── Administración ──
  { codigo: 'HSA01COM0025', placa: '167002001', descripcion: 'COMPUTADOR DE ESCRITORIO CORE I5', clase: 'EQUIPO DE COMUNICACION Y COMPUTACION', marca: 'LENOVO', modelo: 'ThinkCentre M70q', servicio: 'ADMINISTRACION', sede: '01', estado: 'BUENO', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2023-11-09', costo: 3600000 },
  { codigo: 'HSA01COM0026', placa: '167002002', descripcion: 'COMPUTADOR DE ESCRITORIO CORE I3', clase: 'EQUIPO DE COMUNICACION Y COMPUTACION', marca: 'HP', modelo: 'ProDesk 400', servicio: 'ADMINISTRACION', sede: '01', estado: 'REGULAR', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2019-02-26', costo: 2800000 },
  { codigo: 'HSA01COM0027', placa: '167002003', descripcion: 'COMPUTADOR PORTATIL', clase: 'EQUIPO DE COMUNICACION Y COMPUTACION', marca: 'DELL', modelo: 'Latitude 3420', servicio: 'ADMINISTRACION', sede: '01', estado: 'MALO', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2017-05-08', costo: 3200000 },
  { codigo: 'HSA01IMP0028', placa: '167002004', descripcion: 'IMPRESORA MULTIFUNCIONAL LASER', clase: 'EQUIPO DE COMUNICACION Y COMPUTACION', marca: 'BROTHER', modelo: 'DCP-L2540DW', servicio: 'ADMINISTRACION', sede: '01', estado: 'REGULAR', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2018-10-30', costo: 1600000 },
  { codigo: 'HSA01ESC0029', placa: '166501004', descripcion: 'ESCRITORIO EN L CON ARCHIVADOR', clase: 'MUEBLES, ENSERES Y EQUIPO DE OFICINA', marca: 'GENERICA', modelo: 'Melamina', servicio: 'ADMINISTRACION', sede: '01', estado: 'BUENO', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2020-06-18', costo: 1350000 },
  { codigo: 'HSA01SIL0030', placa: '166501005', descripcion: 'SILLA ERGONOMICA GIRATORIA', clase: 'MUEBLES, ENSERES Y EQUIPO DE OFICINA', marca: 'GENERICA', modelo: 'Ejecutiva', servicio: 'ADMINISTRACION', sede: '01', estado: 'REGULAR', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2014-09-03', costo: 620000 },
  { codigo: 'HSA01ARC0031', placa: '166501006', descripcion: 'ARCHIVADOR RODANTE DE 4 CUERPOS', clase: 'MUEBLES, ENSERES Y EQUIPO DE OFICINA', marca: 'GENERICA', modelo: 'Metalico', servicio: 'ADMINISTRACION', sede: '01', estado: 'BUENO', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '2012-01-16', costo: 4200000 },
  { codigo: 'HSA01UPS0032', placa: '167002005', descripcion: 'UPS DE 3 KVA PARA SERVIDOR', clase: 'EQUIPO DE COMUNICACION Y COMPUTACION', marca: 'APC', modelo: 'Smart-UPS 3000', servicio: 'ADMINISTRACION', sede: '01', estado: 'BUENO', custodio: 'INGENIERO DE SISTEMAS', adquisicion: null, costo: null },

  // ── Mantenimiento ──
  { codigo: 'HSA01PLA0033', placa: '165501001', descripcion: 'PLANTA ELECTRICA DIESEL 60 KVA', clase: 'MAQUINARIA Y EQUIPO', marca: 'CUMMINS', modelo: 'C60D5', servicio: 'MANTENIMIENTO', sede: '01', estado: 'BUENO', custodio: 'JEFE DE MANTENIMIENTO', adquisicion: '2019-12-11', costo: 78000000 },
  { codigo: 'HSA01ESTE034', placa: '165501002', descripcion: 'ESTERILIZADOR DE CALOR SECO 30 LITROS', clase: 'MAQUINARIA Y EQUIPO', marca: 'GENERICO', modelo: 'Digital 30L', servicio: 'MANTENIMIENTO', sede: '01', estado: 'INSERVIBLE', custodio: 'JEFE DE MANTENIMIENTO', adquisicion: '2011-01-10', costo: 1500000 },
  { codigo: 'HSA01BOM0035', placa: '165501003', descripcion: 'BOMBA DE AGUA CENTRIFUGA 2 HP', clase: 'MAQUINARIA Y EQUIPO', marca: 'PEDROLLO', modelo: 'CP 620', servicio: 'MANTENIMIENTO', sede: '01', estado: 'REGULAR', custodio: 'JEFE DE MANTENIMIENTO', adquisicion: '2016-08-22', costo: 2100000 },

  // ── Transporte y comodato ──
  { codigo: 'HSA01AMB0036', placa: '167501001', descripcion: 'AMBULANCIA DE TRASLADO ASISTENCIAL BASICO', clase: 'EQUIPO DE TRANSPORTE TERRESTRE', marca: 'CHEVROLET', modelo: 'N300 Ambulancia', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', custodio: 'JEFE DE MANTENIMIENTO', adquisicion: '2021-05-27', costo: 145000000 },
  { codigo: 'HSA01VEN0037', placa: '166002022', descripcion: 'VENTILADOR MECANICO DE TRANSPORTE', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'HAMILTON', modelo: 'T1', servicio: 'URGENCIAS', sede: '01', estado: 'BUENO', tenencia: 'COMODATO', custodio: 'JEFE DE ENFERMERIA', adquisicion: '2023-01-30', costo: 62000000 },

  // ── Sede 2 ──
  { codigo: 'HSA02TEN0038', placa: '166002023', descripcion: 'TENSIOMETRO DIGITAL DE BRAZO', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'OMRON', modelo: 'HEM-7156', servicio: 'PROMOCION Y PREVENCION', sede: '02', estado: 'BUENO', custodio: 'ENFERMERA JEFE', adquisicion: '2024-02-20', costo: 780000 },
  { codigo: 'HSA02NEV0039', placa: '165501004', descripcion: 'NEVERA PARA VACUNAS PAI', clase: 'MAQUINARIA Y EQUIPO', marca: 'INDUREY', modelo: 'RF-200', servicio: 'PROMOCION Y PREVENCION', sede: '02', estado: 'BUENO', custodio: 'ENFERMERA JEFE', adquisicion: '2020-11-13', costo: 8300000 },
  { codigo: 'HSA02CAM0040', placa: '166002024', descripcion: 'CAMILLA DE EXAMEN FIJA', clase: 'EQUIPO MEDICO CIENTIFICO', marca: 'GENERICA', modelo: 'Tapizada', servicio: 'PROMOCION Y PREVENCION', sede: '02', estado: 'REGULAR', custodio: 'ENFERMERA JEFE', adquisicion: '2013-07-09', costo: 1150000 },

  // ── Terreno (no depreciable) ──
  { codigo: 'HSA01TER0041', placa: '160501001', descripcion: 'LOTE SEDE PRINCIPAL 2.400 M2', clase: 'TERRENOS', marca: 'NO APLICA', modelo: 'NO APLICA', servicio: 'ADMINISTRACION', sede: '01', estado: 'BUENO', custodio: 'SUBGERENTE ADMINISTRATIVO', adquisicion: '1998-05-14', costo: 320000000 },
];

const FECHA_TOMA = '2025-11-18';

function filaPl03(b: Bien): Fila {
  return [
    b.codigo,
    b.placa,
    b.descripcion,
    b.clase,
    b.marca,
    b.modelo,
    `SN-${b.placa}`,
    b.sede,
    b.servicio,
    1,
    b.estado,
    b.tenencia ?? 'PROPIO',
    b.custodio,
    FECHA_TOMA,
    'TECNICO DE INVENTARIO 1',
    null,
    'NO',
  ];
}

// ── PL-05 · hoja de vida y datos económicos ──────────────────────────────────

function filaPl05(b: Bien): Fila {
  const biomedico = b.clase === 'EQUIPO MEDICO CIENTIFICO';
  return [
    b.codigo,
    b.clase === 'TERRENOS' ? 'FIJO' : 'MOVIL',
    biomedico ? `INVIMA 2019DM-${b.placa}` : null,
    b.marca,
    'COLOMBIA',
    `${b.marca} ${b.modelo}`,
    b.estado === 'INSERVIBLE' ? 'FUERA_SERVICIO' : b.estado === 'MALO' ? 'NO_OPERATIVO' : 'OPERATIVO',
    'COMPRA',
    b.adquisicion,
    b.adquisicion === null ? null : 'FACTURA',
    b.adquisicion === null ? null : `FV-${b.placa}`,
    b.adquisicion === null ? null : 'DISTRIBUIDORA HOSPITALARIA DE ANTIOQUIA S.A.S',
    b.costo,
    0,
    'RECURSOS PROPIOS',
    null,
    null,
    null,
  ];
}

/** Bienes que sí tienen soporte económico; los otros van en SIN_SOPORTE. */
const CON_SOPORTE = BIENES.filter((b) => b.adquisicion !== null && b.costo !== null);
const SIN_SOPORTE = BIENES.filter((b) => b.adquisicion === null || b.costo === null);

const MANTENIMIENTOS: readonly Fila[] = [
  ['HSA01DES0002', '2025-03-12', 'PREVENTIVO', 'Calibracion de energia y prueba de descarga', 'BIOMEDICA DE ORIENTE S.A.S', 480000, 'SATISFACTORIO'],
  ['HSA01MON0001', '2025-04-08', 'PREVENTIVO', 'Limpieza de sensores y verificacion de alarmas', 'BIOMEDICA DE ORIENTE S.A.S', 260000, 'SATISFACTORIO'],
  ['HSA01ANA0019', '2025-02-19', 'PREVENTIVO', 'Mantenimiento anual y cambio de lampara', 'MINDRAY SERVICIO TECNICO', 1250000, 'SATISFACTORIO'],
  ['HSA01AGI0021', '2024-09-03', 'CORRECTIVO', 'Falla en tarjeta de control; se cotiza reparacion', 'BIOMEDICA DE ORIENTE S.A.S', 320000, 'NO SATISFACTORIO - REPARACION NO VIABLE'],
  ['HSA01ESTE034', '2024-11-21', 'CORRECTIVO', 'Resistencia quemada y termostato averiado', 'TALLER INDUSTRIAL GUARNE', 410000, 'NO SATISFACTORIO'],
  ['HSA01PLA0033', '2025-06-30', 'PREVENTIVO', 'Cambio de aceite, filtros y prueba con carga', 'CUMMINS DE COLOMBIA', 2100000, 'SATISFACTORIO'],
  ['HSA01CAH0008', '2024-08-15', 'CORRECTIVO', 'Manivela partida; repuesto descontinuado', 'TALLER INDUSTRIAL GUARNE', 180000, 'NO SATISFACTORIO'],
];

const RECONOCIMIENTO_INICIAL: readonly Fila[] = [
  ['HSA01MIC0018', 'MICROSCOPIO BINOCULAR TRIOCULAR', 'Se solicito a contabilidad y al archivo central; no aparece factura ni acta de donacion. Se consulto al proveedor y no conserva el registro.', 4200000, '2016-01-01', 'ING. BIOMEDICA - T.P. 05201-123456'],
  ['HSA01UPS0032', 'UPS DE 3 KVA PARA SERVIDOR', 'Bien recibido en donacion sin acta. Se estima el valor razonable por comparacion de mercado.', 5600000, '2019-03-01', 'ING. DE SISTEMAS - T.P. 05202-654321'],
];

// ── Escenario con problemas ──────────────────────────────────────────────────

/** Cada fila lleva un defecto puesto a propósito; el LEEME dice cuál. */
const BIENES_CON_PROBLEMAS: readonly Fila[] = [
  // 1. Correcta, para que se vea que las buenas sí entran.
  filaPl03(BIENES[0] as Bien),
  // 2. Código repetido con la fila anterior (RN-02-01).
  ['HSA01MON0001', '166002099', 'MONITOR DE SIGNOS VITALES (DUPLICADO)', 'EQUIPO MEDICO CIENTIFICO', 'MINDRAY', 'uMEC12', 'SN-X1', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 3. Placa repetida con la fila 1 (RN-02-01).
  ['HSA01OTRO001', '166002001', 'BOMBA DE INFUSION CON PLACA REPETIDA', 'EQUIPO MEDICO CIENTIFICO', 'B.BRAUN', 'Space', 'SN-X2', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 4. Clase que no está en el catálogo (VAL-02-03).
  ['HSA01RARO002', '166002098', 'EQUIPO DE CLASE INEXISTENTE', 'EQUIPO DE RAYOS GAMMA', 'GENERICA', 'X', 'SN-X3', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 5. Sede que no existe (VAL-02-03).
  ['HSA09OTRA003', '166002097', 'EQUIPO EN SEDE INEXISTENTE', 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-X4', '09', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 6. El servicio existe, pero no en esa sede (VAL-02-03).
  ['HSA02MALO004', '166002096', 'EQUIPO CON SERVICIO DE OTRA SEDE', 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-X5', '02', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'ENFERMERA JEFE', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 7. Estado físico fuera del catálogo (VAL-02-04).
  ['HSA01ESTA005', '166002095', 'EQUIPO CON ESTADO INVENTADO', 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-X6', '01', 'URGENCIAS', 1, 'MAS O MENOS', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 8. Falta la descripción funcional, que es obligatoria.
  ['HSA01SIND006', '166002094', null, 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-X7', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 9. Serie repetida: ADVERTENCIA, no error (RN-02-05). Entra igual.
  ['HSA01SERI007', '166002093', 'EQUIPO CON SERIE REPETIDA', 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-166002001', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', FECHA_TOMA, 'TECNICO 1', null, 'NO'],
  // 10. Toma posterior a la fecha de corte: ADVERTENCIA. Entra igual.
  ['HSA01TARD008', '166002092', 'EQUIPO CONTADO DESPUES DEL CORTE', 'EQUIPO MEDICO CIENTIFICO', 'GENERICA', 'X', 'SN-X9', '01', 'URGENCIAS', 1, 'BUENO', 'PROPIO', 'JEFE DE ENFERMERIA', '2026-02-14', 'TECNICO 1', null, 'NO'],
];

const HOJAS_VIDA_CON_PROBLEMAS: readonly Fila[] = [
  // 1. Código que no está en el inventario (hay que importar PL-03 primero).
  ['HSA01NOEXISTE', 'MOVIL', null, 'GENERICA', 'COLOMBIA', 'X', 'OPERATIVO', 'COMPRA', '2020-01-15', 'FACTURA', 'FV-1', 'PROVEEDOR', 4000000, 0, 'RECURSOS PROPIOS', null, null, null],
  // 2. Adquisición posterior a la fecha de corte (VAL-03-02, bloqueante).
  ['HSA01MON0001', 'MOVIL', null, 'MINDRAY', 'CHINA', 'X', 'OPERATIVO', 'COMPRA', '2026-03-01', 'FACTURA', 'FV-2', 'PROVEEDOR', 15800000, 0, 'RECURSOS PROPIOS', null, null, null],
  // 3. Costo en cero sin ser donación: se trata como dato faltante (RN-03-02).
  ['HSA01DES0002', 'MOVIL', null, 'PHILIPS', 'ESTADOS UNIDOS', 'X', 'OPERATIVO', 'COMPRA', '2021-08-30', 'FACTURA', 'FV-3', 'PROVEEDOR', 0, 0, 'RECURSOS PROPIOS', null, null, null],
  // 4. Sobrescribe la vida útil técnica sin justificarlo (RN-03-06).
  ['HSA01ELE0003', 'MOVIL', null, 'NIHON KOHDEN', 'JAPON', 'X', 'OPERATIVO', 'COMPRA', '2016-05-20', 'FACTURA', 'FV-4', 'PROVEEDOR', 9800000, 0, 'RECURSOS PROPIOS', null, 8, null],
  // 5. Estado operativo fuera del catálogo.
  ['HSA01ASP0004', 'MOVIL', null, 'MEDELA', 'SUIZA', 'X', 'MEDIO BUENO', 'COMPRA', '2023-02-10', 'FACTURA', 'FV-5', 'PROVEEDOR', 3400000, 0, 'RECURSOS PROPIOS', null, null, null],
];

// ── Generación ───────────────────────────────────────────────────────────────

async function generarCasoLimpio(): Promise<void> {
  const carpeta = join(salida, '01_caso_limpio');
  console.log('\n01_caso_limpio — importa sin un solo error:');
  await generarPl01(carpeta);

  const pl02 = await abrir('PL-02_clases_vida_util.xlsx');
  escribir(pl02, 'CLASES', CLASES);
  await guardar(pl02, carpeta, 'PL-02_clases_vida_util.xlsx');

  const pl02b = await abrir('PL-02b_sedes_servicios.xlsx');
  escribir(pl02b, 'SEDES', SEDES);
  escribir(pl02b, 'SERVICIOS', SERVICIOS);
  await guardar(pl02b, carpeta, 'PL-02b_sedes_servicios.xlsx');

  const pl03 = await abrir('PL-03_toma_inventario_fisico.xlsx');
  escribir(pl03, 'INVENTARIO', BIENES.map(filaPl03));
  await guardar(pl03, carpeta, 'PL-03_toma_inventario_fisico.xlsx');

  const pl05 = await abrir('PL-05_hoja_de_vida.xlsx');
  escribir(pl05, 'HOJA_VIDA', CON_SOPORTE.map(filaPl05));
  escribir(pl05, 'MANTENIMIENTOS', MANTENIMIENTOS);
  escribir(pl05, 'SIN_SOPORTE', RECONOCIMIENTO_INICIAL);
  await guardar(pl05, carpeta, 'PL-05_hoja_de_vida.xlsx');
}

async function generarCasoConProblemas(): Promise<void> {
  const carpeta = join(salida, '02_caso_con_problemas');
  console.log('\n02_caso_con_problemas — cada defecto está puesto a propósito:');

  const pl03 = await abrir('PL-03_toma_inventario_fisico.xlsx');
  escribir(pl03, 'INVENTARIO', BIENES_CON_PROBLEMAS);
  await guardar(pl03, carpeta, 'PL-03_toma_inventario_fisico.xlsx');

  const pl05 = await abrir('PL-05_hoja_de_vida.xlsx');
  escribir(pl05, 'HOJA_VIDA', HOJAS_VIDA_CON_PROBLEMAS);
  await guardar(pl05, carpeta, 'PL-05_hoja_de_vida.xlsx');
}

function generarLeeme(): void {
  const texto = `# Datos de prueba — ${HOSPITAL.razonSocial}

> **Hospital ficticio.** Ningún dato de esta carpeta corresponde a una entidad real.
> Se genera con \`npm run datos:prueba\` desde \`/app\`, a partir de las plantillas
> reales de \`Plantillas_Valuacion_Activos/excel\`.

| Dato | Valor |
|---|---|
| Razón social | ${HOSPITAL.razonSocial} |
| NIT | ${HOSPITAL.nit} |
| Municipio | ${HOSPITAL.municipio}, ${HOSPITAL.departamento} |
| Nivel de complejidad | ${HOSPITAL.nivel} |
| Fecha de corte | ${HOSPITAL.fechaCorte} |
| Bienes | ${BIENES.length} en 2 sedes y 8 servicios |

---

## Cómo usarlo

### 1. Cree la entidad y el ejercicio (etapa 1)

En la aplicación: **Nueva entidad**. Puede teclear los datos o importarlos con
\`01_caso_limpio/PL-01_parametros_entidad.xlsx\` desde *Datos de la entidad*.

Después, en el paso 01:

1. **Clases de activo** → importar \`PL-02_clases_vida_util.xlsx\`.
2. **Sedes y servicios** → importar \`PL-02b_sedes_servicios.xlsx\`.
3. **Parámetros de cálculo** → marcar **"método de conteo confirmado por acta"**.
   Sin eso la aplicación se niega a calcular, y hace bien: es \`VAL-01-07\`.
4. **Ejercicio** → crearlo con fecha de corte **${HOSPITAL.fechaCorte}**.

> Al importar PL-01 verá una advertencia sobre \`fecha_corte_ejercicio\`: la fecha
> de corte se fija al crear el ejercicio, no desde la plantilla. Es correcto.

### 2. Importe el inventario (etapa 3)

En **3. Inventario → Importar**:

1. \`PL-03_toma_inventario_fisico.xlsx\` → ${BIENES.length} bienes.
2. \`PL-05_hoja_de_vida.xlsx\` → datos económicos, mantenimientos y los avalúos
   de reconocimiento inicial.

### 3. Calcule (etapa 4)

**4. Calcular → Calcular.** Debería ver:

- Los cuatro colores del semáforo poblados.
- Varios **candidatos a baja**: los que superaron su vida útil y los que están en
  mal estado pasado el umbral.
- En *"Qué quedó fuera del cálculo"*: el **terreno** (no depreciable) y el
  **ventilador en comodato** (no entra al patrimonio, \`RN-02-04\`).

### 4. Bajas e informe (etapas 5 y 6)

Cierre el inventario, proponga la baja de algún candidato con una justificación
individual, recorra la decisión del Comité y genere el PDF.

---

## Qué trae el caso limpio, a propósito

| Situación | Dónde | Para qué sirve |
|---|---|---|
| Bienes de 1998 a 2024 | todo el inventario | Que el semáforo muestre los cuatro colores |
| \`HSA01CAH0009\` inservible de 2008 | Hospitalización | Candidato a baja claro |
| \`HSA01AGI0021\` y \`HSA01ESTE034\` | Laboratorio y Mantenimiento | Correctivo **fallido** registrado: candidatos por ese criterio |
| \`HSA01MIC0018\` y \`HSA01UPS0032\` | sin fecha ni costo | Entran **INCOMPLETOS**; se resuelven con la hoja \`SIN_SOPORTE\` (\`RN-03-04\`) |
| \`HSA01VEN0037\` en comodato | Urgencias | No se deprecia: no es de la entidad (\`RN-02-04\`) |
| \`HSA01TER0041\` terreno | Administración | Clase no depreciable: aparece como **NO APLICA**, no como cero |
| 7 mantenimientos | \`PL-05\` | Alimentan \`VAL-03-05\` y el criterio de baja |

---

## Qué trae el caso con problemas

Sirve para ver **cómo informa la aplicación**, fila por fila. Impórtelo sobre una
entidad que ya tenga el catálogo del caso limpio.

### \`PL-03\` — 10 filas

| # | Defecto | Qué debe pasar |
|:-:|---|---|
| 1 | Ninguno | Entra |
| 2 | Código institucional repetido | **Error** · \`RN-02-01\` |
| 3 | Placa repetida | **Error** · \`RN-02-01\` |
| 4 | Clase que no está en el catálogo | **Error** · dice que la importe con PL-02 |
| 5 | Sede inexistente | **Error** · dice que la importe con PL-02b |
| 6 | Servicio que existe, pero en otra sede | **Error** · nombra la sede |
| 7 | Estado físico inventado | **Error** · lista los valores admitidos |
| 8 | Sin descripción funcional | **Error** · campo obligatorio vacío |
| 9 | Serie repetida | **Advertencia** · entra igual (\`RN-02-05\`) |
| 10 | Contado después del corte | **Advertencia** · entra igual |

Resultado esperado: **3 filas válidas, 7 con error**. La aplicación no importa
nada hasta que usted confirme explícitamente que quiere entrar solo las válidas.

### \`PL-05\` — 5 filas

| # | Defecto | Qué debe pasar |
|:-:|---|---|
| 1 | Código que no está en el inventario | **Error** · dice que importe PL-03 antes |
| 2 | Adquisición posterior al corte | **Error** · \`VAL-03-02\` |
| 3 | Costo en cero sin ser donación | **Advertencia** · se trata como dato faltante (\`RN-03-02\`) |
| 4 | Vida útil sobrescrita sin justificación | **Error** · \`RN-03-06\` |
| 5 | Estado operativo fuera del catálogo | **Error** · lista los admitidos |

---

## Regenerar

\`\`\`
cd app
npm run datos:prueba
\`\`\`

Los datos están en \`app/scripts/generar-datos-prueba.ts\`; edítelos ahí si quiere
otro hospital, más bienes u otros defectos.
`;
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'LEEME.md'), texto, 'utf8');
  console.log('\n  ✓ LEEME.md');
}

async function principal(): Promise<void> {
  console.log(`Generando datos de prueba para ${HOSPITAL.razonSocial}`);
  console.log(`Destino: ${salida}`);
  await generarCasoLimpio();
  await generarCasoConProblemas();
  generarLeeme();
  console.log(`\nListo: ${BIENES.length} bienes, ${CLASES.length} clases, ${SEDES.length} sedes, ${SERVICIOS.length} servicios.`);
  console.log(`Sin soporte económico (van a SIN_SOPORTE): ${SIN_SOPORTE.length}`);
}

void principal();
