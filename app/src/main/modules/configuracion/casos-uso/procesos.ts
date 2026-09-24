/**
 * ADR-029 — el proceso de valuación: se inicia, se trabaja, se finaliza.
 *
 * Cada proceso es independiente: trae sus propios datos del hospital, su
 * catálogo, sus parámetros, su inventario, su cálculo y sus bajas. Mientras está
 * en curso se puede corregir todo, e incluso eliminarlo; finalizado queda de
 * solo lectura, y eso lo garantizan los disparadores, no esta capa.
 */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ProcesoDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { procesoRepo } from '../repositorio/proceso.repo';
import { claseRepo, aniosAX10k } from '../repositorio/clase.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { abreviaturaRepo } from '../repositorio/convencion.repo';
import { CLASES_SUGERIDAS, ABREVIATURAS_SUGERIDAS, PARAMETROS_SEMILLA } from '../semillas';

const TABLA = 'proceso';

export function listarProcesos(_e: EntradaValidadaDe<'proceso:listar'>, ctx: ContextoIpc): ProcesoDto[] {
  return procesoRepo.listar(ctx.db);
}

export function procesoPorId(e: EntradaValidadaDe<'proceso:porId'>, ctx: ContextoIpc): ProcesoDto | null {
  return procesoRepo.porId(ctx.db, e.id);
}

export function exigirProceso(ctx: ContextoIpc, id: string): ProcesoDto {
  const p = procesoRepo.porId(ctx.db, id);
  if (p === null) throw new ErrorValidacion('PROCESO_INEXISTENTE', 'El proceso no existe.', { campo: 'procesoId' });
  return p;
}

/** Lo que cambia un proceso exige que siga en curso; el mensaje lo dice antes de que lo diga la base. */
export function exigirEnCurso(ctx: ContextoIpc, id: string): ProcesoDto {
  const p = exigirProceso(ctx, id);
  if (p.estado === 'FINALIZADO') {
    throw new ErrorReglaNegocio('PROCESO_FINALIZADO', `El proceso «${p.nombre}» está finalizado y es de solo lectura. Para valorar otra vez, inicie un proceso nuevo.`);
  }
  return p;
}

function hoyIso(ctx: ContextoIpc): string {
  return ctx.ahoraIso().slice(0, 10);
}

function exigirFechaNoFutura(ctx: ContextoIpc, fecha: string): void {
  if (fecha > hoyIso(ctx)) {
    throw new ErrorReglaNegocio('FECHA_CORTE_FUTURA', `La fecha de corte no puede ser futura (hoy es ${hoyIso(ctx)}).`, { campo: 'fechaCorte' });
  }
}

