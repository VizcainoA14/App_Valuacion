/**
 * Iniciar el proceso **desde el formato PL-01 diligenciado**, que es como llega un
 * hospital que recibió la plantilla y la devolvió llena. Antes había que copiar
 * a mano lo que ya estaba escrito en el Excel (defecto reportado el 2026-09-04).
 *
 * El diálogo de archivo es nativo: se sustituye desde el proceso principal con
 * `app.evaluate`, igual que en el E2E del informe.
 */
import { test, expect } from '@playwright/test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanzarApp, raizApp } from './_lanzar';

const PL_01 = join(raizApp, '..', 'datos_de_prueba', '01_caso_limpio', 'PL-01_parametros_entidad.xlsx');

test('el proceso nace del PL-01 diligenciado, sin teclear nada', async () => {
  test.setTimeout(120_000);
  if (!existsSync(PL_01)) throw new Error(`Faltan los datos de prueba (${PL_01}). Ejecute: npm run datos:prueba`);
  void dirname(fileURLToPath(import.meta.url));

  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-pl01-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    // El selector de archivo devuelve siempre el PL-01 del hospital ficticio.
    await app.evaluate(({ dialog, shell }, ruta) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [ruta] });
      shell.showItemInFolder = () => undefined;
    }, PL_01);

    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Iniciar un proceso nuevo' }).click();
    await expect(pagina.getByRole('heading', { name: '¿Ya tiene el formato PL-01 diligenciado?' })).toBeVisible();

    await pagina.getByRole('button', { name: 'Crear desde PL-01' }).click();

    // Previsualización antes de crear nada: se ve qué se va a importar.
    await expect(pagina.getByRole('heading', { name: /Previsualización · PL-01/ })).toBeVisible();
    await expect(pagina.getByText('Sin errores')).toBeVisible();
    await pagina.getByRole('button', { name: 'Confirmar importación' }).click();

    // Queda creada y se entra directamente a continuar la parametrización.
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();
    // La barra lateral ya es la del proceso recién iniciado, con la fecha de corte del formato.
    await expect(pagina.locator('[data-prueba="proceso-actual"]')).toContainText('E.S.E. HOSPITAL SANTA ANA DE GUARNE');
    await expect(pagina.locator('[data-prueba="proceso-actual"]')).toContainText('31/12/2025');

    // Los datos del Excel llegaron completos.
    await pagina.getByRole('link', { name: /1\. Proceso y hospital/ }).click();
    await expect(pagina.getByLabel('Razón social')).toHaveValue('E.S.E. HOSPITAL SANTA ANA DE GUARNE');
    await expect(pagina.getByLabel('NIT')).toHaveValue('890905137-4');
    await expect(pagina.getByLabel('Municipio')).toHaveValue('GUARNE');
    await expect(pagina.getByLabel('Fecha de corte')).toHaveValue('2025-12-31');

    // Y los parámetros de cálculo también.
    await pagina.getByRole('link', { name: /4\. Parámetros/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Parámetros de cálculo' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
