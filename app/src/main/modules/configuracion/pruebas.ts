/** Arnés de pruebas del paso 01: registro IPC completo sobre una base en memoria. */
import { vi } from 'vitest';
import { join } from 'node:path';
import { abrirBaseDePrueba } from '../../infraestructura/db/pruebas/semilla';
import { crearBitacora } from '../../infraestructura/bitacora/registrador';
import { crearRegistroIpc, type RegistroIpc, type ContextoIpc } from '../../ipc/registroIpc';
import { registrarTodosLosHandlers } from '../../ipc/registrarHandlers';
import { GestorTareas } from '../../ipc/tareas';
import type { ConexionSqlite } from '../../infraestructura/db/conexion';
import { dialogosNulos, RUTA_PLANTILLAS } from '../../ipc/pruebas/dialogos';

export interface Arnes {
  readonly registro: RegistroIpc;
  readonly sqlite: ConexionSqlite;
  readonly ctx: ContextoIpc;
  /** Simula lo que el usuario elige en el diálogo del main (null = cancela). Sobrevive al spread. */
  readonly seleccionarArchivo: (ruta: string | null) => void;
  /** Simula dónde decide guardar el usuario lo que la aplicación le entrega. */
  readonly guardarEn: (ruta: string | null) => void;
  /** Rutas reveladas en el explorador, para comprobar que se le muestra al usuario. */
  readonly reveladas: string[];
}

export async function arnesPaso01(opciones: { rutaDatos?: string; hoy?: string; rutaPlantillas?: string } = {}): Promise<Arnes> {
  const { sqlite, db } = await abrirBaseDePrueba();
  const ahoraIso = (): string => `${opciones.hoy ?? '2026-09-02'}T10:00:00.000Z`;
  const estado = { archivoElegido: null as string | null, destino: null as string | null, reveladas: [] as string[] };
  const ctx: ContextoIpc = {
    sqlite,
    db,
    bitacora: crearBitacora(sqlite, 'pc/u', ahoraIso),
    ahoraIso,
    rutaDatos: opciones.rutaDatos ?? '', rutaPlantillas: opciones.rutaPlantillas ?? RUTA_PLANTILLAS,
    formatoFechaRegional: 'DD/MM/AAAA',
    dialogos: {
      ...dialogosNulos(),
      elegirArchivoExcel: async () => estado.archivoElegido,
      elegirDondeGuardar: async (_titulo, nombreSugerido) => (estado.destino === null ? null : join(estado.destino, nombreSugerido)),
      elegirCarpeta: async () => estado.destino,
      revelarEnCarpeta: (ruta) => estado.reveladas.push(ruta),
    },
  };
  const registro = crearRegistroIpc({
    receptor: { handle: () => undefined },
    registro: { ruta: '', error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    contexto: ctx,
  });
  registrarTodosLosHandlers(registro, { versionApp: '0.1.0', tareas: new GestorTareas(), versiones: { electron: 'e', chrome: 'c', node: 'n' } });
  return {
    registro,
    sqlite,
    ctx,
    seleccionarArchivo: (ruta) => {
      estado.archivoElegido = ruta;
    },
    guardarEn: (ruta) => {
      estado.destino = ruta;
    },
    reveladas: estado.reveladas,
  };
}

/** Un proceso con su hospital; la fecha de corte es la que usan las cifras de ANEXO_C §3.3. */
export const PROCESO_PRUEBA = {
  nombre: 'Valuación de prueba',
  fechaCorte: '2025-06-30',
  razonSocial: 'E.S.E Hospital San Vicente',
  nit: '890000000-1',
  municipio: 'Popayán',
  departamento: 'Cauca',
  nivelComplejidad: 'II' as const,
  nombreGerente: 'Gerente Prueba',
  direccion: 'Calle 1 # 2-3',
};

/** Desenvuelve una respuesta IPC o falla con el error legible. */
export function valor<T>(r: { ok: true; valor: T } | { ok: false; error: { codigo: string; mensaje: string } }): T {
  if (!r.ok) throw new Error(`${r.error.codigo}: ${r.error.mensaje}`);
  return r.valor;
}
