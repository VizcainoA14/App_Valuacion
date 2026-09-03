/** RN-01-04, RN-01-05, RF-01-08 — parámetros de cálculo con rastro en bitácora. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import { ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo, validarUmbrales, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { ejercicioRepo } from '../repositorio/ejercicio.repo';
import { exigirEntidad } from './entidades';

export function obtenerParametros(e: EntradaValidadaDe<'parametros:obtener'>, ctx: ContextoIpc): ParametrosCalculo {
  exigirEntidad(ctx, e.entidadId);
  return parametroRepo.obtener(ctx.db, e.entidadId);
}

export function actualizarParametros(e: EntradaValidadaDe<'parametros:actualizar'>, ctx: ContextoIpc): ParametrosCalculo {
  exigirEntidad(ctx, e.entidadId);
  const actual = parametroRepo.obtener(ctx.db, e.entidadId);
  const presentes = Object.fromEntries(Object.entries(e.cambios).filter(([, v]) => v !== undefined)) as Partial<ParametrosCalculo>;

  // Cambiar el método invalida la confirmación por acta salvo que se confirme en la misma operación (CT-02).
  if (presentes.metodo_conteo_meses !== undefined && presentes.metodo_conteo_meses !== actual.metodo_conteo_meses && presentes.metodo_conteo_meses_confirmado === undefined) {
    presentes.metodo_conteo_meses_confirmado = false;
  }

  const nuevo = EsquemaParametrosCalculo.parse({ ...actual, ...presentes });
  const problema = validarUmbrales(nuevo);
  if (problema !== null) throw new ErrorValidacion('UMBRALES_INCOHERENTES', problema, { campo: 'umbral_semaforo_verde' });

  const ahora = ctx.ahoraIso();
  parametroRepo.guardar(ctx.db, e.entidadId, nuevo, ahora);
  const cambiados = ctx.bitacora.registrarCambios(
    { entidadAfectada: 'parametro_calculo', registroId: e.entidadId, justificacion: e.justificacion },
    actual as unknown as Record<string, unknown>,
    Object.fromEntries(Object.keys(presentes).map((k) => [k, (nuevo as unknown as Record<string, unknown>)[k]])),
  );

  // RN-01-01: un ejercicio congela los parámetros al abrirse. Los que siguen en ABIERTO
  // (paso 01, sin cálculos) reciben el ajuste; los demás conservan su copia.
  if (cambiados > 0) {
    const json = JSON.stringify(nuevo);
    for (const ej of ejercicioRepo.listar(ctx.db, e.entidadId)) {
      if (ej.estado !== 'ABIERTO') continue;
      ejercicioRepo.actualizar(ctx.db, ej.id, { parametrosCongeladosJson: json });
      ctx.bitacora.registrar({ ejercicioId: ej.id, entidadAfectada: 'ejercicio', registroId: ej.id, accion: 'ACTUALIZAR', campo: 'parametros_congelados', valorNuevo: 'refrescados desde la entidad (ejercicio aún ABIERTO)', justificacion: e.justificacion ?? null });
    }
  }
  return nuevo;
}
