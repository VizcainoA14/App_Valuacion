import type { RegistroIpc } from '../../../ipc/registroIpc';
import { listarEntidades, entidadPorId, crearEntidad, actualizarEntidad, clonarParametrizacion } from '../casos-uso/entidades';
import { listarSedes, crearSede, actualizarSede, listarServicios, crearServicio, actualizarServicio } from '../casos-uso/sedesServicios';
import { listarClases, crearClase, actualizarClase, precargarSugeridas } from '../casos-uso/clases';
import { obtenerParametros, actualizarParametros } from '../casos-uso/parametros';
import { obtenerConvencion, guardarConvencion, previsualizarCodigo, listarAbreviaturas, guardarAbreviaturas } from '../casos-uso/convencion';
import { listarEjercicios, ejercicioPorId, crearEjercicio, cambiarFechaCorte } from '../casos-uso/ejercicios';
import { cargarDemostracion, borrarDemostracion } from '../casos-uso/demostracion';

/** Canales del paso 01 (MOD-02). Cada uno es solo su caso de uso: el middleware pone el resto. */
export function registrarCanalesConfiguracion(registro: RegistroIpc): void {
  registro.registrar('entidad:listar', listarEntidades);
  registro.registrar('entidad:porId', entidadPorId);
  registro.registrar('entidad:crear', crearEntidad);
  registro.registrar('entidad:actualizar', actualizarEntidad);
  registro.registrar('entidad:clonarParametrizacion', clonarParametrizacion);

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

  registro.registrar('ejercicio:listar', listarEjercicios);
  registro.registrar('ejercicio:porId', ejercicioPorId);
  registro.registrar('ejercicio:crear', crearEjercicio);
  registro.registrar('ejercicio:cambiarFechaCorte', cambiarFechaCorte);

  // `importacion:*` se registra en registrarHandlers: la orquestación es común a
  // todas las plantillas, no propiedad del paso 01.

  registro.registrar('demo:cargar', cargarDemostracion);
  registro.registrar('demo:borrar', borrarDemostracion);
}