/** Precarga el catálogo sugerido saltando los códigos que ya existen (RF-01-03). */
export function precargarClasesSugeridas(ctx: ContextoIpc, procesoId: string): { creadas: number; omitidas: number } {
  const ahora = ctx.ahoraIso();
  let creadas = 0;
  let omitidas = 0;
  for (const c of CLASES_SUGERIDAS) {
    if (claseRepo.porCodigo(ctx.db, procesoId, c.codigo) !== null) {
      omitidas += 1;
      continue;
    }
    claseRepo.insertar(ctx.db, {
      id: nuevoId(),
      procesoId,
      codigo: c.codigo,
      nombre: c.nombre,
      subcuentaContable: c.subcuentaContable,
      vidaUtilContableMeses: c.vidaUtilContableMeses,
      vidaUtilTecnicaAnios: aniosAX10k(c.vidaUtilTecnicaAnios),
      esDepreciable: c.esDepreciable,
      requiereHojaVida: c.requiereHojaVida,
      requiereInvima: c.requiereInvima,
      responsableTecnico: c.responsableTecnico,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    creadas += 1;
  }
  return { creadas, omitidas };
}

export function crearProceso(e: EntradaValidadaDe<'proceso:crear'>, ctx: ContextoIpc): ProcesoDto {
  exigirFechaNoFutura(ctx, e.fechaCorte);
  const ahora = ctx.ahoraIso();
  const { precargarSemillas, ...campos } = e;
  const creado = procesoRepo.insertar(ctx.db, { id: nuevoId(), ...campos, esDemostracion: false, creadoEn: ahora, actualizadoEn: ahora });

  if (precargarSemillas) {
    precargarClasesSugeridas(ctx, creado.id);
    abreviaturaRepo.reemplazar(ctx.db, creado.id, ABREVIATURAS_SUGERIDAS);
    parametroRepo.guardar(ctx.db, creado.id, PARAMETROS_SEMILLA, ahora);
  }

  ctx.bitacora.registrar({ entidadAfectada: TABLA, registroId: creado.id, accion: 'CREAR', valorNuevo: `${creado.nombre} · ${creado.razonSocial} (NIT ${creado.nit}) · corte ${creado.fechaCorte}` });
  return creado;
}

export function actualizarProceso(e: EntradaValidadaDe<'proceso:actualizar'>, ctx: ContextoIpc): ProcesoDto {
  const actual = exigirEnCurso(ctx, e.id);
  const presentes = Object.fromEntries(Object.entries(e.cambios).filter(([, v]) => v !== undefined));
  if (typeof presentes['fechaCorte'] === 'string') exigirFechaNoFutura(ctx, presentes['fechaCorte']);

  const actualizado = procesoRepo.actualizar(ctx.db, e.id, presentes, ctx.ahoraIso());
  // Cambiar la fecha de un proceso en curso no reescribe nada calculado (el
  // cálculo se descarta abajo), así que no se trata como el campo sensible
  // `fecha_corte` de ANEXO_B §7.1: queda en bitácora, sin exigir justificación.
  ctx.bitacora.registrarCambios(
    { entidadAfectada: TABLA, registroId: e.id, justificacion: e.justificacion },
    actual as unknown as Record<string, unknown>,
    Object.fromEntries(Object.keys(presentes).map((k) => [k, (actualizado as unknown as Record<string, unknown>)[k]])),
  );

  // Un cálculo a otra fecha ya no es el de este proceso: se descarta, y la
  // pantalla pide volver a calcular. No se deja una cifra que ya nadie sostiene.
  if (actualizado.fechaCorte !== actual.fechaCorte) {
    ctx.sqlite.prepare('DELETE FROM corte WHERE proceso_id = ?').run(e.id);
  }
  return actualizado;
}

/**
 * Lo que cuelga de los bienes, en orden de borrado: sus FK son RESTRICT. Lo
 * demás cae en cascada con el proceso.
 */
const TABLAS_POR_BIEN = ['baja', 'calculo_exclusion', 'calculo_depreciacion', 'calculo_obsolescencia', 'soporte_documental', 'mantenimiento', 'hoja_vida'] as const;

/**
 * Borra un proceso con todo lo suyo. Solo lo llaman los casos de uso que ya
 * comprobaron que se puede: uno en curso, o el de demostración. La bitácora del
 * proceso se conserva salvo que se pida lo contrario (la de la demostración no
 * es evidencia de nada).
 */
export function borrarProcesoCompleto(ctx: ContextoIpc, procesoId: string, opciones: { conBitacora: boolean }): Record<string, number> {
  const { sqlite } = ctx;
  const eliminados: Record<string, number> = {};
  const contar = (tabla: string, n: number): void => {
    if (n > 0) eliminados[tabla] = (eliminados[tabla] ?? 0) + n;
  };
  if (opciones.conBitacora) {
    contar(
      'bitacora',
      sqlite
        .prepare(
          `DELETE FROM bitacora WHERE registro_id = ?
              OR registro_id IN (SELECT id FROM bien WHERE proceso_id = ?)
              OR registro_id IN (SELECT id FROM corte WHERE proceso_id = ?)
              OR registro_id IN (SELECT b.id FROM baja b JOIN bien x ON x.id = b.bien_id WHERE x.proceso_id = ?)`,
        )
        .run(procesoId, procesoId, procesoId, procesoId).changes,
    );
  }
  for (const tabla of TABLAS_POR_BIEN) {
    contar(tabla, sqlite.prepare(`DELETE FROM ${tabla} WHERE bien_id IN (SELECT id FROM bien WHERE proceso_id = ?)`).run(procesoId).changes);
  }
  contar('corte', sqlite.prepare('DELETE FROM corte WHERE proceso_id = ?').run(procesoId).changes);
  contar('bien', sqlite.prepare('DELETE FROM bien WHERE proceso_id = ?').run(procesoId).changes);
  contar('barrido', sqlite.prepare('DELETE FROM barrido WHERE proceso_id = ?').run(procesoId).changes);
  for (const tabla of ['abreviatura_tipo', 'convencion_codigo', 'parametro_calculo', 'clase_activo'] as const) {
    contar(tabla, sqlite.prepare(`DELETE FROM ${tabla} WHERE proceso_id = ?`).run(procesoId).changes);
  }
  contar('servicio', sqlite.prepare('DELETE FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE proceso_id = ?)').run(procesoId).changes);
  contar('sede', sqlite.prepare('DELETE FROM sede WHERE proceso_id = ?').run(procesoId).changes);
  contar('proceso', sqlite.prepare('DELETE FROM proceso WHERE id = ?').run(procesoId).changes);
  return eliminados;
}

/**
 * Eliminar un proceso **en curso** que se inició por error: mientras no tenga
 * inventario. Un bien nunca se elimina físicamente (RN-09-09, INT-03, que la
 * base garantiza), así que en cuanto entra el primer barrido el proceso ya no
 * se borra. Uno finalizado tampoco: es evidencia de lo que se calculó.
 */
export function eliminarProceso(e: EntradaValidadaDe<'proceso:eliminar'>, ctx: ContextoIpc): { nombre: string } {
  const p = exigirProceso(ctx, e.id);
  if (p.esDemostracion) {
    throw new ErrorReglaNegocio('ES_DEMOSTRACION', 'El proceso de demostración se borra con su propio botón, en la banda amarilla.');
  }
  if (p.estado === 'FINALIZADO') {
    throw new ErrorReglaNegocio('PROCESO_FINALIZADO', `No se puede eliminar: el proceso «${p.nombre}» está finalizado, y lo que calculó es evidencia que no se borra.`);
  }
  const { n } = ctx.sqlite.prepare('SELECT COUNT(*) AS n FROM bien WHERE proceso_id = ?').get(e.id) as { n: number };
  if (n > 0) {
    throw new ErrorReglaNegocio(
      'PROCESO_CON_INVENTARIO',
      `No se puede eliminar: el proceso ya tiene ${n} bienes en su inventario, y un bien nunca se elimina (RN-09-09). Si se cargaron por error, corríjalos con un barrido nuevo o déjelo sin finalizar e inicie otro proceso.`,
    );
  }
  // La bitácora NO se borra: que un proceso se eliminó también es historia.
  ctx.bitacora.registrar({ entidadAfectada: TABLA, registroId: e.id, accion: 'ELIMINAR', valorAnterior: `${p.nombre} · ${p.razonSocial} (NIT ${p.nit})`, justificacion: e.justificacion });
  borrarProcesoCompleto(ctx, e.id, { conBitacora: false });
  return { nombre: p.nombre };
}

/**
 * Finalizar: el proceso queda de solo lectura. Exige que esté calculado, porque
 * finalizar un proceso sin cifras no deja nada que consultar.
 */
export function finalizarProceso(e: EntradaValidadaDe<'proceso:finalizar'>, ctx: ContextoIpc): ProcesoDto {
  exigirEnCurso(ctx, e.id);
  const corte = ctx.sqlite.prepare('SELECT id FROM corte WHERE proceso_id = ?').get(e.id) as { id: string } | undefined;
  if (corte === undefined) {
    throw new ErrorReglaNegocio('PROCESO_SIN_CALCULO', 'Antes de finalizar hay que calcular: un proceso finalizado sin cifras no deja nada que consultar.');
  }
  const ahora = ctx.ahoraIso();
  const finalizado = procesoRepo.actualizar(ctx.db, e.id, { estado: 'FINALIZADO', finalizadoEn: ahora }, ahora);
  ctx.bitacora.registrar({ entidadAfectada: TABLA, registroId: e.id, accion: 'CERRAR', valorAnterior: 'EN_CURSO', valorNuevo: 'FINALIZADO' });
  return finalizado;
}
