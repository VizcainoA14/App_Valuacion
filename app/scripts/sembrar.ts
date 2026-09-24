/**
 * Siembra de datos sintéticos para pruebas de carga (`RNF-01`).
 *
 *   npm run db:sembrar          → 2.000 bienes
 *   npm run db:sembrar:carga    → 20.000 bienes
 *   npm run db:sembrar -- --bienes=5000 --db=ruta.db
 *
 * Crea una base nueva con el hospital de demostración y le añade los bienes.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirSqlite, crearBaseDatos } from '../src/main/infraestructura/db/conexion';
import { migrar } from '../src/main/infraestructura/db/migrador';
import { cargarMigracionesDesdeDisco } from '../src/main/infraestructura/db/migrador';
import { crearBitacora } from '../src/main/infraestructura/bitacora/registrador';
import { cargarDemostracion } from '../src/main/modules/configuracion/casos-uso/demostracion';
import { sembrarBienes } from '../src/main/modules/inventario/pruebas/sembrarCarga';
import type { ContextoIpc } from '../src/main/ipc/registroIpc';
import { dialogosNulos } from '../src/main/ipc/pruebas/dialogos';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nombre: string, porDefecto: string): string =>
  process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1] ?? porDefecto;

const bienes = Number(arg('bienes', '2000'));
const ruta = arg('db', join(raiz, 'dist', 'carga', 'valuacion-carga.db'));

mkdirSync(dirname(ruta), { recursive: true });
if (existsSync(ruta)) rmSync(ruta, { force: true });

const sqlite = abrirSqlite(ruta);
await migrar(sqlite, cargarMigracionesDesdeDisco(join(raiz, 'src/main/infraestructura/db/migraciones')));

const ahoraIso = (): string => new Date().toISOString();
const ctx: ContextoIpc = {
  sqlite,
  db: crearBaseDatos(sqlite),
  bitacora: crearBitacora(sqlite, 'siembra', ahoraIso),
  ahoraIso,
  rutaDatos: dirname(ruta),
  rutaPlantillas: join(raiz, '..', 'especificacion', 'plantillas'),
  dialogos: dialogosNulos(),
};

const proceso = sqlite.transaction(() => cargarDemostracion({}, ctx))();

const r = sembrarBienes(sqlite, proceso.id, { bienes, proporcionConHojaVida: 0.85 });
const total = (sqlite.prepare('SELECT COUNT(*) AS n FROM bien WHERE proceso_id = ?').get(proceso.id) as { n: number }).n;

console.log(`Base sembrada: ${ruta}`);
console.log(`  proceso: ${proceso.nombre} · ${proceso.razonSocial}`);
console.log(`  bienes: ${total} (${r.bienes} sintéticos + 50 de la demostración) · hojas de vida sintéticas: ${r.hojasVida}`);
console.log(`  tiempo de inserción: ${r.milisegundos} ms`);
sqlite.close();
