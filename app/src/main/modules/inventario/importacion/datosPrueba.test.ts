/**
 * Los datos de prueba del hospital ficticio (`/Datos_de_prueba`) se importan
 * de verdad, con el mismo camino que usaría un hospital.
 *
 * Sin esto, el juego de datos y su LEEME serían una promesa: se generan con un
 * script y nadie garantiza que sigan cuadrando cuando cambie una regla. Aquí se
 * comprueba lo que el LEEME afirma, archivo por archivo.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arnesPaso01, valor } from '../../configuracion/pruebas';
import { limpiarPrevisualizaciones } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import type { InformeImportacion, PlantillaImportable } from '../../../../compartido/dtos/importacion';

const raizRepo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..');
const limpio = join(raizRepo, 'Datos_de_prueba', '01_caso_limpio');
const conProblemas = join(raizRepo, 'Datos_de_prueba', '02_caso_con_problemas');

const FECHA_CORTE = '2025-12-31';
const BIENES_ESPERADOS = 41;

beforeEach(() => {
  limpiarPrevisualizaciones();
});

/** Prepara entidad y ejercicio, y devuelve un ayudante para importar archivos. */
async function arnes() {
  const a = await arnesPaso01({ hoy: '2026-01-15' });
  const entidad = valor(
    await a.registro.invocar('entidad:crear', {
      razonSocial: 'E.S.E. HOSPITAL SANTA ANA DE GUARNE',
      nit: '890905137-4',
      municipio: 'GUARNE',
      departamento: 'ANTIOQUIA',
      nivelComplejidad: 'II',
      nombreGerente: 'MARTHA LUCIA RESTREPO OSORIO',
      direccion: 'CARRERA 51 No. 50-12',
      precargarSemillas: false,
    }),
  );

  async function importar(carpeta: string, archivo: string, plantilla: PlantillaImportable, ejercicioId?: string): Promise<InformeImportacion> {
    a.seleccionarArchivo(join(carpeta, archivo));
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: entidad.id, plantilla, ejercicioId: ejercicioId ?? null }));
    if (informe === null) throw new Error(`sin informe para ${archivo}`);
    return informe;
  }

  async function confirmar(token: string, aceptarConErrores = false) {
    return valor(await a.registro.invocar('importacion:confirmar', { token, aceptarConErrores }));
  }

  return { ...a, entidadId: entidad.id, importar, confirmar };
}

