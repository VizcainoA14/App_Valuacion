/** RF-01-01, RF-01-03, RF-01-09 — entidad, semillas y clonación. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { EntidadDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { entidadRepo } from '../repositorio/entidad.repo';
import { claseRepo, aniosAX10k } from '../repositorio/clase.repo';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { abreviaturaRepo, convencionRepo } from '../repositorio/convencion.repo';
import { CLASES_SUGERIDAS, ABREVIATURAS_SUGERIDAS, PARAMETROS_SEMILLA } from '../semillas';

const TABLA = 'entidad';

export function listarEntidades(_e: EntradaValidadaDe<'entidad:listar'>, ctx: ContextoIpc): EntidadDto[] {
  return entidadRepo.listar(ctx.db);
}

export function entidadPorId(e: EntradaValidadaDe<'entidad:porId'>, ctx: ContextoIpc): EntidadDto | null {
  return entidadRepo.porId(ctx.db, e.id);
}

export function exigirEntidad(ctx: ContextoIpc, id: string): EntidadDto {
  const entidad = entidadRepo.porId(ctx.db, id);
  if (entidad === null) throw new ErrorValidacion('ENTIDAD_INEXISTENTE', 'La entidad no existe.', { campo: 'entidadId' });
  return entidad;
}

/** Precarga el catálogo sugerido saltando los códigos que ya existen (RF-01-03). */
export function precargarClasesSugeridas(ctx: ContextoIpc, entidadId: string): { creadas: number; omitidas: number } {
  const ahora = ctx.ahoraIso();
  let creadas = 0;
  let omitidas = 0;
  for (const c of CLASES_SUGERIDAS) {
    if (claseRepo.porCodigo(ctx.db, entidadId, c.codigo) !== null) {
      omitidas += 1;
      continue;
    }
    claseRepo.insertar(ctx.db, {
      id: nuevoId(),
      entidadId,
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

export function crearEntidad(e: EntradaValidadaDe<'entidad:crear'>, ctx: ContextoIpc): EntidadDto {
  if (entidadRepo.porNit(ctx.db, e.nit) !== null) {
    throw new ErrorReglaNegocio('NIT_DUPLICADO', `Ya existe una entidad con NIT ${e.nit}.`, { campo: 'nit' });
  }
  const ahora = ctx.ahoraIso();
  const { precargarSemillas, ...campos } = e;
  const creada = entidadRepo.insertar(ctx.db, { id: nuevoId(), ...campos, esDemostracion: false, creadoEn: ahora, actualizadoEn: ahora });

  if (precargarSemillas) {
    precargarClasesSugeridas(ctx, creada.id);
    abreviaturaRepo.reemplazar(ctx.db, creada.id, ABREVIATURAS_SUGERIDAS);
    parametroRepo.guardar(ctx.db, creada.id, PARAMETROS_SEMILLA, ahora);
  }

  ctx.bitacora.registrar({ entidadAfectada: TABLA, registroId: creada.id, accion: 'CREAR', valorNuevo: `${creada.razonSocial} (NIT ${creada.nit})` });
  return creada;
}

/**
 * RF-01-01 — Eliminar una entidad **antes de que empiece la valuación**.
 *
 * La frontera no es caprichosa: `ejercicio.entidad_id` es `restrict` y `INT-03`
 * impide borrar bienes de una entidad real. En cuanto hay un ejercicio hay
 * trabajo, bitácora y —si se cerró— evidencia contable firmada. Lo que se
 * resuelve aquí es el caso frecuente y legítimo: la entidad que se creó con el
 * NIT equivocado, la duplicada, la de una prueba que nunca se usó.
 *
 * Si ya hay ejercicio, el camino no es borrar sino **corregir**: los datos de la
 * entidad se editan con justificación, y todo queda en bitácora.
 */
export function eliminarEntidad(e: EntradaValidadaDe<'entidad:eliminar'>, ctx: ContextoIpc): { razonSocial: string } {
  const entidad = exigirEntidad(ctx, e.id);

  if (entidad.esDemostracion) {
    throw new ErrorReglaNegocio(
      'ES_DEMOSTRACION',
      'El hospital de demostración se borra con su propio botón, en la banda amarilla: ese sí arrastra bienes y ejercicios porque son datos ficticios.',
    );
  }

  const ejercicios = (ctx.sqlite.prepare('SELECT nombre, estado FROM ejercicio WHERE entidad_id = ? ORDER BY fecha_corte').all(e.id) as { nombre: string; estado: string }[]);
  if (ejercicios.length > 0) {
    const cerrados = ejercicios.filter((x) => x.estado === 'CERRADO').length;
    throw new ErrorReglaNegocio(
      'ENTIDAD_CON_EJERCICIOS',
      cerrados > 0
        ? `No se puede eliminar: la entidad tiene ${cerrados} ejercicio(s) CERRADO(S), que son evidencia contable inmutable (ADR-017).`
        : `No se puede eliminar: la valuación ya empezó (${ejercicios.length} ejercicio(s): ${ejercicios.map((x) => x.nombre).join(', ')}). Si los datos de la entidad están mal, corríjalos desde su pantalla; todo cambio queda en bitácora.`,
    );
  }

  // La bitácora NO se borra: que una entidad se eliminó también es historia. Se
  // deja el registro ANTES, porque después el responsable ya no existirá.
  ctx.bitacora.registrar({
    entidadAfectada: TABLA,
    registroId: e.id,
    accion: 'ELIMINAR',
    valorAnterior: `${entidad.razonSocial} (NIT ${entidad.nit})`,
    justificacion: e.justificacion,
  });

  // El resto del catálogo cuelga de la entidad con `cascade`: sedes y sus
  // servicios, clases, parámetros, abreviaturas, convención y responsables.
  const borradas = ctx.sqlite.prepare('DELETE FROM entidad WHERE id = ?').run(e.id).changes;
  if (borradas === 0) throw new ErrorReglaNegocio('ENTIDAD_NO_ELIMINADA', 'La entidad no se pudo eliminar.');

  return { razonSocial: entidad.razonSocial };
}

export function actualizarEntidad(e: EntradaValidadaDe<'entidad:actualizar'>, ctx: ContextoIpc): EntidadDto {
  const actual = exigirEntidad(ctx, e.id);
  const presentes = Object.fromEntries(Object.entries(e.cambios).filter(([, v]) => v !== undefined));
  if (typeof presentes['nit'] === 'string' && presentes['nit'] !== actual.nit && entidadRepo.porNit(ctx.db, presentes['nit']) !== null) {
    throw new ErrorReglaNegocio('NIT_DUPLICADO', 'Otra entidad ya tiene ese NIT.', { campo: 'nit' });
  }
  const actualizada = entidadRepo.actualizar(ctx.db, e.id, presentes, ctx.ahoraIso());
  ctx.bitacora.registrarCambios(
    { entidadAfectada: TABLA, registroId: e.id, justificacion: e.justificacion },
    actual as unknown as Record<string, unknown>,
    Object.fromEntries(Object.keys(presentes).map((k) => [k, (actualizada as unknown as Record<string, unknown>)[k]])),
  );
  return actualizada;
}

/** RF-01-09: copia la parametrización de una entidad a otra sin tocar lo que ya exista en el destino. */
export function clonarParametrizacion(
  e: EntradaValidadaDe<'entidad:clonarParametrizacion'>,
  ctx: ContextoIpc,
): { clases: number; sedes: number; servicios: number; parametros: number; abreviaturas: number } {
  if (e.origenId === e.destinoId) throw new ErrorValidacion('CLONACION_MISMA_ENTIDAD', 'Origen y destino son la misma entidad.');
  const origen = exigirEntidad(ctx, e.origenId);
  exigirEntidad(ctx, e.destinoId);
  const ahora = ctx.ahoraIso();
  const resumen = { clases: 0, sedes: 0, servicios: 0, parametros: 0, abreviaturas: 0 };

  if (e.incluir.clases) {
    for (const c of claseRepo.listar(ctx.db, e.origenId, true)) {
      if (claseRepo.porCodigo(ctx.db, e.destinoId, c.codigo) !== null) continue;
      claseRepo.insertar(ctx.db, {
        id: nuevoId(),
        entidadId: e.destinoId,
        codigo: c.codigo,
        nombre: c.nombre,
        subcuentaContable: c.subcuentaContable,
        vidaUtilContableMeses: c.vidaUtilContableMeses,
        vidaUtilTecnicaAnios: aniosAX10k(c.vidaUtilTecnicaAnios),
        esDepreciable: c.esDepreciable,
        requiereHojaVida: c.requiereHojaVida,
        requiereInvima: c.requiereInvima,
        responsableTecnico: c.responsableTecnico,
        activo: c.activo,
        creadoEn: ahora,
        actualizadoEn: ahora,
      });
      resumen.clases += 1;
    }
  }

  if (e.incluir.sedesYServicios) {
    for (const s of sedeRepo.listar(ctx.db, e.origenId, true)) {
      let destino = sedeRepo.porCodigo(ctx.db, e.destinoId, s.codigo);
      if (destino === null) {
        destino = sedeRepo.insertar(ctx.db, { id: nuevoId(), entidadId: e.destinoId, codigo: s.codigo, nombre: s.nombre, direccion: s.direccion, municipio: s.municipio, activa: s.activa, creadoEn: ahora, actualizadoEn: ahora });
        resumen.sedes += 1;
      }
      for (const sv of servicioRepo.listarPorEntidad(ctx.db, e.origenId, true).filter((x) => x.sedeId === s.id)) {
        if (servicioRepo.porCodigo(ctx.db, destino.id, sv.codigo) !== null) continue;
        servicioRepo.insertar(ctx.db, { id: nuevoId(), sedeId: destino.id, codigo: sv.codigo, nombre: sv.nombre, tipo: sv.tipo, responsable: sv.responsable, activo: sv.activo, creadoEn: ahora, actualizadoEn: ahora });
        resumen.servicios += 1;
      }
    }
  }

  if (e.incluir.parametros) {
    const p = parametroRepo.obtener(ctx.db, e.origenId);
    // El método de conteo se confirma por acta EN CADA entidad (CT-02): la confirmación no se hereda.
    parametroRepo.guardar(ctx.db, e.destinoId, { ...p, metodo_conteo_meses_confirmado: false }, ahora);
    resumen.parametros = parametroRepo.claves().length;
  }

  if (e.incluir.convencion) {
    const c = convencionRepo.obtener(ctx.db, e.origenId);
    if (c.definida) convencionRepo.guardar(ctx.db, e.destinoId, c.segmentos, c.longitudConsecutivo, ahora);
    resumen.abreviaturas = abreviaturaRepo.reemplazar(ctx.db, e.destinoId, abreviaturaRepo.listar(ctx.db, e.origenId)).length;
  }

  ctx.bitacora.registrar({
    entidadAfectada: TABLA,
    registroId: e.destinoId,
    accion: 'IMPORTAR',
    valorNuevo: `Parametrización clonada desde ${origen.razonSocial} (NIT ${origen.nit}): ${JSON.stringify(resumen)}`,
  });
  return resumen;
}
