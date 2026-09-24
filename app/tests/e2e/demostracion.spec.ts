/** T-B-11 — el proceso de demostración se carga, muestra la banda y se borra sin residuos. */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('cargar, recorrer y borrar el proceso de demostración', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-demo-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    const tarjeta = pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText('Demostración');

    await tarjeta.click();
    await expect(pagina.locator('[data-prueba="banda-demo"]')).toContainText('MODO DEMOSTRACIÓN');

    // Se entra a su resumen: la configuración y el inventario están listos; falta calcular.
    await expect(pagina.getByRole('heading', { name: 'Proceso de demostración' })).toBeVisible();
    await expect(pagina.getByText('Hospital, sedes, clases de activo y parámetros listos.')).toBeVisible();
    await expect(pagina.getByText('50 bienes cargados.')).toBeVisible();
    // Sin cálculo no se puede finalizar.
    await expect(pagina.getByRole('button', { name: 'Finalizar proceso' })).toBeDisabled();

    // Borrado de un clic con confirmación.
    await pagina.getByRole('button', { name: 'Borrar demostración' }).click();
    await pagina.getByRole('button', { name: 'Sí, borrar' }).click();
    await expect(pagina.getByRole('heading', { name: 'Procesos de valuación' })).toBeVisible();
    await expect(pagina.getByText('Todavía no hay ningún proceso')).toBeVisible();
    await expect(pagina.getByRole('button', { name: 'Cargar proceso de demostración' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