describe('01_caso_limpio · el hospital ficticio entra sin un solo error', () => {
  it('recorre el proceso completo: catálogo, inventario, datos económicos y cálculo', async () => {
    if (!existsSync(limpio)) throw new Error('Faltan los datos de prueba. Ejecute: npm run datos:prueba');
    const a = await arnes();

    // ── Catálogo (paso 01) ──
    const clases = await a.importar(limpio, 'PL-02_clases_vida_util.xlsx', 'PL-02');
    expect(clases.errores).toBe(0);
    expect(clases.hojas[0]?.filasValidas).toBe(6);
    await a.confirmar(clases.token);

    const sedes = await a.importar(limpio, 'PL-02b_sedes_servicios.xlsx', 'PL-02b');
    expect(sedes.errores).toBe(0);
    expect(sedes.hojas.find((h) => h.hoja === 'SEDES')?.filasValidas).toBe(2);
    expect(sedes.hojas.find((h) => h.hoja === 'SERVICIOS')?.filasValidas).toBe(8);
    await a.confirmar(sedes.token);

    // PL-01 solo avisa de `fecha_corte_ejercicio`, que se aplica al crear el ejercicio.
    const parametros = await a.importar(limpio, 'PL-01_parametros_entidad.xlsx', 'PL-01');
    expect(parametros.errores).toBe(0);
    expect(parametros.incidencias.some((i) => i.columna === 'fecha_corte_ejercicio' && i.severidad === 'ADVERTENCIA')).toBe(true);
    await a.confirmar(parametros.token);

    // ── Ejercicio, con el método confirmado por acta (VAL-01-07) ──
    const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: a.entidadId }));
    expect(p.metodo_conteo_meses).toBe('dias_exactos');
    valor(await a.registro.invocar('parametros:actualizar', { entidadId: a.entidadId, cambios: { ...p, metodo_conteo_meses_confirmado: true }, justificacion: 'Acta de comité con el contador' }));
    const responsable = valor(await a.registro.invocar('responsable:crear', { entidadId: a.entidadId, nombreCompleto: 'JORGE IVAN GOMEZ', documentoIdentidad: '71000111', perfil: 'COORDINADOR', cargo: 'Subgerente administrativo' }));
    const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: a.entidadId, nombre: 'Corte 2025', fechaCorte: FECHA_CORTE, responsableId: responsable.id }));

    // ── Inventario (paso 02) ──
    const inventario = await a.importar(limpio, 'PL-03_toma_inventario_fisico.xlsx', 'PL-03', ejercicio.id);
    expect(inventario.errores).toBe(0);
    expect(inventario.hojas[0]?.filasValidas).toBe(BIENES_ESPERADOS);
    expect((await a.confirmar(inventario.token)).creados).toBe(BIENES_ESPERADOS);

    // ── Datos económicos (paso 03) ──
    const hojasVida = await a.importar(limpio, 'PL-05_hoja_de_vida.xlsx', 'PL-05', ejercicio.id);
    expect(hojasVida.errores).toBe(0);
    // 39 con soporte + 7 mantenimientos + 2 avalúos de reconocimiento inicial.
    expect(hojasVida.hojas.find((h) => h.hoja === 'HOJA_VIDA')?.filasValidas).toBe(39);
    expect(hojasVida.hojas.find((h) => h.hoja === 'MANTENIMIENTOS')?.filasValidas).toBe(7);
    expect(hojasVida.hojas.find((h) => h.hoja === 'SIN_SOPORTE')?.filasValidas).toBe(2);
    expect(hojasVida.incidencias.some((i) => i.motivo.includes('RN-03-04'))).toBe(true);
    await a.confirmar(hojasVida.token);

    // Los dos sin factura quedaron resueltos por el avalúo de reconocimiento inicial.
    const sinDatos = valor(await a.registro.invocar('bien:listar', { ejercicioId: ejercicio.id, filtros: { estadoRegistro: 'INCOMPLETO' }, orden: { columna: 'codigoInstitucional', ascendente: true }, pagina: 0, tamano: 5 }));
    expect(sinDatos.total).toBe(0);

    // ── Cálculo (paso 05/06) ──
    const calculo = valor(await a.registro.invocar('calculo:ejecutar', { entidadId: a.entidadId, ejercicioId: ejercicio.id }));
    expect(calculo.resumen.bienesConsiderados).toBe(BIENES_ESPERADOS);

    // El semáforo muestra los cuatro colores: es para lo que se repartieron las fechas.
    for (const color of ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'] as const) {
      expect(calculo.resumen.porSemaforo[color], `semáforo ${color}`).toBeGreaterThan(0);
    }
    expect(calculo.resumen.candidatosBaja).toBeGreaterThan(0);

    // El terreno y el comodato quedan fuera de la depreciación, cada uno con su motivo.
    const noAplica = calculo.exclusiones.filter((x) => x.ambito === 'DEPRECIACION' && x.estado === 'NO_APLICA');
    expect(noAplica.some((x) => x.codigoInstitucional === 'HSA01TER0041')).toBe(true);
    expect(noAplica.some((x) => x.codigoInstitucional === 'HSA01VEN0037' && x.motivo.includes('RN-02-04'))).toBe(true);
    expect(calculo.resumen.totalValorNetoLibros).toBeGreaterThan(0);

    // Y hay candidatos a baja con sus motivos, listos para la etapa 5.
    const candidatos = valor(await a.registro.invocar('baja:candidatos', { ejercicioId: ejercicio.id }));
    expect(candidatos.length).toBeGreaterThan(0);
    expect(candidatos.every((c) => c.motivos.length > 0)).toBe(true);
  });
});

