/**
 * ADR-026 etapa 6 — **el informe**, que es la entrega.
 *
 * Reúne lo que ya está calculado y decidido; no vuelve a calcular nada. Si el
 * cálculo quedó desfasado, se avisa antes de dejar firmar un PDF con cifras
 * viejas.
 */
import { basename, join } from 'node:path';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { Centavos } from '../../../../compartido/tipos/basicos';
import { comoCentavos } from '../../../../compartido/tipos/basicos';
import { CAUSAL_BAJA, type CausalBaja } from '../../../../compartido/enums/catalogos';
import { ESTADO_PROPUESTA_BAJA, type EstadoPropuestaBaja } from '../../../../compartido/enums/estados';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { escribirPdf } from '../../../infraestructura/documental/pdf/generarPdf';
import { construirInformeHtml, type DatosInforme, type FilaBajaInforme, type FilaDetalleInforme, type FilaExcluidaInforme, type FilaSubcuentaInforme } from '../plantilla/informeHtml';

interface FilaEntidad {
  razon_social: string;
  nit: string;
  municipio: string;
  departamento: string;
  nombre_gerente: string;
  nombre_contador: string | null;
  tarjeta_profesional_contador: string | null;
  es_demostracion: number;
}

/** Reúne todo lo que el informe declara. Función de lectura: no escribe nada. */
export function datosDelInforme(ctx: ContextoIpc, entidadId: string, ejercicioId: string): DatosInforme {
  const entidad = ctx.sqlite.prepare('SELECT razon_social, nit, municipio, departamento, nombre_gerente, nombre_contador, tarjeta_profesional_contador, es_demostracion FROM entidad WHERE id = ?').get(entidadId) as FilaEntidad | undefined;
  if (entidad === undefined) throw new ErrorValidacion('ENTIDAD_INEXISTENTE', 'La entidad no existe.', { campo: 'entidadId' });

  const ejercicio = ctx.sqlite.prepare('SELECT nombre, fecha_corte, entidad_id, parametros_congelados_json AS j FROM ejercicio WHERE id = ?').get(ejercicioId) as
    | { nombre: string; fecha_corte: string; entidad_id: string; j: string }
    | undefined;
  if (ejercicio === undefined || ejercicio.entidad_id !== entidadId) {
    throw new ErrorValidacion('EJERCICIO_INEXISTENTE', 'El ejercicio no existe o no pertenece a la entidad.', { campo: 'ejercicioId' });
  }
  const p = EsquemaParametrosCalculo.parse(JSON.parse(ejercicio.j));

  const totales = ctx.sqlite
    .prepare(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(saldo_final_ajustado_cent), 0) AS saldo,
              COALESCE(SUM(depreciacion_acumulada_cent), 0) AS dep,
              COALESCE(SUM(deterioro_cent), 0) AS det,
              COALESCE(SUM(valor_neto_libros_cent), 0) AS neto,
              MAX(metodo_conteo_aplicado) AS metodo
         FROM calculo_depreciacion WHERE ejercicio_id = ?`,
    )
    .get(ejercicioId) as { n: number; saldo: number; dep: number; det: number; neto: number; metodo: string | null };

  if (totales.n === 0) {
    throw new ErrorReglaNegocio(
      'SIN_CALCULO',
      'El ejercicio todavía no tiene cálculo: el informe no puede declarar cifras que nadie calculó. Ejecute el cálculo de la etapa 4 antes de generarlo.',
    );
  }

  const vivos = (ctx.sqlite.prepare(`SELECT COUNT(*) AS n FROM bien WHERE ejercicio_id = ? AND estado_registro <> 'DADO_DE_BAJA'`).get(ejercicioId) as { n: number }).n;
  const noAplica = (
    ctx.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA' AND (b.condicion_tenencia <> 'PROPIO' OR k.es_depreciable = 0)`,
      )
      .get(ejercicioId) as { n: number }
  ).n;

  const porSemaforo: Record<string, number> = {};
  for (const f of ctx.sqlite.prepare('SELECT semaforo, COUNT(*) AS n FROM calculo_obsolescencia WHERE ejercicio_id = ? GROUP BY semaforo').all(ejercicioId) as { semaforo: string; n: number }[]) {
    porSemaforo[f.semaforo] = f.n;
  }

  const subcuentas = (
    ctx.sqlite
      .prepare(
        `SELECT k.subcuenta_contable AS subcuenta, k.nombre AS clase, COUNT(*) AS bienes,
                SUM(d.saldo_final_ajustado_cent) AS saldo, SUM(d.depreciacion_acumulada_cent) AS dep, SUM(d.valor_neto_libros_cent) AS neto
           FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id JOIN clase_activo k ON k.id = b.clase_activo_id
          WHERE d.ejercicio_id = ?
          GROUP BY k.subcuenta_contable, k.nombre
          ORDER BY k.subcuenta_contable`,
      )
      .all(ejercicioId) as { subcuenta: string; clase: string; bienes: number; saldo: number; dep: number; neto: number }[]
  ).map<FilaSubcuentaInforme>((f) => ({
    subcuenta: f.subcuenta,
    clase: f.clase,
    bienes: f.bienes,
    saldoAjustado: comoCentavos(f.saldo),
    depreciacionAcumulada: comoCentavos(f.dep),
    valorNeto: comoCentavos(f.neto),
  }));

  const bajas = (
    ctx.sqlite
      .prepare(
        `SELECT b.codigo_institucional AS codigo, b.descripcion_funcional AS descripcion, p.causal, p.justificacion_tecnica AS justificacion,
                r.nombre_completo AS especialista, p.estado_aprobacion AS estado,
                COALESCE(d.valor_neto_libros_cent, 0) AS neto, COALESCE(p.valor_salvamento_cent, 0) AS salvamento
           FROM propuesta_baja p
             JOIN bien b ON b.id = p.bien_id
             JOIN responsable r ON r.id = p.especialista_id
             LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = p.ejercicio_id
          WHERE p.ejercicio_id = ? AND p.estado_aprobacion <> 'RECHAZADO'
          ORDER BY b.codigo_institucional`,
      )
      .all(ejercicioId) as { codigo: string; descripcion: string; causal: string; justificacion: string; especialista: string; estado: string; neto: number; salvamento: number }[]
  ).map<FilaBajaInforme>((f) => ({
    codigo: f.codigo,
    descripcion: f.descripcion,
    causal: CAUSAL_BAJA.es(f.causal) ? CAUSAL_BAJA.etiqueta(f.causal as CausalBaja) : f.causal,
    justificacion: f.justificacion,
    especialista: f.especialista,
    estado: ESTADO_PROPUESTA_BAJA.es(f.estado) ? ESTADO_PROPUESTA_BAJA.etiqueta(f.estado as EstadoPropuestaBaja) : f.estado,
    valorNeto: comoCentavos(f.neto),
    perdida: comoCentavos(Math.max(0, f.neto - f.salvamento)),
  }));

  // Lo que quedó fuera: un bien vivo y propio sin fila de cálculo, con su razón.
  const excluidos = (
    ctx.sqlite
      .prepare(
        `SELECT b.codigo_institucional AS codigo,
                CASE WHEN h.id IS NULL THEN 'Sin hoja de vida'
                     WHEN h.fecha_adquisicion IS NULL THEN 'Sin fecha de adquisición'
                     WHEN h.costo_adquisicion_cent IS NULL OR h.costo_adquisicion_cent <= 0 THEN 'Sin costo de adquisición'
                     WHEN k.vida_util_contable_meses IS NULL OR k.vida_util_contable_meses <= 0 THEN 'La clase no tiene vida útil contable'
                     ELSE 'No calculado' END AS motivo
           FROM bien b
             JOIN clase_activo k ON k.id = b.clase_activo_id
             LEFT JOIN hoja_vida h ON h.bien_id = b.id
             LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = b.ejercicio_id
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
            AND b.condicion_tenencia = 'PROPIO' AND k.es_depreciable = 1 AND d.id IS NULL
          ORDER BY b.codigo_institucional`,
      )
      .all(ejercicioId) as { codigo: string; motivo: string }[]
  ).map<FilaExcluidaInforme>((f) => ({ codigo: f.codigo, ambito: 'Depreciación', motivo: f.motivo }));

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
             LEFT JOIN calculo_depreciacion d ON d.bien_id = b.id AND d.ejercicio_id = b.ejercicio_id
             LEFT JOIN calculo_obsolescencia o ON o.bien_id = b.id AND o.ejercicio_id = b.ejercicio_id
          WHERE b.ejercicio_id = ? AND b.estado_registro <> 'DADO_DE_BAJA'
          ORDER BY b.codigo_institucional`,
      )
      .all(ejercicioId) as {
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
    gerente: entidad.nombre_gerente,
    contador: entidad.nombre_contador,
    tarjetaProfesionalContador: entidad.tarjeta_profesional_contador,
    esDemostracion: entidad.es_demostracion === 1,
    ejercicio: ejercicio.nombre,
    fechaCorte: ejercicio.fecha_corte,
    generadoEn: ctx.ahoraIso().slice(0, 16).replace('T', ' '),
    metodoConteo: totales.metodo ?? p.metodo_conteo_meses,
    metodoDepreciacion: p.metodo_depreciacion,
    valorResidualPct: p.valor_residual_pct,
    depreciaMesAdquisicion: p.deprecia_mes_adquisicion,
    usaPuestaEnServicio: p.usa_puesta_en_servicio,
    bienesConsiderados: vivos,
    conDepreciacion: totales.n,
    sinDepreciacion: Math.max(0, vivos - noAplica - totales.n),
    noAplicaDepreciacion: noAplica,
    totalSaldoAjustado: comoCentavos(totales.saldo),
    totalDepreciacion: comoCentavos(totales.dep),
    totalDeterioro: comoCentavos(totales.det),
    totalValorNeto: comoCentavos(totales.neto),
    porSemaforo,
    subcuentas,
    bajas,
    perdidaBajas: comoCentavos(bajas.reduce((n, b) => n + b.perdida, 0)),
    excluidos,
    detalle,
  };
}

export function previsualizarInforme(e: EntradaValidadaDe<'informe:previsualizar'>, ctx: ContextoIpc): { html: string; bienes: number; bajas: number } {
  const datos = datosDelInforme(ctx, e.entidadId, e.ejercicioId);
  return { html: construirInformeHtml(datos), bienes: datos.detalle.length, bajas: datos.bajas.length };
}

export async function generarInformePdf(e: EntradaValidadaDe<'informe:generar'>, ctx: ContextoIpc): Promise<{ ruta: string; bytes: number } | null> {
  const datos = datosDelInforme(ctx, e.entidadId, e.ejercicioId);
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
    entidadAfectada: 'ejercicio',
    registroId: e.ejercicioId,
    accion: 'EXPORTAR',
    campo: 'informe_valuacion',
    valorNuevo: `${basename(r.ruta)} · ${datos.detalle.length} bienes, ${datos.bajas.length} bajas propuestas, método ${datos.metodoConteo}`,
  });
  return r;
}

/** Solo para pruebas y para el archivo del expediente: mismo HTML, sin diálogo. */
export function rutaSugeridaInforme(carpeta: string, fechaCorte: string): string {
  return join(carpeta, `Informe_valuacion_${fechaCorte}.pdf`);
}
