/**
 * RF-03-03 — Importación masiva del bloque económico (`PL-05`). Es la plantilla que trae **la fecha y el
 * costo de adquisición**: sin esos dos datos el motor de depreciación no tiene
 * de dónde partir (RN-03-01), así que en el orden de ADR-026 va pegada a PL-03.
 *
 * Reglas que aplica:
 *   RN-03-01  sin fecha o sin costo el bien queda fuera de la depreciación, y el
 *             cálculo lo relaciona con su motivo (nunca como un cero)
 *   RN-03-02  un costo en cero es dato faltante, salvo donación
 *   RN-03-04  la hoja SIN_SOPORTE es el avalúo de reconocimiento inicial, y el
 *             libro importado queda registrado como su soporte (con su huella SHA-256)
 *   RN-03-06  sobrescribir la vida útil técnica exige justificación
 *   VAL-03-02 la fecha de adquisición no puede ser futura. Frente a la fecha de
 *             corte la compara cada cálculo: un bien comprado después del corte
 *             simplemente no entra a ese corte (ADR-028).
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { IncidenciaImportacion } from '../../../../compartido/dtos/importacion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { aCentavos, aX10k } from '../../../../compartido/motor/dinero';
import { leerYNormalizar, rechazarFila, type FilaNormalizada, type LecturaNormalizada } from '../../../infraestructura/documental/excel/importador';
import type { ArchivoImportado, AmbitoImportacion, ImportadorPlantilla, ResultadoAplicacion } from '../../../infraestructura/documental/excel/orquestadorImportacion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { hojaVidaRepo, type HojaVidaParaEscribir, type MantenimientoParaEscribir, type SoporteParaEscribir } from '../repositorio/hojaVida.repo';
import { HOJA_MANTENIMIENTOS, HOJA_SIN_SOPORTE, HOJA_VIDA, PL_05 } from './plantillaPl05';

/** Tipo del soporte que deja la hoja SIN_SOPORTE (RN-03-04). */
export const TIPO_SOPORTE_RECONOCIMIENTO_INICIAL = 'AVALUO_RECONOCIMIENTO_INICIAL';

function clave(v: unknown): string {
  return String(v).trim().toUpperCase();
}

