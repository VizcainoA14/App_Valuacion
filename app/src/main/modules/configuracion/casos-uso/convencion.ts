/** RN-01-02, RF-01-04 — convención de codificación y abreviaturas. */
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { AbreviaturaDto, ConvencionCodigoDto } from '../../../../compartido/dtos/configuracion';
import { ErrorValidacion } from '../../../../compartido/errores';
import { componerCodigo, validarSegmentos } from '../../../../compartido/reglas/codigoInstitucional';
import { abreviaturaRepo, convencionRepo } from '../repositorio/convencion.repo';
import { exigirEntidad } from './entidades';

export function obtenerConvencion(e: EntradaValidadaDe<'convencion:obtener'>, ctx: ContextoIpc): ConvencionCodigoDto {
  exigirEntidad(ctx, e.entidadId);
  return convencionRepo.obtener(ctx.db, e.entidadId);
}

export function guardarConvencion(e: EntradaValidadaDe<'convencion:guardar'>, ctx: ContextoIpc): ConvencionCodigoDto {
  exigirEntidad(ctx, e.entidadId);
  const problema = validarSegmentos(e.segmentos);
  if (problema !== null) throw new ErrorValidacion('CONVENCION_INVALIDA', problema, { campo: 'segmentos' });
  const anterior = convencionRepo.obtener(ctx.db, e.entidadId);
  const guardada = convencionRepo.guardar(ctx.db, e.entidadId, e.segmentos, e.longitudConsecutivo, ctx.ahoraIso());
  ctx.bitacora.registrar({
    entidadAfectada: 'convencion_codigo',
    registroId: e.entidadId,
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
  return abreviaturaRepo.listar(ctx.db, e.entidadId);
}

export function guardarAbreviaturas(e: EntradaValidadaDe<'abreviatura:guardar'>, ctx: ContextoIpc): AbreviaturaDto[] {
  exigirEntidad(ctx, e.entidadId);
  const vistas = new Set<string>();
  for (const a of e.abreviaturas) {
    const clave = a.abreviatura.toUpperCase();
    if (vistas.has(clave)) throw new ErrorValidacion('ABREVIATURA_DUPLICADA', `La abreviatura ${clave} está repetida.`, { campo: 'abreviaturas' });
    vistas.add(clave);
  }
  const resultado = abreviaturaRepo.reemplazar(ctx.db, e.entidadId, e.abreviaturas);
  ctx.bitacora.registrar({ entidadAfectada: 'abreviatura_tipo', registroId: e.entidadId, accion: 'ACTUALIZAR', valorNuevo: `${resultado.length} abreviaturas` });
  return resultado;
}
