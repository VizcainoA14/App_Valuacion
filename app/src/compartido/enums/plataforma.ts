/** Enums de configuración, auditoría y responsables (`ANEXO_B` §2, §4.1, §7). */
import { definirCatalogo, type ValoresDe } from './definirCatalogo';

export const NIVEL_COMPLEJIDAD = definirCatalogo('nivel_complejidad', 'ANEXO_B §2.1', {
  I: 'Nivel I',
  II: 'Nivel II',
  III: 'Nivel III',
});
export type NivelComplejidad = ValoresDe<typeof NIVEL_COMPLEJIDAD>;

export const TIPO_SERVICIO = definirCatalogo('tipo_servicio', 'ANEXO_B §2.3', {
  asistencial: 'Asistencial',
  administrativo: 'Administrativo',
  apoyo: 'Apoyo',
});
export type TipoServicio = ValoresDe<typeof TIPO_SERVICIO>;

export const TIPO_INSTALACION = definirCatalogo('tipo_instalacion', 'ANEXO_B §4.1', {
  FIJO: 'Fijo',
  MOVIL: 'Móvil',
});
export type TipoInstalacion = ValoresDe<typeof TIPO_INSTALACION>;

export const ACCION_BITACORA = definirCatalogo('accion_bitacora', 'ANEXO_B §7.1', {
  CREAR: 'Crear',
  ACTUALIZAR: 'Actualizar',
  ELIMINAR: 'Eliminar',
  CALCULAR: 'Calcular',
  APROBAR: 'Aprobar',
  RECHAZAR: 'Rechazar',
  IMPORTAR: 'Importar',
  EXPORTAR: 'Exportar',
  CERRAR: 'Cerrar',
});
export type AccionBitacora = ValoresDe<typeof ACCION_BITACORA>;

/** Catálogo de atribución de firmas, NO roles de acceso (ADR-016, ANEXO_B §7.2). */
export const PERFIL_RESPONSABLE = definirCatalogo('perfil_responsable', 'ANEXO_B §7.2', {
  COORDINADOR: 'Coordinador',
  ESPECIALISTA_BIOMEDICO: 'Especialista biomédico',
  ESPECIALISTA_SISTEMAS: 'Especialista en sistemas',
  ESPECIALISTA_FISICOS: 'Especialista en recursos físicos',
  CONTADOR: 'Contador',
  PERITO: 'Perito avaluador (externo)',
  MIEMBRO_COMITE: 'Miembro del Comité',
  GERENTE: 'Gerente',
  ASESOR_JURIDICO: 'Asesor jurídico',
  SUPERVISOR: 'Supervisor',
});
export type PerfilResponsable = ValoresDe<typeof PERFIL_RESPONSABLE>;

/**
 * Los 8 campos cuya modificación exige justificación en bitácora (ANEXO_B §7.1).
 * Se usan en T-B-09; se declaran aquí para que nadie los reescriba a mano.
 */
export const CAMPOS_SENSIBLES = Object.freeze([
  'costo_adquisicion',
  'fecha_adquisicion',
  'clase_activo_id',
  'valor_avaluo_final',
  'vida_util_tecnica_override',
  'deterioro',
  'causal_baja',
  'fecha_corte',
] as const);
export type CampoSensible = (typeof CAMPOS_SENSIBLES)[number];
