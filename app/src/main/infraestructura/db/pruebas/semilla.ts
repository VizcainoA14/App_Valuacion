/**
 * Semilla mínima para pruebas de persistencia: una entidad completa con sede,
 * servicio y clases, sobre una base en memoria migrada.
 * NO es el hospital de demostración (T-B-11); es lo mínimo para insertar un bien.
 */
import { abrirSqlite, crearBaseDatos, type BaseDatos, type ConexionSqlite } from '../conexion';
import { migrar } from '../migrador';
import { MIGRACIONES } from '../migraciones';
import { nuevoId } from '../identificadores';
import * as esquema from '../esquema';

export interface BasePrueba {
  readonly sqlite: ConexionSqlite;
  readonly db: BaseDatos;
}

export async function abrirBaseDePrueba(ruta = ':memory:'): Promise<BasePrueba> {
  const sqlite = abrirSqlite(ruta);
  await migrar(sqlite, MIGRACIONES);
  return { sqlite, db: crearBaseDatos(sqlite) };
}

export interface IdsSemilla {
  readonly proceso: string;
  readonly sede: string;
  readonly servicio: string;
  readonly clase: string;
  readonly claseNoDepreciable: string;
}

export function sembrarMinimo(db: BaseDatos): IdsSemilla {
  const ids: IdsSemilla = {
    proceso: nuevoId(),
    sede: nuevoId(),
    servicio: nuevoId(),
    clase: nuevoId(),
    claseNoDepreciable: nuevoId(),
  };

  db.insert(esquema.proceso)
    .values({
      id: ids.proceso,
      nombre: 'Valuación de prueba',
      fechaCorte: '2025-06-30',
      razonSocial: 'E.S.E Hospital de Prueba',
      nit: '800000000-1',
      municipio: 'Bogotá',
      departamento: 'Cundinamarca',
      nivelComplejidad: 'II',
      nombreGerente: 'Gerente de Prueba',
      direccion: 'Calle 1 # 2-3',
    })
    .run();

  db.insert(esquema.sede)
    .values({
      id: ids.sede,
      procesoId: ids.proceso,
      codigo: 'SP',
      nombre: 'Sede principal',
      direccion: 'Calle 1 # 2-3',
      municipio: 'Bogotá',
    })
    .run();

  db.insert(esquema.servicio)
    .values({
      id: ids.servicio,
      sedeId: ids.sede,
      codigo: 'URG',
      nombre: 'Urgencias',
      tipo: 'asistencial',
    })
    .run();

  db.insert(esquema.claseActivo)
    .values([
      {
        id: ids.clase,
        procesoId: ids.proceso,
        codigo: 'EMC',
        nombre: 'Equipo médico y científico',
        subcuentaContable: '166501',
        vidaUtilContableMeses: 180,
        vidaUtilTecnicaAnios: 150_000, // 15,0000 años ×10.000
        esDepreciable: true,
        requiereHojaVida: true,
        requiereInvima: true,
        responsableTecnico: 'Ingeniería biomédica',
      },
      {
        id: ids.claseNoDepreciable,
        procesoId: ids.proceso,
        codigo: 'TER',
        nombre: 'Terrenos',
        subcuentaContable: '160501',
        vidaUtilContableMeses: null,
        vidaUtilTecnicaAnios: null,
        esDepreciable: false,
        requiereHojaVida: false,
        requiereInvima: false,
        responsableTecnico: 'Recursos físicos',
      },
    ])
    .run();

  return ids;
}

export function crearBien(
  db: BaseDatos,
  ids: IdsSemilla,
  extra: Partial<typeof esquema.bien.$inferInsert> = {},
): string {
  const id = extra.id ?? nuevoId();
  const consecutivo = id.slice(-6);
  db.insert(esquema.bien)
    .values({
      id,
      procesoId: ids.proceso,
      codigoInstitucional: `HP-EMC-${consecutivo}`,
      placa: `PL-${consecutivo}`,
      descripcionFuncional: 'Monitor de signos vitales',
      claseActivoId: ids.clase,
      sedeId: ids.sede,
      servicioId: ids.servicio,
      estadoActual: 'BUENO',
      condicionTenencia: 'PROPIO',
      fechaToma: '2025-05-15',
      funcionarioConteo: 'Funcionario de Prueba',
      ...extra,
    })
    .run();
  return id;
}