function texto(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function error(hoja: string, fila: number, columna: string, valor: unknown, motivo: string): IncidenciaImportacion {
  return { hoja, fila, columna, valorRecibido: valor === null || valor === undefined ? null : String(valor), motivo, severidad: 'ERROR' };
}

/** Lo resuelto por fila: a qué bien pertenece y qué costo quedó tras RN-03-02. */
interface Resuelto {
  readonly bienId: string;
  readonly costoCent: number | null;
}
const resueltos = new WeakMap<FilaNormalizada, Resuelto>();
const bienesDeMantenimiento = new WeakMap<FilaNormalizada, string>();
const bienesSinSoporte = new WeakMap<FilaNormalizada, string>();

function validarNegocio(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc): void {
  if (ambito.procesoId === null) return;
  const bienes = hojaVidaRepo.bienesPorCodigo(ctx.sqlite, ambito.procesoId);
  const hoy = ctx.ahoraIso().slice(0, 10);

  if (bienes.size === 0) {
    lectura.incidencias.push({
      hoja: HOJA_VIDA,
      fila: 0,
      columna: null,
      valorRecibido: null,
      motivo: 'La entidad todavía no tiene bienes. Importe primero un barrido (PL-03, toma de inventario físico); PL-05 se apoya en el código institucional de cada bien.',
      severidad: 'ERROR',
    });
  }

  let sinDatosEconomicos = 0;

  for (const f of [...(lectura.hojas[HOJA_VIDA] ?? [])]) {
    const d = f.datos;
    const codigo = clave(d['codigo_institucional']);
    const bien = bienes.get(codigo);
    if (bien === undefined) {
      rechazarFila(lectura, HOJA_VIDA, f.numero, error(HOJA_VIDA, f.numero, 'codigo_institucional', d['codigo_institucional'], 'No hay ningún bien con ese código en el inventario (impórtelo con PL-03 antes)'));
      continue;
    }

    // VAL-03-02: una compra con fecha futura es un error de digitación.
    const fechaAdq = typeof d['fecha_adquisicion'] === 'string' ? d['fecha_adquisicion'] : null;
    if (fechaAdq !== null && fechaAdq > hoy) {
      rechazarFila(lectura, HOJA_VIDA, f.numero, error(HOJA_VIDA, f.numero, 'fecha_adquisicion', fechaAdq, `VAL-03-02: la fecha de adquisición es futura (hoy es ${hoy})`));
      continue;
    }

    // RN-03-06: sobrescribir la vida útil del catálogo sin decir por qué no vale.
    if (d['vida_util_tecnica_override'] !== null && d['vida_util_tecnica_override'] !== undefined && texto(d['justificacion_override']) === null) {
      rechazarFila(lectura, HOJA_VIDA, f.numero, error(HOJA_VIDA, f.numero, 'justificacion_override', null, 'RN-03-06: para sobrescribir la vida útil técnica hay que registrar la justificación'));
      continue;
    }

    // RN-03-02: el cero no es un costo. Solo la donación puede valer cero, y con acta.
    let costoCent: number | null = d['costo_adquisicion'] === null || d['costo_adquisicion'] === undefined ? null : aCentavos(String(d['costo_adquisicion']));
    if (costoCent === 0) {
      if (clave(d['forma_adquisicion']) === 'DONACION') {
        lectura.incidencias.push({ hoja: HOJA_VIDA, fila: f.numero, columna: 'costo_adquisicion', valorRecibido: '0', motivo: 'RN-03-02: donación declarada en cero. Se registra así; conserve el acta de la donación.', severidad: 'ADVERTENCIA' });
      } else {
        costoCent = null;
        lectura.incidencias.push({ hoja: HOJA_VIDA, fila: f.numero, columna: 'costo_adquisicion', valorRecibido: '0', motivo: 'RN-03-02: un costo en cero se trata como dato faltante, no como bien gratuito. El bien no se depreciará hasta tener costo.', severidad: 'ADVERTENCIA' });
      }
    }

    if (fechaAdq === null || costoCent === null) sinDatosEconomicos += 1;
    resueltos.set(f, { bienId: bien.id, costoCent });
  }

  if (sinDatosEconomicos > 0) {
    lectura.incidencias.push({
      hoja: HOJA_VIDA,
      fila: 0,
      columna: null,
      valorRecibido: String(sinDatosEconomicos),
      motivo: `RN-03-01: a ${sinDatosEconomicos} bienes les falta fecha o costo de adquisición. No entran al cálculo de depreciación hasta resolverlo (hoja SIN_SOPORTE o PL-05 corregido); el informe los relaciona.`,
      severidad: 'ADVERTENCIA',
    });
  }

  for (const f of [...(lectura.hojas[HOJA_MANTENIMIENTOS] ?? [])]) {
    const bien = bienes.get(clave(f.datos['codigo_institucional']));
    if (bien === undefined) {
      rechazarFila(lectura, HOJA_MANTENIMIENTOS, f.numero, error(HOJA_MANTENIMIENTOS, f.numero, 'codigo_institucional', f.datos['codigo_institucional'], 'No hay ningún bien con ese código en el inventario'));
      continue;
    }
    bienesDeMantenimiento.set(f, bien.id);
  }

  for (const f of [...(lectura.hojas[HOJA_SIN_SOPORTE] ?? [])]) {
    const bien = bienes.get(clave(f.datos['codigo_institucional']));
    if (bien === undefined) {
      rechazarFila(lectura, HOJA_SIN_SOPORTE, f.numero, error(HOJA_SIN_SOPORTE, f.numero, 'codigo_institucional', f.datos['codigo_institucional'], 'No hay ningún bien con ese código en el inventario'));
      continue;
    }
    const fechaProbable = typeof f.datos['fecha_probable_adquisicion'] === 'string' ? f.datos['fecha_probable_adquisicion'] : null;
    if (fechaProbable !== null && fechaProbable > hoy) {
      rechazarFila(lectura, HOJA_SIN_SOPORTE, f.numero, error(HOJA_SIN_SOPORTE, f.numero, 'fecha_probable_adquisicion', fechaProbable, `La fecha probable es futura (hoy es ${hoy})`));
      continue;
    }
    bienesSinSoporte.set(f, bien.id);
  }

  const conReconocimiento = (lectura.hojas[HOJA_SIN_SOPORTE] ?? []).length;
  if (conReconocimiento > 0) {
    lectura.incidencias.push({
      hoja: HOJA_SIN_SOPORTE,
      fila: 0,
      columna: null,
      valorRecibido: String(conReconocimiento),
      motivo: `RN-03-04: ${conReconocimiento} bienes se valoran por avalúo técnico de reconocimiento inicial. El libro que está importando queda archivado como su soporte.`,
      severidad: 'ADVERTENCIA',
    });
  }
}

function aplicar(ambito: AmbitoImportacion, lectura: LecturaNormalizada, ctx: ContextoIpc, archivo: ArchivoImportado): ResultadoAplicacion {
  if (ambito.procesoId === null) throw new ErrorValidacion('PROCESO_REQUERIDO', 'PL-05 se importa dentro de un proceso.', { campo: 'procesoId' });
  const ahora = ctx.ahoraIso();

  const hojas: HojaVidaParaEscribir[] = [];

  for (const f of lectura.hojas[HOJA_VIDA] ?? []) {
    const r = resueltos.get(f);
    if (r === undefined) continue;
    const d = f.datos;
    const fechaAdquisicion = typeof d['fecha_adquisicion'] === 'string' ? d['fecha_adquisicion'] : null;
    hojas.push({
      id: nuevoId(),
      bienId: r.bienId,
      tipoInstalacion: texto(d['tipo_instalacion']),
      registroInvima: texto(d['registro_invima']),
      especificaciones: texto(d['especificaciones']),
      fabricante: texto(d['fabricante']),
      paisOrigen: texto(d['pais_origen']),
      estadoOperativo: String(d['estado_operativo']),
      formaAdquisicion: String(d['forma_adquisicion']),
      fechaAdquisicion,
      documentoAdquisicion: texto(d['documento_adquisicion']),
      numeroFactura: texto(d['numero_factura']),
      proveedor: texto(d['proveedor']),
      costoAdquisicionCent: r.costoCent,
      adicionesMejorasCent: d['adiciones_mejoras'] === null || d['adiciones_mejoras'] === undefined ? 0 : aCentavos(String(d['adiciones_mejoras'])),
      fuenteFinanciacion: texto(d['fuente_financiacion']),
      fechaPuestaServicio: typeof d['fecha_puesta_servicio'] === 'string' ? d['fecha_puesta_servicio'] : null,
      vidaUtilTecnicaOverrideX10k: typeof d['vida_util_tecnica_override'] === 'number' ? aX10k(d['vida_util_tecnica_override']) : null,
      justificacionOverride: texto(d['justificacion_override']),
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  // RN-03-04 — el avalúo de reconocimiento inicial sustituye a la factura que no
  // aparece. Se escribe DESPUÉS de HOJA_VIDA para que gane si un bien está en las
  // dos hojas: la constancia del especialista es la que tiene respaldo escrito.
  const soportes: SoporteParaEscribir[] = [];
  for (const f of lectura.hojas[HOJA_SIN_SOPORTE] ?? []) {
    const bienId = bienesSinSoporte.get(f);
    if (bienId === undefined) continue;
    const d = f.datos;
    const costoCent = aCentavos(String(d['valor_estimado_tecnico']));
    const previa = hojas.find((h) => h.bienId === bienId);
    const gestion = `Avalúo técnico de reconocimiento inicial (RN-03-04). Especialista: ${String(d['especialista'])}. Gestión realizada: ${String(d['gestion_realizada'])}`;
    if (previa === undefined) {
      hojas.push({
        id: nuevoId(),
        bienId,
        tipoInstalacion: null,
        registroInvima: null,
        especificaciones: texto(d['descripcion_bien']),
        fabricante: null,
        paisOrigen: null,
        estadoOperativo: 'OPERATIVO',
        formaAdquisicion: 'COMPRA',
        fechaAdquisicion: String(d['fecha_probable_adquisicion']),
        documentoAdquisicion: gestion,
        numeroFactura: null,
        proveedor: null,
        costoAdquisicionCent: costoCent,
        adicionesMejorasCent: 0,
        fuenteFinanciacion: null,
        fechaPuestaServicio: null,
        vidaUtilTecnicaOverrideX10k: null,
        justificacionOverride: null,
        creadoEn: ahora,
        actualizadoEn: ahora,
      });
    } else {
      hojas[hojas.indexOf(previa)] = {
        ...previa,
        fechaAdquisicion: String(d['fecha_probable_adquisicion']),
        costoAdquisicionCent: costoCent,
        documentoAdquisicion: gestion,
      };
    }
    soportes.push({
      id: nuevoId(),
      bienId,
      tipoDocumento: TIPO_SOPORTE_RECONOCIMIENTO_INICIAL,
      url: archivo.conservado,
      hashSha256: archivo.hashSha256,
      cargadoEn: ahora,
    });
  }

  const { creadas, actualizadas } = hojaVidaRepo.guardarLote(ctx.sqlite, hojas);
  hojaVidaRepo.insertarSoportes(ctx.sqlite, soportes);

  const mantenimientos: MantenimientoParaEscribir[] = [];
  const filasMant = lectura.hojas[HOJA_MANTENIMIENTOS] ?? [];
  const bienIdsMant = filasMant.flatMap((f) => bienesDeMantenimiento.get(f) ?? []);
  const yaRegistrados = new Set(hojaVidaRepo.mantenimientosExistentes(ctx.sqlite, bienIdsMant));
  for (const f of filasMant) {
    const bienId = bienesDeMantenimiento.get(f);
    if (bienId === undefined) continue;
    const d = f.datos;
    const huella = `${bienId}|${String(d['fecha_mantenimiento'])}|${clave(d['tipo'])}`;
    if (yaRegistrados.has(huella)) continue;
    yaRegistrados.add(huella);
    mantenimientos.push({
      id: nuevoId(),
      bienId,
      fecha: String(d['fecha_mantenimiento']),
      tipo: String(d['tipo']),
      descripcion: String(d['descripcion']),
      ejecutadoPor: texto(d['ejecutado_por']),
      costoCent: d['costo'] === null || d['costo'] === undefined ? null : aCentavos(String(d['costo'])),
      resultado: texto(d['resultado']),
      creadoEn: ahora,
    });
  }
  hojaVidaRepo.insertarMantenimientos(ctx.sqlite, mantenimientos);

  return { creados: creadas + soportes.length + mantenimientos.length, actualizados: actualizadas };
}

export const IMPORTADOR_PL_05: ImportadorPlantilla = {
  codigo: 'PL-05',
  leer: (archivo, formatoFecha) => leerYNormalizar(archivo, PL_05, formatoFecha),
  validarNegocio,
  aplicar,
};
