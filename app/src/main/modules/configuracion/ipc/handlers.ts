import type { RegistroIpc } from '../../../ipc/registroIpc';
import { listarProcesos, procesoPorId, crearProceso, actualizarProceso, eliminarProceso, finalizarProceso } from '../casos-uso/procesos';
import { listarSedes, crearSede, actualizarSede, listarServicios, crearServicio, actualizarServicio } from '../casos-uso/sedesServicios';
import { listarClases, crearClase, actualizarClase, precargarSugeridas } from '../casos-uso/clases';
import { obtenerParametros, actualizarParametros } from '../casos-uso/parametros';
import { obtenerConvencion, guardarConvencion, previsualizarCodigo, listarAbreviaturas, guardarAbreviaturas } from '../casos-uso/convencion';
import { cargarDemostracion, borrarDemostracion } from '../casos-uso/demostracion';

/** Canales de la configuración (MOD-02). Cada uno es solo su caso de uso: el middleware pone el resto. */
export function registrarCanalesConfiguracion(registro: RegistroIpc): void {
  registro.registrar('proceso:listar', listarProcesos);
  registro.registrar('proceso:porId', procesoPorId);
  registro.registrar('proceso:crear', crearProceso);
  registro.registrar('proceso:actualizar', actualizarProceso);
  registro.registrar('proceso:eliminar', eliminarProceso);
  registro.registrar('proceso:finalizar', finalizarProceso);

  registro.registrar('sede:listar', listarSedes);
  registro.registrar('sede:crear', crearSede);
  registro.registrar('sede:actualizar', actualizarSede);
  registro.registrar('servicio:listar', listarServicios);
  registro.registrar('servicio:crear', crearServicio);
  registro.registrar('servicio:actualizar', actualizarServicio);

  registro.registrar('clase:listar', listarClases);
  registro.registrar('clase:crear', crearClase);
  registro.registrar('clase:actualizar', actualizarClase);
  registro.registrar('clase:precargarSugeridas', precargarSugeridas);

  registro.registrar('parametros:obtener', obtenerParametros);
  registro.registrar('parametros:actualizar', actualizarParametros);

  registro.registrar('convencion:obtener', obtenerConvencion);
  registro.registrar('convencion:guardar', guardarConvencion);
  registro.registrar('convencion:previsualizar', (e) => previsualizarCodigo(e));
  registro.registrar('abreviatura:listar', listarAbreviaturas);
  registro.registrar('abreviatura:guardar', guardarAbreviaturas);

  // `importacion:*` se registra en registrarHandlers: la orquestación es común a
  // todas las plantillas, no propiedad de la configuración.

  registro.registrar('demo:cargar', cargarDemostracion);
  registro.registrar('demo:borrar', borrarDemostracion);
}
