import { ErrorReglaNegocio } from '../../../../compartido/errores';
import type { PerfilResponsable } from '../../../../compartido/enums/plataforma';

/**
 * ANEXO_B §7.2: el perito es externo y firma con registro R.A.A; sin él, el
 * informe de avalúo no tiene validez. El resto de perfiles no lo necesita.
 */
export function validarPerfil(perfil: PerfilResponsable, registroRaa: string | null): void {
  if (perfil === 'PERITO' && (registroRaa === null || registroRaa.trim() === '')) {
    throw new ErrorReglaNegocio(
      'PERITO_SIN_RAA',
      'Un perito avaluador debe tener registro R.A.A (ANEXO_B §7.2).',
      { campo: 'registroRaa' },
    );
  }
}
