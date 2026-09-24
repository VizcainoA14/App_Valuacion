/**
 * RF-01-02 — PL-01, PL-02 y PL-02b como importadores registrables.
 * La maquinaria común (token, previsualización, transacción, copia y bitácora)
 * vive en `infraestructura/documental/excel/orquestadorImportacion`.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import { comoFechaIso } from '../../../../compartido/tipos/basicos';
import type { IncidenciaImportacion, NormalizacionAplicada } from '../../../../compartido/dtos/importacion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { leerYNormalizar, rechazarFila, type LecturaNormalizada, type FilaDatos } from '../../../infraestructura/documental/excel/importador';
import { leerLibro, normalizarClave } from '../../../infraestructura/documental/excel/lector';
import { normalizar, type FormatoFechaRegional, type ValorNormalizado } from '../../../infraestructura/documental/excel/normalizador';
import type { AmbitoImportacion, ImportadorPlantilla, ResultadoAplicacion } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { PL_01_HOJA, PL_02, PL_02B, CLAVES_PL_01 } from './plantillas';
import { procesoRepo } from '../repositorio/proceso.repo';
import { crearProceso } from '../casos-uso/procesos';
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

/** PL-02 y PL-02b siempre llegan con entidad; el orquestador ya lo garantiza. */
function exigirProceso(ambito: AmbitoImportacion): string {
  if (ambito.procesoId === null) throw new ErrorValidacion('PROCESO_REQUERIDO', 'Esta plantilla se importa dentro de un proceso.', { campo: 'procesoId' });
  return ambito.procesoId;
}

function texto(v: ValorNormalizado | undefined): string | null {
  return v === undefined || v === null ? null : String(v);
}

// ── Aplicadores ──────────────────────────────────────────────────────────────

