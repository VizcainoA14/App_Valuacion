/**
 * ADR-026 etapa 4 — el hospital calcula la depreciación y ve qué bienes están al
 * final de su vida útil. Es la razón de ser del producto, así que se prueba el
 * camino completo sobre la aplicación real, no solo el motor.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('calcular la depreciación del hospital de demostración y revisar el resultado', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-calculo-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    // La etapa 4 ya está habilitada: deja de decir que está por construir.
    await pagina.getByRole('link', { name: /^4. Calcular/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Depreciación y obsolescencia' })).toBeVisible();
    await expect(pagina.getByText('Todavía no se ha calculado nada')).toBeVisible();

    await pagina.getByRole('button', { name: 'Calcular', exact: true }).click();

    // Tras calcular, aparecen los totales contables y el semáforo.
    await expect(pagina.getByRole('button', { name: 'Recalcular' })).toBeVisible();
    await expect(pagina.getByRole('heading', { name: 'Estado de la vida útil' })).toBeVisible();
    await expect(pagina.getByText('Valor neto en libros')).toBeVisible();
    await expect(pagina.getByText('Depreciación acumulada').first()).toBeVisible();
    await expect(pagina.getByText(/dias_exactos/)).toBeVisible();

    // El resultado bien por bien, con el índice de obsolescencia de cada uno.
    await pagina.getByRole('link', { name: 'Resultado por bien' }).click();
    await expect(pagina.getByRole('columnheader', { name: 'Índice' })).toBeVisible();
    await expect(pagina.getByText(/^\d+ bienes$/)).toBeVisible();

    // Filtrar por semáforo desde la URL: el filtro sobrevive a compartir el enlace.
    await pagina.getByLabel('Semáforo').selectOption('ROJO');
    await expect(pagina.getByText(/bienes$/)).toBeVisible();

    // Y volver: el cálculo quedó guardado, no hay que rehacerlo.
    await pagina.getByRole('link', { name: 'Calcular', exact: true }).click();
    await expect(pagina.getByRole('button', { name: 'Recalcular' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