describe('PL-01 crea la entidad, no solo la actualiza', () => {
  it('desde el formato diligenciado nace la entidad completa, con sus parámetros', async () => {
    const a = await arnesPaso01({ hoy: '2026-01-15' });
    expect(valor(await a.registro.invocar('entidad:listar', undefined))).toHaveLength(0);

    a.seleccionarArchivo(join(limpio, 'PL-01_parametros_entidad.xlsx'));
    const informe = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: null, plantilla: 'PL-01', ejercicioId: null }));
    if (informe === null) throw new Error('sin informe');
    expect(informe.errores).toBe(0);

    const r = valor(await a.registro.invocar('importacion:confirmar', { token: informe.token, aceptarConErrores: false }));
    expect(r.entidadId).not.toBeNull();

    const entidades = valor(await a.registro.invocar('entidad:listar', undefined));
    expect(entidades).toHaveLength(1);
    expect(entidades[0]?.razonSocial).toBe('E.S.E. HOSPITAL SANTA ANA DE GUARNE');
    expect(entidades[0]?.nit).toBe('890905137-4');
    expect(entidades[0]?.nivelComplejidad).toBe('II');
    expect(entidades[0]?.esDemostracion).toBe(false);

    // Los parámetros de cálculo de la plantilla también entraron…
    const p = valor(await a.registro.invocar('parametros:obtener', { entidadId: r.entidadId as string }));
    expect(p.metodo_conteo_meses).toBe('dias_exactos');
    expect(p.umbral_reparacion_baja_pct).toBe(50);
    // …pero el acta con el contador sigue haciendo falta: no se hereda del Excel (CT-02).
    expect(p.metodo_conteo_meses_confirmado).toBe(false);

    // Y el catálogo sugerido quedó precargado, igual que al crearla a mano.
    expect(valor(await a.registro.invocar('clase:listar', { entidadId: r.entidadId as string })).length).toBeGreaterThan(0);
  });

  it('no crea dos entidades con el mismo NIT: lo dice en la previsualización', async () => {
    const a = await arnesPaso01({ hoy: '2026-01-15' });
    a.seleccionarArchivo(join(limpio, 'PL-01_parametros_entidad.xlsx'));
    const primera = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: null, plantilla: 'PL-01', ejercicioId: null }));
    if (primera === null) throw new Error('sin informe');
    valor(await a.registro.invocar('importacion:confirmar', { token: primera.token, aceptarConErrores: false }));

    a.seleccionarArchivo(join(limpio, 'PL-01_parametros_entidad.xlsx'));
    const segunda = valor(await a.registro.invocar('importacion:previsualizar', { entidadId: null, plantilla: 'PL-01', ejercicioId: null }));
    if (segunda === null) throw new Error('sin informe');
    expect(segunda.importable).toBe(false);
    expect(segunda.incidencias.some((i) => i.columna === 'nit' && i.motivo.includes('Ya existe'))).toBe(true);
  });

  it('las demás plantillas siguen exigiendo una entidad: importarlas al aire no significa nada', async () => {
    const a = await arnesPaso01({ hoy: '2026-01-15' });
    for (const plantilla of ['PL-02', 'PL-02b', 'PL-03', 'PL-05'] as const) {
      const r = await a.registro.invocar('importacion:previsualizar', { entidadId: null, plantilla, ejercicioId: null });
      expect(r.ok, plantilla).toBe(false);
      if (!r.ok) expect(r.error.codigo).toBe('ENTIDAD_REQUERIDA');
    }
  });
});

