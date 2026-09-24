import type { RegistroIpc } from './registroIpc';
import type { GestorTareas } from './tareas';
import { probarConexion } from '../infraestructura/db/conexion';
import { versionEsquema } from '../infraestructura/db/migrador';
import { registrarCanalesConfiguracion, PREDICADOS_CONFIGURACION, IMPORTADORES_PASO_01 } from '../modules/configuracion';
import { registrarCanalesValidaciones } from '../modules/validaciones';
import { registrarCanalesInventario, IMPORTADOR_PL_03 } from '../modules/inventario';
import { IMPORTADOR_PL_05 } from '../modules/hojas-vida';
import { registrarCanalesDocumental } from '../modules/documental';
import { registrarCanalesCalculo } from '../modules/calculo';
import { registrarCanalesBajas } from '../modules/bajas';
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
 * Registra TODOS los canales del contrato, módulo por módulo.
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

  registrarCanalesConfiguracion(registro);
  registrarCanalesInventario(registro);
  registrarCanalesDocumental(registro);
  registrarCanalesCalculo(registro);
  registrarCanalesBajas(registro);
  registrarCanalesInforme(registro);
  // Los predicados los aporta el módulo de dominio; el motor solo los evalúa.
  registrarCanalesValidaciones(registro, [PREDICADOS_CONFIGURACION]);

  // Importación (TR-02): la orquestación es una sola; cada módulo aporta las
  // plantillas que sabe leer y escribir.
  registrarImportadores([...IMPORTADORES_PASO_01, IMPORTADOR_PL_03, IMPORTADOR_PL_05]);
  registro.registrar('importacion:previsualizar', previsualizarImportacion);
  registro.registrar('importacion:confirmar', confirmarImportacion);
}
