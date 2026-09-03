import type { Uuid, MarcaTiempo } from '../tipos/basicos';
import type { PerfilResponsable } from '../enums/plataforma';

/** TR-12 — Persona del catálogo de responsables (ANEXO_B §7.2). No es una cuenta. */
export interface ResponsableDto {
  readonly id: Uuid;
  readonly entidadId: Uuid;
  readonly nombreCompleto: string;
  readonly documentoIdentidad: string;
  readonly perfil: PerfilResponsable;
  readonly cargo: string;
  readonly tarjetaProfesional: string | null;
  readonly registroRaa: string | null;
  readonly esExterno: boolean;
  readonly activo: boolean;
  readonly creadoEn: MarcaTiempo;
  readonly actualizadoEn: MarcaTiempo;
}