describe('02_caso_con_problemas · la aplicación informa cada defecto, fila por fila', () => {
  it('PL-03: 3 filas válidas, 7 con error, y las advertencias no bloquean', async () => {
    if (!existsSync(conProblemas)) throw new Error('Faltan los datos de prueba. Ejecute: npm run datos:prueba');
    const a = await arnes();

    for (const [archivo, plantilla] of [
      ['PL-02_clases_vida_util.xlsx', 'PL-02'],
      ['PL-02b_sedes_servicios.xlsx', 'PL-02b'],
    ] as const) {
      const informe = await a.importar(limpio, archivo, plantilla);
      await a.confirmar(informe.token);
    }
    const responsable = valor(await a.registro.invocar('responsable:crear', { entidadId: a.entidadId, nombreCompleto: 'JORGE IVAN GOMEZ', documentoIdentidad: '71000111', perfil: 'COORDINADOR', cargo: 'Subgerente' }));
    const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: a.entidadId, nombre: 'Corte 2025', fechaCorte: FECHA_CORTE, responsableId: responsable.id }));

    const informe = await a.importar(conProblemas, 'PL-03_toma_inventario_fisico.xlsx', 'PL-03', ejercicio.id);
    expect(informe.hojas[0]).toMatchObject({ filasLeidas: 10, filasValidas: 3, filasConError: 7 });
    expect(informe.importable).toBe(false);

    const errores = informe.incidencias.filter((i) => i.severidad === 'ERROR').map((i) => `${i.columna}:${i.motivo}`);
    expect(errores.some((m) => m.startsWith('codigo_institucional:') && m.includes('Duplicado'))).toBe(true);
    expect(errores.some((m) => m.startsWith('placa:') && m.includes('RN-02-01'))).toBe(true);
    expect(errores.some((m) => m.startsWith('clase_activo:') && m.includes('PL-02'))).toBe(true);
    expect(errores.some((m) => m.startsWith('sede:') && m.includes('PL-02b'))).toBe(true);
    expect(errores.some((m) => m.startsWith('servicio_ubicacion:'))).toBe(true);
    expect(errores.some((m) => m.startsWith('estado_actual:'))).toBe(true);
    expect(errores.some((m) => m.startsWith('descripcion_funcional:') && m.includes('obligatorio'))).toBe(true);

    // Las dos advertencias entran igual: serie repetida y toma posterior al corte.
    const avisos = informe.incidencias.filter((i) => i.severidad === 'ADVERTENCIA');
    expect(avisos.some((i) => i.columna === 'serie' && i.motivo.includes('RN-02-05'))).toBe(true);
    expect(avisos.some((i) => i.columna === 'fecha_toma')).toBe(true);

    // Con confirmación explícita entran solo las válidas (ANEXO_A §3.3).
    const r = await a.confirmar(informe.token, true);
    expect(r.creados).toBe(3);
    expect(r.omitidos).toBe(7);
  });

  it('PL-05: señala el bien inexistente, la fecha posterior al corte y el override sin justificación', async () => {
    const a = await arnes();
    for (const [archivo, plantilla] of [
      ['PL-02_clases_vida_util.xlsx', 'PL-02'],
      ['PL-02b_sedes_servicios.xlsx', 'PL-02b'],
    ] as const) {
      const previo = await a.importar(limpio, archivo, plantilla);
      await a.confirmar(previo.token);
    }
    const responsable = valor(await a.registro.invocar('responsable:crear', { entidadId: a.entidadId, nombreCompleto: 'JORGE IVAN GOMEZ', documentoIdentidad: '71000111', perfil: 'COORDINADOR', cargo: 'Subgerente' }));
    const ejercicio = valor(await a.registro.invocar('ejercicio:crear', { entidadId: a.entidadId, nombre: 'Corte 2025', fechaCorte: FECHA_CORTE, responsableId: responsable.id }));

    const inventario = await a.importar(limpio, 'PL-03_toma_inventario_fisico.xlsx', 'PL-03', ejercicio.id);
    await a.confirmar(inventario.token);

    const informe = await a.importar(conProblemas, 'PL-05_hoja_de_vida.xlsx', 'PL-05', ejercicio.id);
    const errores = informe.incidencias.filter((i) => i.severidad === 'ERROR').map((i) => i.motivo);
    expect(errores.some((m) => m.includes('PL-03'))).toBe(true);
    expect(errores.some((m) => m.includes('VAL-03-02'))).toBe(true);
    expect(errores.some((m) => m.includes('RN-03-06'))).toBe(true);
    expect(errores.some((m) => m.includes('catálogo'))).toBe(true);

    // El costo en cero es advertencia: dato faltante, no bien gratuito.
    expect(informe.incidencias.some((i) => i.severidad === 'ADVERTENCIA' && i.motivo.includes('RN-03-02'))).toBe(true);
  });
});
