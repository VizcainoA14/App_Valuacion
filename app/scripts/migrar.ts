/**
 * `npm run db:migrar -- <ruta.db>` — aplica las migraciones pendientes a una base.
 * Útil en CI ("migración desde vacío y desde la versión anterior") y para
 * inspeccionar una base con la consola. La app hace lo mismo al arrancar.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirSqlite } from '../src/main/infraestructura/db/conexion';
import {
  cargarMigracionesDesdeDisco,
  migrar,
  versionEsquema,
} from '../src/main/infraestructura/db/migrador';
import { crearRespaldoVerificado, rutaRespaldo } from '../src/main/infraestructura/db/respaldo';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ruta = process.argv[2];
if (ruta === undefined) {
  console.error('Uso: npm run db:migrar -- <ruta de la base .db>');
  process.exit(2);
}

const migraciones = cargarMigracionesDesdeDisco(
  join(raiz, 'src/main/infraestructura/db/migraciones'),
);
const db = abrirSqlite(ruta);
console.log(`Base: ${ruta} · versión actual ${versionEsquema(db)} · disponible ${migraciones.length}`);

const resultado = await migrar(db, migraciones, {
  antesDeMigrar: async (desde, hasta) => {
    const destino = rutaRespaldo(
      join(dirname(ruta), 'respaldos'),
      `pre-migracion-v${desde}-a-v${hasta}`,
      new Date().toISOString(),
    );
    const r = await crearRespaldoVerificado(db, destino);
    console.log(`Respaldo verificado: ${r.ruta} (${r.bytes} bytes)`);
  },
});

if (resultado.aplicadas.length === 0) console.log('Nada que migrar.');
else console.log(`Migrado de v${resultado.desde} a v${resultado.hasta}: ${resultado.aplicadas.join(', ')}`);
db.close();
