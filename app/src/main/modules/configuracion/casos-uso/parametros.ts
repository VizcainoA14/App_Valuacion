/** RN-01-04, RN-01-05, RF-01-08 — parámetros de cálculo con rastro en bitácora. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import { ErrorValidacion } from '../../../../compartido/errores';
import { EsquemaParametrosCalculo, validarUmbrales, type ParametrosCalculo } from '../../../../compartido/parametros/parametrosCalculo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { exigirProceso } from './procesos';

export function obtenerParametros(e: EntradaValidadaDe<'parametros:obtener'>, ctx: ContextoIpc): ParametrosCalculo {
  exigirProceso(ctx, e.procesoId);
  return parametroRepo.obtener(ctx.db, e.procesoId);
}

export function actualizarParametros(e: EntradaValidadaDe<'parametros:actualizar'>, ctx: ContextoIpc): ParametrosCalculo {
  exigirProceso(ctx, e.procesoId);
  const actual = parametroRepo.obtener(ctx.db, e.procesoId);
  const presentes = Object.fromEntries(Object.entries(e.cambios).filter(([, v]) => v !== undefined)) as Partial<ParametrosCalculo>;

  const nuevo = EsquemaParametrosCalculo.parse({ ...actual, ...presentes });
  const problema = validarUmbrales(nuevo);
  if (problema !== null) throw new ErrorValidacion('UMBRALES_INCOHERENTES', problema, { campo: 'umbral_semaforo_verde' });

  const ahora = ctx.ahoraIso();
  parametroRepo.guardar(ctx.db, e.procesoId, nuevo, ahora);
  // Cada corte guarda su propia copia de los parámetros (RN-01-01): cambiarlos
  // aquí vale para los cálculos que vengan, nunca reescribe los ya hechos.
  ctx.bitacora.registrarCambios(
    { entidadAfectada: 'parametro_calculo', registroId: e.procesoId, justificacion: e.justificacion },
    actual as unknown as Record<string, unknown>,
    Object.fromEntries(Object.keys(presentes).map((k) => [k, (nuevo as unknown as Record<string, unknown>)[k]])),
  );

  return nuevo;
}
