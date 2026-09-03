import type { RegistroIpc } from './registroIpc';
import type { GestorTareas } from './tareas';
import { probarConexion } from '../infraestructura/db/conexion';
import { versionEsquema } from '../infraestructura/db/migrador';
import { registrarCanalesPlataforma } from '../modules/plataforma';
import { registrarCanalesConfiguracion, PREDICADOS_PASO_01, IMPORTADORES_PASO_01 } from '../modules/configuracion';
import { registrarCanalesValidaciones } from '../modules/validaciones';
import { PREDICADOS_PASO_02, registrarCanalesInventario, IMPORTADOR_PL_03 } from '../modules/inventario';
import { PREDICADOS_PASO_03, IMPORTADOR_PL_05 } from '../modules/hojas-vida';
import { registrarCanalesDocumental } from '../modules/documental';
import { registrarCanalesCalculo, PREDICADOS_PASO_05, PREDICADOS_PASO_06 } from '../modules/calculo';
import { registrarCanalesBajas, PREDICADOS_PASO_09 } from '../modules/bajas';
import { registrarCanalesInforme } from '../modules/informe';
import { confirmarImportacion, previsualizarImportacion, registrarImportadores } from '../infraestructura/documental/excel/orquestadorImportacion';

export interface DependenciasHandlers {
  readonly versionApp: string;
  readonly tareas: GestorTareas;
  readonly versiones: { readonly electron: string; readonly chrome: string; readonly node: string };
  /** Registro técnico del main (plan 4.3 §5); opcional en pruebas. */
  readonly registrarErrorRenderer?: (mensaje: string, datos: Record<string, unknown>) => void;
}

/**
 * Registra TODOS los canales del contrato: los de plataforma y los de cada módulo.
 * El test de T-B-08 compara lo registrado aquí con `CANALES`.
 */
export function registrarTodosLosHandlers(registro: RegistroIpc, deps: DependenciasHandlers): void {
  registro.registrar('app:obtenerEstado', (_entrada, ctx) => {
    const { conectada, versionSqlite } = probarConexion(ctx.sqlite);
    return {
      nombreProducto: 'Valuación de Activos',
      versionApp: deps.versionApp,
      versionEsquema: versionEsquema(ctx.sqlite),
      versiones: deps.versiones,
      baseDatos: { conectada, versionSqlite },
    };
  });

  registro.registrar('app:registrarErrorRenderer', ({ mensaje, origen, pila }) => {
    deps.registrarErrorRenderer?.(`error del renderer: ${mensaje}`, { origen, pila });
    return { registrado: true as const };
  });

  registro.registrar('tarea:cancelar', ({ tareaId }) => ({ cancelada: deps.tareas.cancelar(tareaId) }));

  registrarCanalesPlataforma(registro);
  registrarCanalesConfiguracion(registro);
  registrarCanalesInventario(registro);
  registrarCanalesDocumental(registro);
  registrarCanalesCalculo(registro);
  registrarCanalesBajas(registro);
  registrarCanalesInforme(registro);
  // Los predicados de cada paso los aporta su módulo de dominio; el motor solo los evalúa.
  registrarCanalesValidaciones(registro, [PREDICADOS_PASO_01, PREDICADOS_PASO_02, PREDICADOS_PASO_03, PREDICADOS_PASO_05, PREDICADOS_PASO_06, PREDICADOS_PASO_09]);

  // Importación (TR-02): la orquestación es una sola; cada módulo aporta las
  // plantillas que sabe leer y escribir.
  registrarImportadores([...IMPORTADORES_PASO_01, IMPORTADOR_PL_03, IMPORTADOR_PL_05]);
  registro.registrar('importacion:previsualizar', previsualizarImportacion);
  registro.registrar('importacion:confirmar', confirmarImportacion);
}
