/**
 * T-B-01 — Prueba de exhaustividad de los enums.
 * El oráculo es la tabla literal de ANEXO_B §5 (+ §6.2): si /especificacion/teoria cambia un
 * valor, este test falla antes de que lo haga una resolución firmada.
 */
import { describe, expect, it } from 'vitest';
import {
  CATALOGOS_CANONICOS,
  TODOS_LOS_CATALOGOS,
  ESTADO_ACTUAL,
  CAMPOS_SENSIBLES,
  type EstadoActual,
} from './index';
import { casoImposible } from '../tipos/exhaustivo';

const ANEXO_B_5: Record<string, readonly string[]> = {
  estado_actual: ['BUENO', 'REGULAR', 'MALO', 'INSERVIBLE'],
  condicion_tenencia: ['PROPIO', 'COMODATO', 'ARRENDADO', 'TERCERO'],
  estado_operativo: ['OPERATIVO', 'NO_OPERATIVO', 'FUERA_SERVICIO'],
  forma_adquisicion: ['COMPRA', 'DONACION', 'COMODATO', 'REPOSICION', 'TRASLADO'],
  semaforo: ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'],
  metodo_valuacion: [
    'COSTO_REPOSICION_DEPRECIADO',
    'COMPARACION_MERCADO',
    'VALOR_EN_LIBROS',
    'VALOR_RESIDUAL_CHATARRA',
    'VALOR_CERO',
  ],
  tipo_ajuste: ['VALORIZACION', 'DESVALORIZACION', 'SIN_CAMBIO'],
  causal_baja: ['OBSOLESCENCIA', 'INSERVIBLE', 'CASO_FORTUITO', 'DESUSO', 'DONACION_O_TRASLADO'],
  tipo_diferencia: [
    'SOBRANTE_FISICO',
    'FALTANTE_FISICO',
    'DIFERENCIA_VALOR',
    'DIFERENCIA_FECHA',
    'DIFERENCIA_DEPRECIACION',
    'CLASIFICACION_ERRONEA',
    'DUPLICADO_LIBROS',
    'BIEN_TERCERO',
  ],
  accion_propuesta: ['INCORPORAR', 'DAR_DE_BAJA', 'AJUSTAR_VALOR', 'AJUSTAR_DEPRECIACION', 'RECLASIFICAR'],
  indicio_deterioro: ['DANO_FISICO', 'OBSOLESCENCIA', 'DESUSO', 'CAMBIO_NORMATIVO'],
  destino_final: ['VENTA', 'REMATE', 'DESTRUCCION', 'DONACION', 'RECICLAJE_RAEE', 'GESTOR_AMBIENTAL'],
  estado_legalizacion: ['LEGALIZADO', 'EN_TRAMITE', 'SIN_TITULO'],
  estado_conservacion: ['1_NUEVO', '2_BUENO', '3_REGULAR', '4_DEFICIENTE', '5_INSERVIBLE'],
  estado_registro: ['BORRADOR', 'VALIDADO', 'ACTIVO', 'INCOMPLETO', 'PROPUESTO_BAJA', 'DADO_DE_BAJA'],
};

describe('los 15 catálogos canónicos de ANEXO_B', () => {
  it('son exactamente 15, con nombres únicos', () => {
    expect(CATALOGOS_CANONICOS).toHaveLength(15);
    expect(new Set(CATALOGOS_CANONICOS.map((c) => c.nombre)).size).toBe(15);
    expect(Object.keys(ANEXO_B_5)).toHaveLength(15);
  });

  it.each(CATALOGOS_CANONICOS.map((c) => [c.nombre, c] as const))(
    '%s tiene exactamente los valores de /especificacion/teoria, en su orden',
    (nombre, catalogo) => {
      expect([...catalogo.valores]).toEqual(ANEXO_B_5[nombre]);
    },
  );
});

describe('todos los catálogos de la aplicación', () => {
  it('no repiten nombre', () => {
    const nombres = TODOS_LOS_CATALOGOS.map((c) => c.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it.each(TODOS_LOS_CATALOGOS.map((c) => [c.nombre, c] as const))(
    '%s: todo valor tiene etiqueta no vacía y ninguna se repite',
    (_nombre, catalogo) => {
      const etiquetas = catalogo.valores.map((v) => catalogo.etiqueta(v));
      for (const e of etiquetas) expect(e.trim().length).toBeGreaterThan(0);
      expect(new Set(etiquetas).size).toBe(etiquetas.length);
      expect(catalogo.valores.length).toBeGreaterThan(0);
    },
  );

  it('es() acepta sus valores y rechaza cualquier otra cosa', () => {
    expect(ESTADO_ACTUAL.es('BUENO')).toBe(true);
    expect(ESTADO_ACTUAL.es('bueno')).toBe(false);
    expect(ESTADO_ACTUAL.es('EXCELENTE')).toBe(false);
    expect(ESTADO_ACTUAL.es(1)).toBe(false);
    expect(ESTADO_ACTUAL.es(null)).toBe(false);
  });

  it('es inmutable', () => {
    expect(Object.isFrozen(ESTADO_ACTUAL)).toBe(true);
    expect(Object.isFrozen(ESTADO_ACTUAL.valores)).toBe(true);
    expect(Object.isFrozen(ESTADO_ACTUAL.etiquetas)).toBe(true);
  });
});

describe('exhaustividad en compilación', () => {
  // Si se añade un valor a estado_actual sin atenderlo aquí, tsc falla en casoImposible.
  function describir(estado: EstadoActual): string {
    switch (estado) {
      case 'BUENO':
        return 'sirve';
      case 'REGULAR':
        return 'sirve con reservas';
      case 'MALO':
        return 'apenas';
      case 'INSERVIBLE':
        return 'no sirve';
      default:
        return casoImposible(estado);
    }
  }

  it('cubre todos los valores', () => {
    for (const v of ESTADO_ACTUAL.valores) expect(describir(v)).toBeTypeOf('string');
  });
});

describe('campos sensibles (ANEXO_B §7.1)', () => {
  it('son los 8 del anexo', () => {
    expect([...CAMPOS_SENSIBLES]).toEqual([
      'costo_adquisicion',
      'fecha_adquisicion',
      'clase_activo_id',
      'valor_avaluo_final',
      'vida_util_tecnica_override',
      'deterioro',
      'causal_baja',
      'fecha_corte',
    ]);
  });
});
