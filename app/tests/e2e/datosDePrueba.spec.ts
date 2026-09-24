/**
 * El recorrido completo con los datos de prueba del hospital ficticio
 * (`/datos_de_prueba/01_caso_limpio`), tal como lo haría el responsable del
 * hospital: inicia el proceso desde PL-01, carga su catálogo, importa el barrido
 * y los datos económicos, calcula a la fecha de corte del proceso (el cierre del
 * año), registra una baja, guarda el informe en PDF y finaliza el proceso
 * (ADR-028, ADR-029).
 *
 * Los diálogos de archivo son nativos: se sustituyen desde el proceso principal
 * con `app.evaluate`, igual que en los demás E2E.
 *
 * Con `CAPTURAS=<carpeta>` guarda una captura de cada pantalla, para revisar el
 * recorrido a ojo.
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, raizApp, seccion } from './_lanzar';

const LIMPIO = join(raizApp, '..', 'datos_de_prueba', '01_caso_limpio');

/** El próximo archivo que "elige" el usuario en el diálogo de abrir. */
async function elegir(app: ElectronApplication, archivo: string): Promise<void> {
  await app.evaluate(({ dialog }, ruta) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [ruta] });
  }, join(LIMPIO, archivo));
}

async function importar(app: ElectronApplication, pagina: Page, plantilla: string, archivo: string): Promise<void> {
  await elegir(app, archivo);
  await pagina.getByRole('button', { name: `Importar ${plantilla}` }).click();
  await expect(pagina.getByText('Sin errores')).toBeVisible();
  await pagina.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(pagina.getByText(`${plantilla} importada`)).toBeVisible();
}

