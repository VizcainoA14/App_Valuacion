/**
 * Generador de bienes sintéticos para pruebas de carga (`RNF-01`: 20.000 bienes).
 * Vive junto al módulo para poder usarlo tanto desde `scripts/sembrar.ts` como
 * desde el test de rendimiento. NO es el hospital de demostración (T-B-11).
 */
import type { ConexionSqlite } from '../../../infraestructura/db/conexion';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { componerCodigo } from '../../../../compartido/reglas/codigoInstitucional';
import type { SegmentoCodigo } from '../../../../compartido/dtos/configuracion';
import { aCentavos } from '../../../../compartido/motor/dinero';
import { sumarDias } from '../../../../compartido/motor/fechas';
import { comoFechaIso } from '../../../../compartido/tipos/basicos';

const DESCRIPCIONES = ['Monitor de signos vitales', 'Camilla de transporte', 'Computador de escritorio', 'Silla ergonómica', 'Bomba de infusión', 'Nevera de reactivos', 'Escritorio modular', 'Impresora láser', 'Ecógrafo portátil', 'Autoclave de mesa'];
const MARCAS = ['Mindray', 'Philips', 'Dell', 'HP', 'Stryker', 'GE', 'Genérica'];
const ESTADOS = ['BUENO', 'BUENO', 'BUENO', 'REGULAR', 'MALO', 'INSERVIBLE'] as const;
const TENENCIAS = ['PROPIO', 'PROPIO', 'PROPIO', 'PROPIO', 'COMODATO', 'TERCERO'] as const;

const SEGMENTOS: readonly SegmentoCodigo[] = [{ tipo: 'CODIGO_SEDE' }, { tipo: 'SEPARADOR', valor: '-' }, { tipo: 'ABREVIATURA_TIPO' }, { tipo: 'SEPARADOR', valor: '-' }, { tipo: 'CONSECUTIVO' }];

/** Generador determinista: la misma semilla produce el mismo inventario (pruebas reproducibles). */
function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export interface OpcionesSiembra {
  readonly bienes: number;
  readonly semilla?: number;
  /** Proporción de bienes con hoja de vida completa (datos económicos). */
  readonly proporcionConHojaVida?: number;
  /** Fecha alrededor de la cual se generan tomas y adquisiciones (todas anteriores). */
  readonly fechaReferencia?: string;
}

export interface ResultadoSiembra {
  readonly bienes: number;
  readonly hojasVida: number;
  readonly milisegundos: number;
}

/**
 * Inserta bienes en el inventario de una entidad. Requiere que ya tenga clases,
 * sedes y servicios (los toma de la base tal cual están).
 */
export function sembrarBienes(sqlite: ConexionSqlite, procesoId: string, opciones: OpcionesSiembra): ResultadoSiembra {
  const inicio = Date.now();
  const azar = aleatorio(opciones.semilla ?? 42);
  const proporcion = opciones.proporcionConHojaVida ?? 0.8;

  const clases = sqlite.prepare('SELECT id, codigo FROM clase_activo WHERE proceso_id = ? AND activo = 1').all(procesoId) as { id: string; codigo: string }[];
  const ubicaciones = sqlite
    .prepare('SELECT v.id AS servicio_id, s.id AS sede_id, s.codigo AS sede_codigo FROM servicio v JOIN sede s ON s.id = v.sede_id WHERE s.proceso_id = ? AND v.activo = 1')
    .all(procesoId) as { servicio_id: string; sede_id: string; sede_codigo: string }[];
  if (clases.length === 0 || ubicaciones.length === 0) throw new Error('La entidad no tiene clases o servicios activos');

  const insertarBien = sqlite.prepare(
    `INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id, marca, modelo, serie, sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, responsable_custodia, fecha_toma, funcionario_conteo, creado_en, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'Siembra de carga', ?, ?)`,
  );
  const insertarHoja = sqlite.prepare(
    `INSERT INTO hoja_vida (id, bien_id, estado_operativo, forma_adquisicion, fecha_adquisicion, costo_adquisicion_cent, adiciones_mejoras_cent, creado_en, actualizado_en)
     VALUES (?, ?, 'OPERATIVO', 'COMPRA', ?, ?, 0, ?, ?)`,
  );

  const existentes = (sqlite.prepare('SELECT COUNT(*) AS n FROM bien WHERE proceso_id = ?').get(procesoId) as { n: number }).n;
  const ahora = new Date().toISOString();
  const corte = comoFechaIso(opciones.fechaReferencia ?? '2025-06-30');
  let hojasVida = 0;

  sqlite.transaction(() => {
    for (let i = 0; i < opciones.bienes; i++) {
      const n = existentes + i + 1;
      const clase = clases[Math.floor(azar() * clases.length)];
      const ubicacion = ubicaciones[Math.floor(azar() * ubicaciones.length)];
      if (clase === undefined || ubicacion === undefined) continue;
      const descripcion = DESCRIPCIONES[Math.floor(azar() * DESCRIPCIONES.length)] ?? 'Bien';
      const bienId = nuevoId();
      insertarBien.run(
        bienId,
        procesoId,
        componerCodigo(SEGMENTOS, 6, { codigoSede: ubicacion.sede_codigo, abreviatura: clase.codigo, consecutivo: n }),
        `PL-${String(n).padStart(7, '0')}`,
        descripcion,
        clase.id,
        MARCAS[Math.floor(azar() * MARCAS.length)] ?? 'Genérica',
        `MOD-${Math.floor(azar() * 900) + 100}`,
        `SN-${String(n).padStart(8, '0')}`,
        ubicacion.sede_id,
        ubicacion.servicio_id,
        ESTADOS[Math.floor(azar() * ESTADOS.length)] ?? 'BUENO',
        TENENCIAS[Math.floor(azar() * TENENCIAS.length)] ?? 'PROPIO',
        `Custodio ${Math.floor(azar() * 40) + 1}`,
        sumarDias(corte, -Math.floor(azar() * 60) - 1),
        ahora,
        ahora,
      );

      if (azar() < proporcion) {
        insertarHoja.run(nuevoId(), bienId, sumarDias(corte, -Math.floor(azar() * 3650) - 30), aCentavos(Math.floor(azar() * 40_000_000) + 200_000), ahora, ahora);
        hojasVida += 1;
      }
    }
  })();

  return { bienes: opciones.bienes, hojasVida, milisegundos: Date.now() - inicio };
}
