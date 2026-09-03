/**
 * ADR-026 etapa 6 — la entrega. Genera el PDF de verdad con `printToPDF`
 * (TR-05, T-G-03) y comprueba que el archivo existe y es un PDF.
 *
 * El diálogo de guardado es nativo y Playwright no lo puede conducir, así que se
 * sustituye desde el PROCESO PRINCIPAL con `app.evaluate`: se controla Electron,
 * no se añade plumbing de pruebas al código de producción.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('generar el informe de valuación en PDF', async () => {
  test.setTimeout(180_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-informe-'));
  const salida = mkdtempSync(join(tmpdir(), 'valuacion-e2e-pdf-'));
  const destino = join(salida, 'informe.pdf');
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    // El diálogo devuelve siempre la misma ruta, y no se abre el explorador.
    await app.evaluate(({ dialog, shell }, ruta) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: ruta });
      shell.showItemInFolder = () => undefined;
    }, destino);

    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    // Sin cálculo, la etapa 6 lo dice y no ofrece generar nada.
    await pagina.getByRole('link', { name: /^6. Informe/ }).click();
    await expect(pagina.getByText('Todavía no hay nada que informar')).toBeVisible();

    await pagina.getByRole('link', { name: 'Ir al cálculo' }).click();
    await pagina.getByRole('button', { name: 'Calcular', exact: true }).click();
    await expect(pagina.getByRole('button', { name: 'Recalcular' })).toBeVisible();

    await pagina.getByRole('link', { name: /^6. Informe/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Informe de valuación' })).toBeVisible();
    await expect(pagina.getByText('50 bienes en el anexo', { exact: false })).toBeVisible();

    // La vista previa es el mismo documento que se imprime.
    const previa = pagina.frameLocator('iframe[title="Vista previa del informe"]');
    await expect(previa.getByRole('heading', { name: 'Informe de valuación de activos fijos' })).toBeVisible();
    await expect(previa.getByText('EJEMPLO — SIN VALIDEZ')).toBeVisible();
    await expect(previa.getByRole('heading', { name: '1. Método aplicado' })).toBeVisible();

    await pagina.getByRole('button', { name: 'Guardar en PDF' }).click();
    await expect(pagina.getByText('Informe generado')).toBeVisible({ timeout: 60_000 });

    expect(existsSync(destino)).toBe(true);
    const contenido = readFileSync(destino);
    // Firma de un PDF válido y tamaño razonable para 50 bienes con anexo.
    expect(contenido.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(contenido.byteLength).toBeGreaterThan(10_000);
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
    rmSync(salida, { recursive: true, force: true });
  }
});
