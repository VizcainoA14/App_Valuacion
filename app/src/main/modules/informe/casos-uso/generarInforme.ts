/**
 * El informe de valuación, que es la entrega (TR-05).
 *
 * ADR-028: uno por corte. Reúne lo que ese corte calculó y no vuelve a calcular
 * nada, así que un informe regenerado meses después dice lo mismo que el
 * primero. No lleva firmas: es el soporte de cálculo que el hospital usa en su
 * propio trámite.
 */
import { basename, join } from 'node:path';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { Centavos, Uuid } from '../../../../compartido/tipos/basicos';
import { comoCentavos } from '../../../../compartido/tipos/basicos';
import { CAUSAL_BAJA, type CausalBaja } from '../../../../compartido/enums/catalogos';
import { ErrorValidacion } from '../../../../compartido/errores';
import { escribirPdf } from '../../../infraestructura/documental/pdf/generarPdf';
import { exigirCorte, resumenCalculo } from '../../calculo';
import { listarCandidatos } from '../../bajas';
import {
  construirInformeHtml,
  type DatosInforme,
  type FilaBajaInforme,
  type FilaCandidatoInforme,
  type FilaDetalleInforme,
  type FilaExcluidaInforme,
  type FilaSubcuentaInforme,
} from '../plantilla/informeHtml';

interface FilaProceso {
  nombre: string;
  razon_social: string;
  nit: string;
  municipio: string;
  departamento: string;
  es_demostracion: number;
}

/**
 * Las marcas de tiempo se guardan en UTC; el informe las muestra en la hora del
 * equipo, igual que la pantalla. Sin esto el PDF decía "20:45" de algo que el
 * usuario hizo a las 3:45 p. m.
 */
