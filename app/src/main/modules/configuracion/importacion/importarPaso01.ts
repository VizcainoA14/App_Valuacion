/**
 * RF-01-02 — PL-01, PL-02 y PL-02b como importadores registrables.
 * La maquinaria común (token, previsualización, transacción, copia y bitácora)
 * vive en `infraestructura/documental/excel/orquestadorImportacion`.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { IncidenciaImportacion, NormalizacionAplicada } from '../../../../compartido/dtos/importacion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { leerYNormalizar, rechazarFila, type LecturaNormalizada, type FilaDatos } from '../../../infraestructura/documental/excel/importador';
import { leerLibro, normalizarClave } from '../../../infraestructura/documental/excel/lector';
import { normalizar, type FormatoFechaRegional, type ValorNormalizado } from '../../../infraestructura/documental/excel/normalizador';
import type { AmbitoImportacion, ImportadorPlantilla, ResultadoAplicacion } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { PL_01_HOJA, PL_02, PL_02B, CLAVES_PL_01 } from './plantillas';
import { entidadRepo } from '../repositorio/entidad.repo';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { claseRepo, aniosAX10k } from '../repositorio/clase.repo';
import { parametroRepo } from '../repositorio/parametro.repo';

// ── PL-01: clave/valor → normalización por clave ──────────────────────────────

async function leerPl01(archivo: string, formatoFecha: FormatoFechaRegional): Promise<LecturaNormalizada> {
  const { hojas, hojasFaltantes } = await leerLibro(archivo, [PL_01_HOJA]);
  const incidencias: IncidenciaImportacion[] = [];
  const normalizaciones: NormalizacionAplicada[] = [];
  const hoja = hojas[0];
  if (hoja === undefined || hojasFaltantes.length > 0 || hoja.filaEncabezados === 0) {
    incidencias.push({ hoja: PL_01_HOJA.nombre, fila: 0, columna: null, valorRecibido: null, motivo: 'No se encontró la hoja PARAMETROS con las columnas campo/valor', severidad: 'ERROR' });
    return { hojas: { PARAMETROS: [] }, resumen: [{ hoja: 'PARAMETROS', filaEncabezados: 0, filasLeidas: 0, filasValidas: 0, filasConError: 0, filasEjemploOmitidas: 0 }], incidencias, normalizaciones };
  }

  const datos: Record<string, ValorNormalizado> = {};
  let conError = 0;
  let leidas = 0;
  for (const fila of hoja.filas) {
    const campoCrudo = fila.celdas['campo'];
    if (campoCrudo === null || campoCrudo === undefined) continue;
    leidas += 1;
    const clave = normalizarClave(String(campoCrudo));
    const def = CLAVES_PL_01[clave];
    if (def === undefined) {
      incidencias.push({ hoja: 'PARAMETROS', fila: fila.numero, columna: 'campo', valorRecibido: String(campoCrudo), motivo: 'Campo desconocido; se omite', severidad: 'ADVERTENCIA' });
      continue;
    }
    if (def.destino === 'ignorar') {
      incidencias.push({ hoja: 'PARAMETROS', fila: fila.numero, columna: 'valor', valorRecibido: null, motivo: `${clave}: el logo se carga desde la aplicación, no desde la plantilla`, severidad: 'ADVERTENCIA' });
      continue;
    }
    const r = normalizar(fila.celdas['valor'], def.tipo, { formatoFecha, ...(def.catalogo !== undefined ? { catalogo: def.catalogo } : {}) });
    if (!r.ok) {
      conError += 1;
      incidencias.push({ hoja: 'PARAMETROS', fila: fila.numero, columna: 'valor', valorRecibido: String(fila.celdas['valor']), motivo: `${clave}: ${r.motivo}`, severidad: 'ERROR' });
      continue;
    }
    if (r.nota !== undefined) normalizaciones.push({ hoja: 'PARAMETROS', fila: fila.numero, columna: clave, recibido: String(fila.celdas['valor']), interpretado: r.nota.interpretado, regla: r.nota.regla });
    // Los umbrales monetarios de ANEXO_B §2.5 son parámetros numéricos (pesos), no importes contables.
    if (r.valor !== null) datos[clave] = def.tipo === 'moneda' ? Number(r.valor) : r.valor;
  }
  return {
    hojas: { PARAMETROS: [{ numero: hoja.filaEncabezados + 1, datos }] },
    resumen: [{ hoja: 'PARAMETROS', filaEncabezados: hoja.filaEncabezados, filasLeidas: leidas, filasValidas: leidas - conError, filasConError: conError, filasEjemploOmitidas: 0 }],
    incidencias,
    normalizaciones,
  };
}

function texto(v: ValorNormalizado | undefined): string | null {
  return v === undefined || v === null ? null : String(v);
}

// ── Aplicadores ──────────────────────────────────────────────────────────────

function aplicarPl02b(ctx: ContextoIpc, entidadId: string, lectura: LecturaNormalizada): ResultadoAplicacion {
  let creados = 0;
  let actualizados = 0;
  const ahora = ctx.ahoraIso();
  for (const f of lectura.hojas['SEDES'] ?? []) {
    const d = f.datos;
    const datos = { codigo: String(d['codigo_sede']).toUpperCase(), nombre: String(d['nombre_sede']), direccion: String(d['direccion']), municipio: String(d['municipio']), activa: d['activa'] === true };
    const existente = sedeRepo.porCodigo(ctx.db, entidadId, datos.codigo);
    if (existente === null) {
      sedeRepo.insertar(ctx.db, { id: nuevoId(), entidadId, ...datos, creadoEn: ahora, actualizadoEn: ahora });
      creados += 1;
    } else {
      sedeRepo.actualizar(ctx.db, existente.id, datos, ahora);
      actualizados += 1;
    }
  }
  for (const f of lectura.hojas['SERVICIOS'] ?? []) {
    const d = f.datos;
    const sede = sedeRepo.porCodigo(ctx.db, entidadId, String(d['codigo_sede']).toUpperCase());
    if (sede === null) throw new ErrorValidacion('SEDE_INEXISTENTE', `Fila ${f.numero}: la sede ${String(d['codigo_sede'])} no existe.`);
    const datos = { codigo: String(d['codigo_servicio']).toUpperCase(), nombre: String(d['nombre_servicio']), tipo: String(d['tipo']) as 'asistencial' | 'administrativo' | 'apoyo', responsable: texto(d['responsable']), activo: d['activo'] === true };
    const existente = servicioRepo.porCodigo(ctx.db, sede.id, datos.codigo);
    if (existente === null) {
      servicioRepo.insertar(ctx.db, { id: nuevoId(), sedeId: sede.id, ...datos, creadoEn: ahora, actualizadoEn: ahora });
      creados += 1;
    } else {
      servicioRepo.actualizar(ctx.db, existente.id, datos, ahora);
      actualizados += 1;
    }
  }
  return { creados, actualizados };
}

function aplicarPl02(ctx: ContextoIpc, entidadId: string, lectura: LecturaNormalizada): ResultadoAplicacion {
  let creados = 0;
  let actualizados = 0;
  const ahora = ctx.ahoraIso();
  for (const f of lectura.hojas['CLASES'] ?? []) {
    const d = f.datos;
    const datos = {
      codigo: String(d['codigo_clase']).toUpperCase(),
      nombre: String(d['nombre_clase']),
      subcuentaContable: String(d['subcuenta_contable']),
      esDepreciable: d['es_depreciable'] === true,
      vidaUtilContableMeses: typeof d['vida_util_contable_meses'] === 'number' ? d['vida_util_contable_meses'] : null,
      vidaUtilTecnicaAnios: aniosAX10k(typeof d['vida_util_tecnica_anios'] === 'number' ? d['vida_util_tecnica_anios'] : null),
      requiereHojaVida: d['requiere_hoja_vida'] === true,
      requiereInvima: d['requiere_invima'] === true,
      responsableTecnico: String(d['responsable_tecnico']),
      activo: d['activo'] === true,
    };
    const existente = claseRepo.porCodigo(ctx.db, entidadId, datos.codigo);
    if (existente === null) {
      claseRepo.insertar(ctx.db, { id: nuevoId(), entidadId, ...datos, creadoEn: ahora, actualizadoEn: ahora });
      creados += 1;
    } else {
      claseRepo.actualizar(ctx.db, existente.id, datos, ahora);
      actualizados += 1;
    }
  }
  return { creados, actualizados };
}

function aplicarPl01(ctx: ContextoIpc, entidadId: string, lectura: LecturaNormalizada): ResultadoAplicacion {
  const datos: FilaDatos = lectura.hojas['PARAMETROS']?.[0]?.datos ?? {};
  const cambiosEntidad: Record<string, string> = {};
  const cambiosParametros: Record<string, ValorNormalizado> = {};
  for (const [clave, def] of Object.entries(CLAVES_PL_01)) {
    const v = datos[clave];
    if (v === undefined || v === null) continue;
    if (def.destino === 'entidad') cambiosEntidad[def.campo] = String(v);
    if (def.destino === 'parametro') cambiosParametros[def.campo] = v;
  }
  const ahora = ctx.ahoraIso();
  let actualizados = 0;
  if (Object.keys(cambiosEntidad).length > 0) {
    const actual = entidadRepo.porId(ctx.db, entidadId);
    if (actual !== null && typeof cambiosEntidad['nit'] === 'string' && cambiosEntidad['nit'] !== actual.nit && entidadRepo.porNit(ctx.db, cambiosEntidad['nit']) !== null) {
      throw new ErrorReglaNegocio('NIT_DUPLICADO', 'Otra entidad ya tiene el NIT de la plantilla.', { campo: 'nit' });
    }
    entidadRepo.actualizar(ctx.db, entidadId, cambiosEntidad, ahora);
    actualizados += Object.keys(cambiosEntidad).length;
  }
  if (Object.keys(cambiosParametros).length > 0) {
    const actuales = parametroRepo.obtener(ctx.db, entidadId);
    const nuevos: ParametrosCalculo = EsquemaParametrosCalculo.parse({ ...actuales, ...cambiosParametros });
    if (nuevos.metodo_conteo_meses !== actuales.metodo_conteo_meses) nuevos.metodo_conteo_meses_confirmado = false;
    parametroRepo.guardar(ctx.db, entidadId, nuevos, ahora);
    actualizados += Object.keys(cambiosParametros).length;
  }
  return { creados: 0, actualizados };
}

// ── Los tres importadores del paso 01 ────────────────────────────────────────

export const IMPORTADORES_PASO_01: readonly ImportadorPlantilla[] = [
  {
    codigo: 'PL-01',
    requiereEjercicio: false,
    leer: leerPl01,
    validarNegocio(_ambito: AmbitoImportacion, lectura: LecturaNormalizada): void {
      const datos = lectura.hojas['PARAMETROS']?.[0]?.datos ?? {};
      const parcial: Record<string, ValorNormalizado> = {};
      for (const [clave, def] of Object.entries(CLAVES_PL_01)) if (def.destino === 'parametro' && datos[clave] !== undefined) parcial[def.campo] = datos[clave];
      const r = EsquemaParametrosCalculo.partial().safeParse(parcial);
      if (!r.success) {
        for (const i of r.error.issues) lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: i.path.join('.'), valorRecibido: String(parcial[String(i.path[0])] ?? ''), motivo: i.message, severidad: 'ERROR' });
      }
      if (datos['fecha_corte_ejercicio'] !== undefined) {
        lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: 'fecha_corte_ejercicio', valorRecibido: String(datos['fecha_corte_ejercicio']), motivo: 'La fecha de corte se aplica al crear el ejercicio (RF-01-05); aquí solo se muestra', severidad: 'ADVERTENCIA' });
      }
    },
    aplicar: (ambito, lectura, ctx) => aplicarPl01(ctx, ambito.entidadId, lectura),
  },
  {
    codigo: 'PL-02',
    requiereEjercicio: false,
    leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_02, formatoFecha),
    validarNegocio: () => undefined,
    aplicar: (ambito, lectura, ctx) => aplicarPl02(ctx, ambito.entidadId, lectura),
  },
  {
    codigo: 'PL-02b',
    requiereEjercicio: false,
    leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_02B, formatoFecha),
    validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
      const sedesArchivo = new Set((lectura.hojas['SEDES'] ?? []).map((f) => String(f.datos['codigo_sede']).toUpperCase()));
      const sedesBase = new Set(sedeRepo.listar(ctx.db, ambito.entidadId, true).map((s) => s.codigo.toUpperCase()));
      for (const f of [...(lectura.hojas['SERVICIOS'] ?? [])]) {
        const cod = String(f.datos['codigo_sede']).toUpperCase();
        if (!sedesArchivo.has(cod) && !sedesBase.has(cod)) {
          rechazarFila(lectura, 'SERVICIOS', f.numero, { hoja: 'SERVICIOS', fila: f.numero, columna: 'codigo_sede', valorRecibido: cod, motivo: 'La sede no existe ni en la hoja SEDES ni en la entidad', severidad: 'ERROR' });
        }
      }
    },
    aplicar: (ambito, lectura, ctx) => aplicarPl02b(ctx, ambito.entidadId, lectura),
  },
];