function aplicarPl02b(ctx: ContextoIpc, procesoId: string, lectura: LecturaNormalizada): ResultadoAplicacion {
  let creados = 0;
  let actualizados = 0;
  const ahora = ctx.ahoraIso();
  for (const f of lectura.hojas['SEDES'] ?? []) {
    const d = f.datos;
    const datos = { codigo: String(d['codigo_sede']).toUpperCase(), nombre: String(d['nombre_sede']), direccion: String(d['direccion']), municipio: String(d['municipio']), activa: d['activa'] === true };
    const existente = sedeRepo.porCodigo(ctx.db, procesoId, datos.codigo);
    if (existente === null) {
      sedeRepo.insertar(ctx.db, { id: nuevoId(), procesoId, ...datos, creadoEn: ahora, actualizadoEn: ahora });
      creados += 1;
    } else {
      sedeRepo.actualizar(ctx.db, existente.id, datos, ahora);
      actualizados += 1;
    }
  }
  for (const f of lectura.hojas['SERVICIOS'] ?? []) {
    const d = f.datos;
    const sede = sedeRepo.porCodigo(ctx.db, procesoId, String(d['codigo_sede']).toUpperCase());
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

function aplicarPl02(ctx: ContextoIpc, procesoId: string, lectura: LecturaNormalizada): ResultadoAplicacion {
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
    const existente = claseRepo.porCodigo(ctx.db, procesoId, datos.codigo);
    if (existente === null) {
      claseRepo.insertar(ctx.db, { id: nuevoId(), procesoId, ...datos, creadoEn: ahora, actualizadoEn: ahora });
      creados += 1;
    } else {
      claseRepo.actualizar(ctx.db, existente.id, datos, ahora);
      actualizados += 1;
    }
  }
  return { creados, actualizados };
}

/** Lo mínimo que ANEXO_B §2.1 exige para que una entidad exista. */
const IDENTIFICACION_OBLIGATORIA: readonly string[] = ['razon_social', 'nit', 'municipio', 'departamento', 'nivel_complejidad', 'nombre_gerente', 'direccion'];

function faltantesDeIdentificacion(datos: FilaDatos): string[] {
  return IDENTIFICACION_OBLIGATORIA.filter((c) => {
    const v = datos[c];
    return v === undefined || v === null || String(v).trim() === '';
  });
}

function aplicarPl01(ctx: ContextoIpc, ambito: AmbitoImportacion, lectura: LecturaNormalizada): ResultadoAplicacion {
  const datos: FilaDatos = lectura.hojas['PARAMETROS']?.[0]?.datos ?? {};
  const cambiosHospital: Record<string, string> = {};
  const cambiosParametros: Record<string, ValorNormalizado> = {};
  for (const [clave, def] of Object.entries(CLAVES_PL_01)) {
    const v = datos[clave];
    if (v === undefined || v === null) continue;
    if (def.destino === 'hospital') cambiosHospital[def.campo] = String(v);
    if (def.destino === 'parametro') cambiosParametros[def.campo] = v;
  }
  const ahora = ctx.ahoraIso();

  // ── Sin proceso: la plantilla lo CREA ──
  // Es como llega un hospital que recibió el formato diligenciado y todavía no
  // ha tecleado nada. La fecha de corte sale de la plantilla (la validación ya
  // exigió que viniera). Se reutiliza el caso de uso de creación para no
  // duplicar ni las semillas ni la bitácora.
  if (ambito.procesoId === null) {
    const fechaCorte = comoFechaIso(String(datos['fecha_corte_ejercicio']));
    const creada = crearProceso(
      {
        nombre: `Valuación con corte al ${fechaCorte.slice(8, 10)}/${fechaCorte.slice(5, 7)}/${fechaCorte.slice(0, 4)}`,
        fechaCorte,
        razonSocial: cambiosHospital['razonSocial'] ?? '',
        nit: cambiosHospital['nit'] ?? '',
        municipio: cambiosHospital['municipio'] ?? '',
        departamento: cambiosHospital['departamento'] ?? '',
        nivelComplejidad: (cambiosHospital['nivelComplejidad'] ?? 'I') as 'I' | 'II' | 'III',
        nombreGerente: cambiosHospital['nombreGerente'] ?? '',
        actoNombramientoGerente: cambiosHospital['actoNombramientoGerente'] ?? null,
        direccion: cambiosHospital['direccion'] ?? '',
        telefono: cambiosHospital['telefono'] ?? null,
        email: cambiosHospital['email'] ?? null,
        // El catálogo sugerido se precarga igual que al crearla a mano; después
        // PL-02 lo reemplaza con el del hospital si lo trae.
        precargarSemillas: true,
      },
      ctx,
    );
    let aplicados = Object.keys(cambiosHospital).length;
    if (Object.keys(cambiosParametros).length > 0) {
      const actuales = parametroRepo.obtener(ctx.db, creada.id);
      const nuevos: ParametrosCalculo = EsquemaParametrosCalculo.parse({ ...actuales, ...cambiosParametros });
      parametroRepo.guardar(ctx.db, creada.id, nuevos, ahora);
      aplicados += Object.keys(cambiosParametros).length;
    }
    return { creados: aplicados, actualizados: 0, procesoId: creada.id };
  }

  const procesoId = ambito.procesoId;
  let actualizados = 0;
  if (Object.keys(cambiosHospital).length > 0) {
    procesoRepo.actualizar(ctx.db, procesoId, cambiosHospital, ahora);
    actualizados += Object.keys(cambiosHospital).length;
  }
  if (Object.keys(cambiosParametros).length > 0) {
    const actuales = parametroRepo.obtener(ctx.db, procesoId);
    const nuevos: ParametrosCalculo = EsquemaParametrosCalculo.parse({ ...actuales, ...cambiosParametros });
    parametroRepo.guardar(ctx.db, procesoId, nuevos, ahora);
    actualizados += Object.keys(cambiosParametros).length;
  }
  return { creados: 0, actualizados, procesoId };
}

// ── Los tres importadores del paso 01 ────────────────────────────────────────

export const IMPORTADORES_PASO_01: readonly ImportadorPlantilla[] = [
  {
    codigo: 'PL-01',
    // Única plantilla que puede llegar sin proceso: lo crea.
    requiereProceso: false,
    leer: leerPl01,
    validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
      const datos = lectura.hojas['PARAMETROS']?.[0]?.datos ?? {};

      // Crear el proceso exige la identificación completa y la fecha de corte:
      // sin ellas no hay encabezado para el informe ni fecha a la que calcular.
      // Se avisa AQUÍ, en la previsualización, y no al confirmar.
      const fecha = datos['fecha_corte_ejercicio'];
      const hoy = ctx.ahoraIso().slice(0, 10);
      if (ambito.procesoId === null) {
        for (const campo of faltantesDeIdentificacion(datos)) {
          lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: campo, valorRecibido: null, motivo: `Para crear el proceso desde la plantilla, "${campo}" es obligatorio (ANEXO_B §2.1).`, severidad: 'ERROR' });
        }
        if (typeof fecha !== 'string' || fecha === '') {
          lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: 'fecha_corte_ejercicio', valorRecibido: null, motivo: 'Para crear el proceso desde la plantilla hace falta la fecha de corte: escríbala en el formato o cree el proceso a mano.', severidad: 'ERROR' });
        } else if (fecha > hoy) {
          lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: 'fecha_corte_ejercicio', valorRecibido: fecha, motivo: `La fecha de corte no puede ser futura (hoy es ${hoy}).`, severidad: 'ERROR' });
        }
      } else if (typeof fecha === 'string') {
        const actual = procesoRepo.porId(ctx.db, ambito.procesoId);
        if (actual !== null && actual.fechaCorte !== fecha) {
          lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: 'fecha_corte_ejercicio', valorRecibido: fecha, motivo: `El proceso calcula al ${actual.fechaCorte}; la plantilla no lo cambia. Si hace falta, cámbielo en Configurar.`, severidad: 'ADVERTENCIA' });
        }
      }

      const parcial: Record<string, ValorNormalizado> = {};
      for (const [clave, def] of Object.entries(CLAVES_PL_01)) if (def.destino === 'parametro' && datos[clave] !== undefined) parcial[def.campo] = datos[clave];
      const r = EsquemaParametrosCalculo.partial().safeParse(parcial);
      if (!r.success) {
        for (const i of r.error.issues) lectura.incidencias.push({ hoja: 'PARAMETROS', fila: 0, columna: i.path.join('.'), valorRecibido: String(parcial[String(i.path[0])] ?? ''), motivo: i.message, severidad: 'ERROR' });
      }
    },
    aplicar: (ambito, lectura, ctx) => aplicarPl01(ctx, ambito, lectura),
  },
  {
    codigo: 'PL-02',
    leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_02, formatoFecha),
    validarNegocio: () => undefined,
    aplicar: (ambito, lectura, ctx) => aplicarPl02(ctx, exigirProceso(ambito), lectura),
  },
  {
    codigo: 'PL-02b',
    leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_02B, formatoFecha),
    validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
      const sedesArchivo = new Set((lectura.hojas['SEDES'] ?? []).map((f) => String(f.datos['codigo_sede']).toUpperCase()));
      const sedesBase = new Set(sedeRepo.listar(ctx.db, exigirProceso(ambito), true).map((s) => s.codigo.toUpperCase()));
      for (const f of [...(lectura.hojas['SERVICIOS'] ?? [])]) {
        const cod = String(f.datos['codigo_sede']).toUpperCase();
        if (!sedesArchivo.has(cod) && !sedesBase.has(cod)) {
          rechazarFila(lectura, 'SERVICIOS', f.numero, { hoja: 'SERVICIOS', fila: f.numero, columna: 'codigo_sede', valorRecibido: cod, motivo: 'La sede no existe ni en la hoja SEDES ni en la entidad', severidad: 'ERROR' });
        }
      }
    },
    aplicar: (ambito, lectura, ctx) => aplicarPl02b(ctx, exigirProceso(ambito), lectura),
  },
];
