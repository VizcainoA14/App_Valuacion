/** RN-01-02, RF-01-04 — convención de codificación y abreviaturas. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { AbreviaturaDto, ConvencionCodigoDto } from '../../../../compartido/dtos/configuracion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { componerCodigo, validarSegmentos } from '../../../../compartido/reglas/codigoInstitucional';
import { abreviaturaRepo, convencionRepo } from '../repositorio/convencion.repo';
import { exigirProceso } from './procesos';

export function obtenerConvencion(e: EntradaValidadaDe<'convencion:obtener'>, ctx: ContextoIpc): ConvencionCodigoDto {
  exigirProceso(ctx, e.procesoId);
  return convencionRepo.obtener(ctx.db, e.procesoId);
}

export function guardarConvencion(e: EntradaValidadaDe<'convencion:guardar'>, ctx: ContextoIpc): ConvencionCodigoDto {
  exigirProceso(ctx, e.procesoId);
  const problema = validarSegmentos(e.segmentos);
  if (problema !== null) throw new ErrorValidacion('CONVENCION_INVALIDA', problema, { campo: 'segmentos' });
  const anterior = convencionRepo.obtener(ctx.db, e.procesoId);
  const guardada = convencionRepo.guardar(ctx.db, e.procesoId, e.segmentos, e.longitudConsecutivo, ctx.ahoraIso());
  ctx.bitacora.registrar({
    entidadAfectada: 'convencion_codigo',
    registroId: e.procesoId,
    accion: anterior.definida ? 'ACTUALIZAR' : 'CREAR',
    campo: 'segmentos',
    valorAnterior: anterior.definida ? JSON.stringify(anterior.segmentos) : null,
    valorNuevo: JSON.stringify(guardada.segmentos),
  });
  return guardada;
}

export function previsualizarCodigo(e: EntradaValidadaDe<'convencion:previsualizar'>): { codigo: string } {
  const problema = validarSegmentos(e.segmentos);
  if (problema !== null) throw new ErrorValidacion('CONVENCION_INVALIDA', problema, { campo: 'segmentos' });
  return { codigo: componerCodigo(e.segmentos, e.longitudConsecutivo, e.ejemplo) };
}

export function listarAbreviaturas(e: EntradaValidadaDe<'abreviatura:listar'>, ctx: ContextoIpc): AbreviaturaDto[] {
  return abreviaturaRepo.listar(ctx.db, e.procesoId);
}

export function guardarAbreviaturas(e: EntradaValidadaDe<'abreviatura:guardar'>, ctx: ContextoIpc): AbreviaturaDto[] {
  exigirProceso(ctx, e.procesoId);
  const vistas = new Set<string>();
  for (const a of e.abreviaturas) {
    const clave = a.abreviatura.toUpperCase();
    if (vistas.has(clave)) throw new ErrorValidacion('ABREVIATURA_DUPLICADA', `La abreviatura ${clave} está repetida.`, { campo: 'abreviaturas' });
    vistas.add(clave);
  }
  const resultado = abreviaturaRepo.reemplazar(ctx.db, e.procesoId, e.abreviaturas);
  ctx.bitacora.registrar({ entidadAfectada: 'abreviatura_tipo', registroId: e.procesoId, accion: 'ACTUALIZAR', valorNuevo: `${resultado.length} abreviaturas` });
  return resultado;
}
