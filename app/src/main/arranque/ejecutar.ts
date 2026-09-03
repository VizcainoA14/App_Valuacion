import { execFile } from 'node:child_process';
import type { Ejecutor } from './rutaDatos';

/** Ejecuta un comando del sistema con tope de tiempo; devuelve su salida estándar. */
export const ejecutarComando: Ejecutor = (comando, argumentos) =>
  new Promise((resolver, rechazar) => {
    execFile(
      comando,
      [...argumentos],
      { timeout: 8000, windowsHide: true, encoding: 'utf8' },
      (error, stdout) => {
        if (error !== null) rechazar(error);
        else resolver(stdout);
      },
    );
  });
