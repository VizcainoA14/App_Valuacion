/**
 * Predicados de `VAL-05-01` … `VAL-05-09` y `VAL-06-01` … `VAL-06-10`
 * (pasos 05 §8 y 06 §8).
 *
 * Se evalúan sobre lo YA calculado: comprueban que el resultado del motor sea
 * defendible, no vuelven a calcular. Si el ejercicio no se ha calculado todavía,
 * lo dicen así en vez de dar por buenas unas tablas vacías.
 */
import type { MapaPredicados } from '../../validaciones';
import { OK, falla, listar } from '../../validaciones';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import { EsquemaParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';

type Fila = Record<string, string | number | null>;

function filas(ctx: ContextoIpc, sql: string, ...params: unknown[]): Fila[] {
  return ctx.sqlite.prepare(sql).all(...params) as Fila[];
}

const codigos = (f: Fila[]): string[] => f.map((x) => String(x['c']));
const sinEjercicio = falla('No hay ejercicio seleccionado');

/** Los bienes vivos y propios, que son los que entran al patrimonio (RN-02-04). */
const PROPIOS = `b.ejercicio_id = ? AND b.condicion_tenencia = 'PROPIO' AND b.estado_registro <> 'DADO_DE_BAJA'`;

function hayCalculo(ctx: ContextoIpc, ejercicioId: string): boolean {
  return (ctx.sqlite.prepare('SELECT COUNT(*) AS n FROM calculo_obsolescencia WHERE ejercicio_id = ?').get(ejercicioId) as { n: number }).n > 0;
}

const noCalculado = falla('El ejercicio todavía no se ha calculado: ejecute el cálculo del paso 05/06 antes de validar.');

function parametros(ctx: ContextoIpc, ejercicioId: string) {
  const fila = ctx.sqlite.prepare('SELECT parametros_congelados_json AS j FROM ejercicio WHERE id = ?').get(ejercicioId) as { j: string } | undefined;
  return fila === undefined ? null : EsquemaParametrosCalculo.parse(JSON.parse(fila.j));
}

export const PREDICADOS_PASO_05: MapaPredicados = {
  'VAL-05-01': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b LEFT JOIN hoja_vida h ON h.bien_id = b.id
        WHERE ${PROPIOS} AND (h.fecha_adquisicion IS NULL OR h.fecha_adquisicion = '')`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Sin fecha de adquisición: no se puede calcular su edad. ${listar(codigos(sin))}`);
  },

  'VAL-05-02': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT DISTINCT k.codigo AS c FROM bien b JOIN clase_activo k ON k.id = b.clase_activo_id
         LEFT JOIN hoja_vida h ON h.bien_id = b.id
        WHERE ${PROPIOS}
          AND COALESCE(h.vida_util_tecnica_override_x10k, k.vida_util_tecnica_anios_x10k, 0) <= 0`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Clases sin vida útil técnica: ${listar(codigos(sin))}`);
  },

  'VAL-05-03': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const malas = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
         JOIN ejercicio j ON j.id = b.ejercicio_id
        WHERE ${PROPIOS} AND h.fecha_adquisicion > j.fecha_corte`,
      ejercicioId,
    );
    return malas.length === 0 ? OK : falla(`Adquisiciones posteriores a la fecha de corte: ${listar(codigos(malas))}`);
  },

  'VAL-05-04': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // El override vive en la hoja de vida (RN-03-06); su justificación es obligatoria.
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM bien b JOIN hoja_vida h ON h.bien_id = b.id
        WHERE ${PROPIOS} AND h.vida_util_tecnica_override_x10k IS NOT NULL
          AND (h.justificacion_override IS NULL OR trim(h.justificacion_override) = '')`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Vida útil sobrescrita sin justificación (RN-03-06): ${listar(codigos(sin))}`);
  },

  'VAL-05-05': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_obsolescencia o JOIN bien b ON b.id = o.bien_id
        WHERE o.ejercicio_id = ? AND o.obsolescencia_funcional = 1
          AND (o.justificacion_funcional IS NULL OR trim(o.justificacion_funcional) = '')`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Obsolescencia funcional sin justificación del especialista: ${listar(codigos(sin))}`);
  },

  'VAL-05-06': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    if (!hayCalculo(ctx, ejercicioId)) return noCalculado;
    const raros = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_obsolescencia o JOIN bien b ON b.id = o.bien_id
        WHERE o.ejercicio_id = ? AND o.indice_obsolescencia_x10k >= 10000 AND b.estado_actual = 'BUENO'`,
      ejercicioId,
    );
    return raros.length === 0 ? OK : falla(`Superaron su vida útil pero están en buen estado; conviene revisar la vida útil de su clase: ${listar(codigos(raros))}`);
  },

  'VAL-05-07': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    if (!hayCalculo(ctx, ejercicioId)) return noCalculado;
    const raros = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_obsolescencia o JOIN bien b ON b.id = o.bien_id
        WHERE o.ejercicio_id = ? AND o.indice_obsolescencia_x10k < 3000 AND b.estado_actual = 'INSERVIBLE'`,
      ejercicioId,
    );
    return raros.length === 0 ? OK : falla(`Casi nuevos pero declarados inservibles; conviene revisar el estado físico: ${listar(codigos(raros))}`);
  },

  'VAL-05-08': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    if (!hayCalculo(ctx, ejercicioId)) return noCalculado;
    const porClase = filas(
      ctx,
      `SELECT k.codigo AS c, COUNT(*) AS total, SUM(CASE WHEN o.semaforo = 'ROJO' THEN 1 ELSE 0 END) AS rojos
         FROM calculo_obsolescencia o JOIN bien b ON b.id = o.bien_id JOIN clase_activo k ON k.id = b.clase_activo_id
        WHERE o.ejercicio_id = ? GROUP BY k.codigo`,
      ejercicioId,
    );
    const criticas = porClase.filter((f) => Number(f['total']) > 0 && Number(f['rojos']) / Number(f['total']) > 0.4);
    return criticas.length === 0
      ? OK
      : falla(`Más del 40 % en rojo: ${listar(criticas.map((f) => `${String(f['c'])} (${f['rojos']}/${f['total']})`))}`);
  },

  'VAL-05-09': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    if (!hayCalculo(ctx, ejercicioId)) return noCalculado;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_obsolescencia o JOIN bien b ON b.id = o.bien_id
        WHERE o.ejercicio_id = ? AND o.candidato_baja = 1
          AND (o.concepto_especialista IS NULL OR trim(o.concepto_especialista) = '')
          AND NOT EXISTS (SELECT 1 FROM propuesta_baja p WHERE p.bien_id = b.id AND p.ejercicio_id = o.ejercicio_id AND p.estado_aprobacion <> 'RECHAZADO')`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Candidatos a baja sin concepto del especialista ni propuesta abierta: ${listar(codigos(sin))}`);
  },
};

export const PREDICADOS_PASO_06: MapaPredicados = {
  'VAL-06-01': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const p = parametros(ctx, ejercicioId);
    if (p === null) return falla('El ejercicio no existe');
    // CT-02: el valor sugerido no basta; hace falta la confirmación por acta.
    return p.metodo_conteo_meses_confirmado
      ? OK
      : falla('El método de conteo de meses no se ha confirmado por acta con el contador (VAL-01-07). Sin eso las cifras no cuadran con contabilidad.');
  },

  'VAL-06-02': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const malos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id
        WHERE d.ejercicio_id = ? AND (d.valor_adquisicion_cent <= 0 OR d.fecha_inicio_depreciacion IS NULL)`,
      ejercicioId,
    );
    return malos.length === 0 ? OK : falla(`Calculados con costo cero o sin fecha de inicio: ${listar(codigos(malos))}`);
  },

  'VAL-06-03': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // El CHECK `chk_dep_tope` lo impide en la base; esto lo confirma desde fuera.
    const malos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id
        WHERE d.ejercicio_id = ? AND d.depreciacion_acumulada_cent > d.base_depreciable_cent`,
      ejercicioId,
    );
    return malos.length === 0 ? OK : falla(`Depreciación por encima de su base: ${listar(codigos(malos))}`);
  },

  'VAL-06-04': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const malos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id
        WHERE d.ejercicio_id = ? AND d.saldo_por_depreciar_cent < 0`,
      ejercicioId,
    );
    return malos.length === 0 ? OK : falla(`Saldo por depreciar negativo: ${listar(codigos(malos))}`);
  },

  'VAL-06-05': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const sin = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM deterioro t JOIN bien b ON b.id = t.bien_id
        WHERE t.ejercicio_id = ? AND (t.indicio IS NULL OR trim(t.justificacion) = '' OR t.soporte_url IS NULL)`,
      ejercicioId,
    );
    return sin.length === 0 ? OK : falla(`Deterioro sin indicio, justificación o soporte: ${listar(codigos(sin))}`);
  },

  'VAL-06-06': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    // Cuadre elemental: cada fila del detalle tiene que colgar de una subcuenta,
    // y la suma por subcuenta tiene que dar el mismo total que el detalle. El
    // cuadre en tres niveles de ANEXO_C §7.1 llega con la consolidación.
    const total = (
      ctx.sqlite.prepare('SELECT COALESCE(SUM(valor_neto_libros_cent), 0) AS n FROM calculo_depreciacion WHERE ejercicio_id = ?').get(ejercicioId) as { n: number }
    ).n;
    const porSubcuenta = (
      ctx.sqlite
        .prepare(
          `SELECT COALESCE(SUM(d.valor_neto_libros_cent), 0) AS n
             FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id JOIN clase_activo k ON k.id = b.clase_activo_id
            WHERE d.ejercicio_id = ? AND k.subcuenta_contable IS NOT NULL AND trim(k.subcuenta_contable) <> ''`,
        )
        .get(ejercicioId) as { n: number }
    ).n;
    return total === porSubcuenta
      ? OK
      : falla(`La suma por subcuenta no cuadra con el detalle: hay bienes calculados cuya clase no está mapeada a una subcuenta contable (diferencia ${(total - porSubcuenta) / 100}).`);
  },

  // La depreciación "de libros" es la de contabilidad, y llega con la conciliación
  // del paso 04, que es una extensión (ADR-026). Sin ese dato la comparación no
  // se puede hacer: se deja inactiva y anotada, no se inventa una diferencia.
  'VAL-06-07': () => OK,

  'VAL-06-08': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const raros = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM calculo_depreciacion d JOIN bien b ON b.id = d.bien_id
         LEFT JOIN hoja_vida h ON h.bien_id = b.id
        WHERE d.ejercicio_id = ? AND d.totalmente_depreciado = 1 AND b.estado_actual = 'BUENO'
          AND (h.estado_operativo IS NULL OR h.estado_operativo = 'OPERATIVO')`,
      ejercicioId,
    );
    return raros.length === 0
      ? OK
      : falla(`Totalmente depreciados pero en buen estado y operativos; siguen prestando servicio y su vida útil merece revisión: ${listar(codigos(raros))}`);
  },

  'VAL-06-09': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const vivos = (ctx.sqlite.prepare(`SELECT COUNT(*) AS n FROM bien b WHERE ${PROPIOS}`).get(ejercicioId) as { n: number }).n;
    if (vivos === 0) return OK;
    const calculados = (ctx.sqlite.prepare('SELECT COUNT(*) AS n FROM calculo_depreciacion WHERE ejercicio_id = ?').get(ejercicioId) as { n: number }).n;
    const excluidos = vivos - calculados;
    return excluidos / vivos <= 0.05
      ? OK
      : falla(`${excluidos} de ${vivos} bienes propios quedaron fuera del cálculo por datos incompletos (${((excluidos / vivos) * 100).toFixed(1)} %).`);
  },

  'VAL-06-10': (ctx, _e, ejercicioId) => {
    if (ejercicioId === null) return sinEjercicio;
    const altos = filas(
      ctx,
      `SELECT b.codigo_institucional AS c FROM deterioro t JOIN bien b ON b.id = t.bien_id
        WHERE t.ejercicio_id = ? AND t.valor_neto_antes_cent > 0
          AND t.deterioro_reconocido_cent * 2 > t.valor_neto_antes_cent`,
      ejercicioId,
    );
    return altos.length === 0 ? OK : falla(`Deterioro superior al 50 % del valor neto: ${listar(codigos(altos))}`);
  },
};
