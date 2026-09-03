/** T-B-11 — el hospital de demostración se carga, muestra la banda y se borra sin residuos. */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('cargar, recorrer y borrar el hospital de demostración', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-demo-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    const tarjeta = pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText('Demostración');

    await tarjeta.click();
    await expect(pagina.locator('[data-prueba="banda-demo"]')).toContainText('MODO DEMOSTRACIÓN');

    // Recorrido: el paso 01 está completo y se puede avanzar.
    await pagina.getByRole('link', { name: /5\. Ejercicio/ }).click();
    await expect(pagina.getByRole('button', { name: 'Avanzar al paso 02' })).toBeEnabled();

    // Borrado de un clic con confirmación.
    await pagina.getByRole('button', { name: 'Borrar demostración' }).click();
    await pagina.getByRole('button', { name: 'Sí, borrar' }).click();
    await expect(pagina.getByRole('heading', { name: 'Entidades' })).toBeVisible();
    await expect(pagina.getByText('Aún no hay entidades')).toBeVisible();
    await expect(pagina.getByRole('button', { name: 'Cargar hospital de demostración' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
