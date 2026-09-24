/**
 * El hospital calcula la depreciación a la fecha de corte de su proceso y ve qué
 * bienes están al final de su vida útil; recalcula si corrige algo, y al terminar
 * finaliza el proceso, que queda de solo lectura. Es la razón de ser del
 * producto, así que se prueba el camino completo sobre la aplicación real, no
 * solo el motor (ADR-028, ADR-029).
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, seccion } from './_lanzar';

test('calcular a la fecha del proceso, recalcular, finalizar y quedar de solo lectura', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-calculo-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    await seccion(pagina, 'Calcular').click();
    await expect(pagina.getByRole('heading', { name: 'Calcular', exact: true })).toBeVisible();
    await expect(pagina.getByRole('heading', { name: 'Calcular el proceso' })).toBeVisible();

    // No se elige fecha: es la del proceso. 50 bienes de la demostración.
    await expect(pagina.getByLabel('Fecha de corte')).toHaveCount(0);
    await pagina.getByRole('button', { name: 'Calcular 50 bienes al 30/06/2025' }).click();

    // El resultado: totales, semáforo y el listado bien por bien.
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toContainText('dias_exactos');
    await expect(pagina.getByRole('heading', { name: 'Estado de la vida útil' })).toBeVisible();
    await expect(pagina.getByText('Valor neto en libros')).toBeVisible();
    await expect(pagina.getByRole('columnheader', { name: 'Índice' })).toBeVisible();
    await expect(pagina.getByText(/^\d+ bienes$/)).toBeVisible();

    // Filtrar por semáforo: el filtro vive en la URL.
    await pagina.getByLabel('Semáforo').selectOption('ROJO');
    await expect(pagina.getByText(/bienes$/)).toBeVisible();

    // Recalcular reemplaza el cálculo: sigue habiendo uno solo.
    await expect(pagina.getByRole('heading', { name: 'Volver a calcular' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Recalcular 50 bienes al 30/06/2025' }).click();
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toBeVisible();

    // ── Finalizar desde el resumen del proceso ──
    await seccion(pagina, 'Resumen').click();
    await pagina.getByRole('button', { name: 'Finalizar proceso' }).click();
    await pagina.getByRole('button', { name: 'Sí, finalizar' }).click();
    await expect(pagina.locator('[data-prueba="banda-finalizado"]')).toContainText('Proceso finalizado');
    await expect(pagina.getByRole('button', { name: 'Finalizar proceso' })).toHaveCount(0);

    // De solo lectura: el cálculo se consulta pero ya no se rehace…
    await seccion(pagina, 'Calcular').click();
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toBeVisible();
    await expect(pagina.getByRole('button', { name: /^Recalcular/ })).toHaveCount(0);
    // …y la configuración se ve, pero no se edita.
    await seccion(pagina, 'Configurar').click();
    await pagina.getByRole('link', { name: /1\. Proceso y hospital/ }).click();
    await expect(pagina.getByLabel('Razón social')).toBeDisabled();

    // En la lista de procesos aparece entre los finalizados.
    await pagina.getByRole('link', { name: 'Todos los procesos' }).click();
    await expect(pagina.getByRole('heading', { name: 'Procesos finalizados' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
