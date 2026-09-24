/**
 * Recorrido completo del proceso de demostración pulsando cada "Guardar" de la
 * configuración y visitando cada sección. Cualquier excepción del renderer
 * (pantalla en blanco) hace fallar el test.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, seccion } from './_lanzar';

function vigilarErrores(pagina: Page): string[] {
  const errores: string[] = [];
  pagina.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console.error: ${m.text()}`);
  });
  return errores;
}

test('la demostración se recorre y se guarda en todas las pantallas sin errores del renderer', async () => {
  test.setTimeout(180_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-recorrido-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    const errores = vigilarErrores(pagina);

    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();
    await expect(pagina.locator('[data-prueba="banda-demo"]')).toBeVisible();

    // Se entra al resumen del proceso; de ahí, a su configuración.
    await expect(pagina.getByRole('heading', { name: 'En qué va' })).toBeVisible();
    await seccion(pagina, 'Configurar').click();

    // 1. El proceso y el hospital → guardar cambios.
    await pagina.getByRole('link', { name: /1\. Proceso y hospital/ }).click();
    await expect(pagina.getByRole('heading', { name: 'El proceso y el hospital' })).toBeVisible();
    await pagina.getByLabel('Teléfono').fill('(600) 111 1111');
    await pagina.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(pagina.getByText('Cambios guardados.')).toBeVisible();
    await expect(pagina.getByRole('heading', { name: 'El proceso y el hospital' })).toBeVisible();

    // 2. Sedes: desactivar y reactivar una sede; nuevo servicio.
    await pagina.getByRole('link', { name: /2\. Sedes/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Servicio' }).first().click();
    await pagina.getByRole('textbox', { name: 'Código', exact: true }).fill('FAR');
    await pagina.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Farmacia');
    await pagina.getByRole('button', { name: 'Guardar servicio' }).click();
    await expect(pagina.getByText('Farmacia')).toBeVisible();

    // 3. Clases: editar una clase y guardar.
    await pagina.getByRole('link', { name: /3\. Clases/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Clases de activo y vida útil' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Editar EMC' }).click();
    await pagina.getByLabel('Vida útil técnica (años)').fill('14');
    await pagina.getByLabel('Justificación del cambio').fill('Prueba de recorrido');
    await pagina.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(pagina.getByRole('dialog')).toBeHidden();
    await expect(pagina.getByRole('heading', { name: 'Clases de activo y vida útil' })).toBeVisible();

    // 4. Parámetros: cambiar un umbral y guardar; convención: guardar.
    await pagina.getByRole('link', { name: /4\. Parámetros/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Parámetros de cálculo' })).toBeVisible();
    await pagina.getByLabel('Valor residual (%)').fill('5');
    await pagina.getByRole('button', { name: 'Guardar parámetros' }).click();
    await expect(pagina.getByText('Parámetros guardados')).toBeVisible();
    await pagina.getByRole('button', { name: 'Guardar convención' }).click();
    await expect(pagina.getByRole('heading', { name: 'Parámetros de cálculo' })).toBeVisible();

    // 5. Inventario, un cálculo y el informe: las pantallas nuevas tampoco pueden romperse.
    await seccion(pagina, 'Inventario').click();
    await expect(pagina.getByRole('heading', { name: '1 · El barrido — PL-03' })).toBeVisible();
    await pagina.getByRole('link', { name: 'Barridos y servicios' }).click();
    await expect(pagina.getByRole('heading', { name: 'Historial de barridos' })).toBeVisible();
    await seccion(pagina, 'Calcular').click();
    await pagina.getByRole('button', { name: 'Calcular 50 bienes al 30/06/2025' }).click();
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toBeVisible();
    await seccion(pagina, 'Bajas').click();
    await expect(pagina.getByRole('heading', { name: 'Bajas registradas' })).toBeVisible();
    await seccion(pagina, 'Informe').click();
    await expect(pagina.getByRole('heading', { name: 'Vista previa' })).toBeVisible();

    expect(errores, errores.join('\n')).toEqual([]);
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