test('recorrido completo con los datos de prueba: de PL-01 al proceso finalizado', async () => {
  test.setTimeout(240_000);
  if (!existsSync(LIMPIO)) throw new Error(`Faltan los datos de prueba (${LIMPIO}). Ejecute: npm run datos:prueba`);
  const capturas = process.env['CAPTURAS'];
  if (capturas !== undefined) mkdirSync(capturas, { recursive: true });
  let n = 0;
  const capturar = async (pagina: Page, nombre: string): Promise<void> => {
    if (capturas === undefined) return;
    n += 1;
    await pagina.screenshot({ path: join(capturas, `${String(n).padStart(2, '0')}_${nombre}.png`), fullPage: true });
  };

  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-datos-'));
  const salida = mkdtempSync(join(tmpdir(), 'valuacion-e2e-datos-pdf-'));
  const pdf = join(salida, 'informe.pdf');
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    await app.evaluate(({ dialog, shell }, ruta) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: ruta });
      shell.showItemInFolder = () => undefined;
    }, pdf);
    const pagina = await app.firstWindow();
    await pagina.setViewportSize({ width: 1400, height: 900 });

    // ── 1. El proceso nace del PL-01 diligenciado, con su fecha de corte ──
    await pagina.getByRole('button', { name: 'Iniciar un proceso nuevo' }).click();
    await elegir(app, 'PL-01_parametros_entidad.xlsx');
    await pagina.getByRole('button', { name: 'Crear desde PL-01' }).click();
    await expect(pagina.getByText('Sin errores')).toBeVisible();
    await pagina.getByRole('button', { name: 'Confirmar importación' }).click();
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();
    await expect(pagina.locator('[data-prueba="proceso-actual"]')).toContainText('31/12/2025');

    // ── 2. Catálogo: sedes y servicios, y clases ──
    await importar(app, pagina, 'PL-02b', 'PL-02b_sedes_servicios.xlsx');
    await pagina.getByRole('link', { name: /3\. Clases/ }).click();
    await importar(app, pagina, 'PL-02', 'PL-02_clases_vida_util.xlsx');
    await expect(pagina.getByText('La configuración está lista')).toBeVisible();
    await capturar(pagina, 'configuracion');

    // ── 3. El barrido y los datos económicos ──
    await seccion(pagina, 'Inventario').click();
    await importar(app, pagina, 'PL-03', 'PL-03_toma_inventario_fisico.xlsx');
    await importar(app, pagina, 'PL-05', 'PL-05_hoja_de_vida.xlsx');
    await expect(pagina.getByText('41 bienes')).toBeVisible();
    await expect(pagina.getByText('Todos los bienes tienen su hoja de vida')).toBeVisible();
    await capturar(pagina, 'inventario');
    await pagina.getByRole('link', { name: 'Barridos y servicios' }).click();
    await expect(pagina.getByRole('heading', { name: 'Historial de barridos' })).toBeVisible();
    await expect(pagina.getByRole('cell', { name: 'PL-03_toma_inventario_fisico.xlsx' })).toBeVisible();
    await capturar(pagina, 'barridos');

    // ── 4. Calcular a la fecha de corte del proceso: el cierre del año ──
    await seccion(pagina, 'Calcular').click();
    await pagina.getByRole('button', { name: 'Calcular 41 bienes al 31/12/2025' }).click();
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toBeVisible();
    // El terreno y el comodato quedan fuera de la depreciación, con su motivo.
    await expect(pagina.getByRole('heading', { name: 'Qué quedó fuera del cálculo' })).toBeVisible();
    await expect(pagina.getByText('HSA01TER0041').first()).toBeVisible();
    await expect(pagina.getByText('HSA01VEN0037').first()).toBeVisible();
    await capturar(pagina, 'calculo');

    // ── 5. Registrar la baja del primer candidato ──
    await seccion(pagina, 'Bajas').click();
    await expect(pagina.getByRole('columnheader', { name: 'Por qué es candidato' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Registrar baja' }).first().click();
    await pagina.getByLabel('Justificación').fill('Equipo fuera de servicio desde 2024; la reparación supera el valor de reposición según cotización.');
    await pagina.getByLabel('Documento que la aprobó').fill('Acta 012 de 2026');
    await pagina.getByRole('dialog').getByRole('button', { name: 'Registrar baja' }).click();
    await expect(pagina.getByText('Acta 012 de 2026')).toBeVisible();
    await capturar(pagina, 'bajas');

    // ── 6. El informe del proceso, en PDF ──
    await seccion(pagina, 'Informe').click();
    const previa = pagina.frameLocator('iframe[title="Vista previa del informe"]');
    await expect(previa.getByRole('heading', { name: 'Informe de valuación de activos fijos' })).toBeVisible();
    await expect(previa.getByText('E.S.E. HOSPITAL SANTA ANA DE GUARNE')).toBeVisible();
    await expect(previa.getByRole('heading', { name: '6. Bajas registradas hasta la fecha de corte' })).toBeVisible();
    await capturar(pagina, 'informe');
    await pagina.getByRole('button', { name: 'Guardar en PDF' }).click();
    await expect(pagina.getByText('Informe generado')).toBeVisible({ timeout: 60_000 });
    expect(readFileSync(pdf).subarray(0, 5).toString('latin1')).toBe('%PDF-');

    // ── 7. Finalizar: el proceso queda de solo lectura y su informe sigue a mano ──
    await seccion(pagina, 'Resumen').click();
    await expect(pagina.getByRole('heading', { name: 'En qué va' })).toBeVisible();
    await capturar(pagina, 'resumen');
    await pagina.getByRole('button', { name: 'Finalizar proceso' }).click();
    await pagina.getByRole('button', { name: 'Sí, finalizar' }).click();
    await expect(pagina.locator('[data-prueba="banda-finalizado"]')).toBeVisible();
    await seccion(pagina, 'Bajas').click();
    await expect(pagina.getByRole('button', { name: 'Registrar baja' })).toHaveCount(0);
    await seccion(pagina, 'Informe').click();
    await expect(pagina.getByRole('button', { name: 'Guardar en PDF' })).toBeEnabled();
    await capturar(pagina, 'finalizado');

    // Y en la lista de procesos queda entre los finalizados, listo para iniciar el siguiente.
    await pagina.getByRole('link', { name: 'Todos los procesos' }).click();
    await expect(pagina.getByRole('heading', { name: 'Procesos finalizados' })).toBeVisible();
    await capturar(pagina, 'procesos');
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
    rmSync(salida, { recursive: true, force: true });
  }
});
