/**
 * Listas blancas estáticas de canales y eventos. Sin dependencias: el preload
 * corre con sandbox y solo puede cargar código propio, así que esta lista no
 * puede arrastrar Zod. `contrato.ts` se verifica contra ella con `satisfies`.
 * Cualquier canal nuevo entra aquí Y en el contrato, nunca inline.
 */
export const CANALES_PERMITIDOS = [
  'app:obtenerEstado',
  'app:registrarErrorRenderer',
  'tarea:cancelar',
  // TR-12 · responsables
  'responsable:listar',
  'responsable:crear',
  'responsable:actualizar',
  'responsable:desactivar',
  // Paso 01 · configuración (MOD-02)
  'entidad:listar',
  'entidad:porId',
  'entidad:crear',
  'entidad:actualizar',
  'entidad:clonarParametrizacion',
  'sede:listar',
  'sede:crear',
  'sede:actualizar',
  'servicio:listar',
  'servicio:crear',
  'servicio:actualizar',
  'clase:listar',
  'clase:crear',
  'clase:actualizar',
  'clase:precargarSugeridas',
  'parametros:obtener',
  'parametros:actualizar',
  'convencion:obtener',
  'convencion:guardar',
  'convencion:previsualizar',
  'abreviatura:listar',
  'abreviatura:guardar',
  'ejercicio:listar',
  'ejercicio:porId',
  'ejercicio:crear',
  'ejercicio:cambiarFechaCorte',
  // TR-01 · validaciones (un canal para los 11 pasos)
  'validaciones:evaluar',
  // Paso 02 · inventario (MOD-03)
  'bien:listar',
  'bien:porId',
  'bien:idsDelFiltro',
  'bien:cobertura',
  // TR-03 · plantillas que la aplicación entrega (ANEXO_A §6.1)
  'plantilla:listar',
  'plantilla:descargar',
  'plantilla:descargarPaquete',
  // Pasos 05 y 06 · motor de cálculo (MOD-07/08)
  'calculo:ejecutar',
  'calculo:resumen',
  'calculo:listar',
  'calculo:marcarObsolescenciaFuncional',
  // Paso 09 · bajas (MOD-11)
  'baja:candidatos',
  'baja:listar',
  'baja:resumen',
  'baja:proponer',
  'baja:actualizar',
  'baja:cambiarEstado',
  // Cierre del inventario: los validados pasan a activos
  'bien:activarValidados',
  // Etapa 6 · informe de valuación (TR-05)
  'informe:previsualizar',
  'informe:generar',
  // TR-02 · importación
  'importacion:previsualizar',
  'importacion:confirmar',
  // T-B-11 · hospital de demostración
  'demo:cargar',
  'demo:borrar',
] as const;
export type Canal = (typeof CANALES_PERMITIDOS)[number];

/** Eventos main → renderer (plan 2.3 §3 y §6). */
export const EVENTOS_PERMITIDOS = ['evento:progreso', 'evento:tareaFinalizada', 'evento:alerta'] as const;
export type Evento = (typeof EVENTOS_PERMITIDOS)[number];

export function esCanalPermitido(valor: string): valor is Canal {
  return (CANALES_PERMITIDOS as readonly string[]).includes(valor);
}

export function esEventoPermitido(valor: string): valor is Evento {
  return (EVENTOS_PERMITIDOS as readonly string[]).includes(valor);
}
