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
  // El proceso y su configuración (MOD-02, ADR-029)
  'proceso:listar',
  'proceso:porId',
  'proceso:crear',
  'proceso:actualizar',
  'proceso:finalizar',
  'proceso:eliminar',
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
  // Revisión de la configuración
  'validaciones:evaluar',
  // Inventario vivo y sus barridos (ADR-028)
  'bien:listar',
  'bien:porId',
  'bien:idsDelFiltro',
  'bien:cobertura',
  'bien:marcarObsolescenciaFuncional',
  'barrido:listar',
  // Plantillas que la aplicación entrega (ANEXO_A §6.1)
  'plantilla:listar',
  'plantilla:descargar',
  'plantilla:descargarPaquete',
  // Cálculo del proceso (ADR-029)
  'corte:actual',
  'corte:porId',
  'calculo:ejecutar',
  'calculo:resumen',
  'calculo:listar',
  'calculo:exclusiones',
  // Bajas: candidatos del motor y registro de lo que el hospital decidió
  'baja:candidatos',
  'baja:listar',
  'baja:registrar',
  'baja:anular',
  // Informe de valuación (TR-05)
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