function horaLocal(iso: string): string {
  const d = new Date(iso);
  const dos = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

const AMBITO: Readonly<Record<string, string>> = { GENERAL: 'Todo el cálculo', OBSOLESCENCIA: 'Obsolescencia', DEPRECIACION: 'Depreciación' };

/** Reúne todo lo que el informe declara. Función de lectura: no escribe nada. */
export function datosDelInforme(ctx: ContextoIpc, corteId: Uuid): DatosInforme {
  const corte = exigirCorte(ctx, corteId);
  const entidad = ctx.sqlite.prepare('SELECT nombre, razon_social, nit, municipio, departamento, es_demostracion FROM proceso WHERE id = ?').get(corte.procesoId) as FilaProceso | undefined;
  if (entidad === undefined) throw new ErrorValidacion('PROCESO_INEXISTENTE', 'El proceso del corte no existe.', { campo: 'corteId' });
  const p = corte.parametros;
  const resumen = resumenCalculo({ corteId }, ctx);

  const subcuentas = (
    ctx.sqlite
      .prepare(
        `SELECT k.subcuenta_contable AS subcuenta, k.nombre AS clase, COUNT(*) AS bienes,
                SUM(d.saldo_final_ajustado_cent) AS saldo, SUM(d.depreciacion_acumulada_cent) AS dep, SUM(d.valor_neto_libros_cent) AS neto
           FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id JOIN clase_activo k ON k.id = b.clase_activo_id
          WHERE d.corte_id = ?
          GROUP BY k.subcuenta_contable, k.nombre
          ORDER BY k.subcuenta_contable`,
      )
      .all(corteId) as { subcuenta: string; clase: string; bienes: number; saldo: number; dep: number; neto: number }[]
  ).map<FilaSubcuentaInforme>((f) => ({
    subcuenta: f.subcuenta,
    clase: f.clase,
    bienes: f.bienes,
    saldoAjustado: comoCentavos(f.saldo),
    depreciacionAcumulada: comoCentavos(f.dep),
    valorNeto: comoCentavos(f.neto),
  }));

  const candidatos = listarCandidatos({ corteId, incluirYaDadosDeBaja: true }, ctx).map<FilaCandidatoInforme>((c) => ({
    codigo: c.codigoInstitucional,
    descripcion: c.descripcionFuncional,
    clase: c.claseNombre,
    indice: c.indiceObsolescencia,
    motivos: c.motivos,
    valorNeto: c.valorNetoLibros,
  }));

  // Las bajas que el hospital registró con fecha hasta la del corte: contexto
  // para quien lee, no cifras del cálculo (esos bienes ya no entraron).
  const bajas = (
    ctx.sqlite
      .prepare(
        `SELECT b.codigo_institucional AS codigo, b.descripcion_funcional AS descripcion, j.fecha, j.causal, j.justificacion, j.referencia
           FROM baja j JOIN bien b ON b.id = j.bien_id
          WHERE b.proceso_id = ? AND j.anulada_en IS NULL AND j.fecha <= ?
          ORDER BY j.fecha, b.codigo_institucional`,
      )
      .all(corte.procesoId, corte.fechaCorte) as { codigo: string; descripcion: string; fecha: string; causal: string; justificacion: string; referencia: string | null }[]
  ).map<FilaBajaInforme>((f) => ({
    codigo: f.codigo,
    descripcion: f.descripcion,
    fecha: f.fecha,
    causal: CAUSAL_BAJA.es(f.causal) ? CAUSAL_BAJA.etiqueta(f.causal as CausalBaja) : f.causal,
    justificacion: f.justificacion,
    referencia: f.referencia,
  }));

  const excluidos = (
    ctx.sqlite
      .prepare(
        `SELECT b.codigo_institucional AS codigo, x.ambito, x.motivo
           FROM calculo_exclusion x JOIN bien b ON b.id = x.bien_id
          WHERE x.corte_id = ?
          ORDER BY b.codigo_institucional, x.ambito`,
      )
      .all(corteId) as { codigo: string; ambito: string; motivo: string }[]
  ).map<FilaExcluidaInforme>((f) => ({ codigo: f.codigo, ambito: AMBITO[f.ambito] ?? f.ambito, motivo: f.motivo }));

  const detalle = (
    ctx.sqlite
      .prepare(
        `SELECT b.codigo_institucional AS codigo, b.descripcion_funcional AS descripcion, k.nombre AS clase, v.nombre AS servicio,
                h.fecha_adquisicion, d.saldo_final_ajustado_cent AS saldo, d.depreciacion_acumulada_cent AS dep,
                d.valor_neto_libros_cent AS neto, o.indice_obsolescencia_x10k AS indice, o.semaforo
           FROM bien b
             JOIN clase_activo k ON k.id = b.clase_activo_id
             JOIN servicio v ON v.id = b.servicio_id
             LEFT JOIN hoja_vida h ON h.bien_id = b.id
             LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.corte_id = @corte
             LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.corte_id = @corte
          WHERE b.id IN (SELECT bien_id FROM calculo_obsolescencia WHERE corte_id = @corte
                         UNION ALL SELECT bien_id FROM calculo_exclusion WHERE corte_id = @corte AND ambito = 'OBSOLESCENCIA')
          ORDER BY b.codigo_institucional`,
      )
      .all({ corte: corteId }) as {
      codigo: string;
      descripcion: string;
      clase: string;
      servicio: string;
      fecha_adquisicion: string | null;
      saldo: number | null;
      dep: number | null;
      neto: number | null;
      indice: number | null;
      semaforo: string | null;
    }[]
  ).map<FilaDetalleInforme>((f) => ({
    codigo: f.codigo,
    descripcion: f.descripcion,
    clase: f.clase,
    servicio: f.servicio,
    fechaAdquisicion: f.fecha_adquisicion,
    saldoAjustado: f.saldo === null ? null : (f.saldo as Centavos),
    depreciacionAcumulada: f.dep === null ? null : (f.dep as Centavos),
    valorNeto: f.neto === null ? null : (f.neto as Centavos),
    indice: f.indice === null ? null : f.indice / 10_000,
    semaforo: f.semaforo,
  }));

  return {
    razonSocial: entidad.razon_social,
    nit: entidad.nit,
    municipio: entidad.municipio,
    departamento: entidad.departamento,
    esDemostracion: entidad.es_demostracion === 1,
    nombreProceso: entidad.nombre,
    fechaCorte: corte.fechaCorte,
    calculadoEn: horaLocal(corte.calculadoEn),
    generadoEn: horaLocal(ctx.ahoraIso()),
    metodoConteo: p.metodo_conteo_meses,
    metodoDepreciacion: p.metodo_depreciacion,
    valorResidualPct: p.valor_residual_pct,
    depreciaMesAdquisicion: p.deprecia_mes_adquisicion,
    usaPuestaEnServicio: p.usa_puesta_en_servicio,
    bienesConsiderados: resumen.bienesConsiderados,
    conDepreciacion: resumen.conDepreciacion,
    sinDepreciacion: resumen.sinDepreciacion,
    noAplicaDepreciacion: resumen.noAplicaDepreciacion,
    totalSaldoAjustado: resumen.totalSaldoAjustado,
    totalDepreciacion: resumen.totalDepreciacionAcumulada,
    totalValorNeto: resumen.totalValorNetoLibros,
    porSemaforo: resumen.porSemaforo,
    subcuentas,
    candidatos,
    bajas,
    excluidos,
    detalle,
  };
}

export function previsualizarInforme(e: EntradaValidadaDe<'informe:previsualizar'>, ctx: ContextoIpc): { html: string; bienes: number; candidatos: number } {
  const datos = datosDelInforme(ctx, e.corteId);
  return { html: construirInformeHtml(datos), bienes: datos.detalle.length, candidatos: datos.candidatos.length };
}

export async function generarInformePdf(e: EntradaValidadaDe<'informe:generar'>, ctx: ContextoIpc): Promise<{ ruta: string; bytes: number } | null> {
  const datos = datosDelInforme(ctx, e.corteId);
  const nombre = `Informe_valuacion_${datos.fechaCorte}.pdf`;
  const destino = await ctx.dialogos.elegirDondeGuardar('Guardar el informe de valuación', nombre);
  if (destino === null) return null;

  const html = construirInformeHtml(datos);
  const pie =
    `<div style="font-size:7pt;width:100%;padding:0 12mm;color:#555;display:flex;justify-content:space-between;">` +
    `<span>${datos.razonSocial.replace(/[<>&]/g, '')} · corte ${datos.fechaCorte} · método ${datos.metodoConteo}</span>` +
    `<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

  const r = await escribirPdf(html, destino, { encabezado: '<span></span>', pie });
  ctx.dialogos.revelarEnCarpeta(r.ruta);

  ctx.bitacora.registrar({
    entidadAfectada: 'corte',
    registroId: e.corteId,
    accion: 'EXPORTAR',
    campo: 'informe_valuacion',
    valorNuevo: `${basename(r.ruta)} · ${datos.detalle.length} bienes, ${datos.candidatos.length} candidatos a baja, método ${datos.metodoConteo}`,
  });
  return r;
}

/** Solo para pruebas: dónde quedaría el informe si se guardara sin diálogo. */
export function rutaSugeridaInforme(carpeta: string, fechaCorte: string): string {
  return join(carpeta, `Informe_valuacion_${fechaCorte}.pdf`);
}
