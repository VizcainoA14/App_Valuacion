/**
 * Recorrido completo del hospital de demostración pulsando cada "Guardar" del
 * paso 01. Cualquier excepción del renderer (pantalla en blanco) hace fallar el test.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

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

    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();
    await expect(pagina.locator('[data-prueba="banda-demo"]')).toBeVisible();

    // 1. Datos de la entidad → guardar cambios.
    await pagina.getByRole('link', { name: /1\. Entidad/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Datos de la entidad' })).toBeVisible();
    await pagina.getByLabel('Teléfono').fill('(600) 111 1111');
    await pagina.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(pagina.getByText('Cambios guardados.')).toBeVisible();
    await expect(pagina.getByRole('heading', { name: 'Datos de la entidad' })).toBeVisible();

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

    // 5. Ejercicio: avanzar (sin alert bloqueante), cambiar corte con justificación.
    await pagina.getByRole('link', { name: /5\. Ejercicio/ }).click();
    await expect(pagina.getByRole('button', { name: 'Avanzar al paso 02' })).toBeEnabled();
    await pagina.getByRole('button', { name: 'Avanzar al paso 02' }).click();
    // El paso 02 abre por "Importar": lo primero que hay que hacer es cargar PL-03.
    await expect(pagina.getByRole('heading', { name: '1 · Los bienes — PL-03' })).toBeVisible();

    await pagina.getByRole('link', { name: /^1. Configurar/ }).click();
    await pagina.getByRole('link', { name: /5\. Ejercicio/ }).click();
    await pagina.getByRole('button', { name: 'Cambiar corte' }).click();
    await pagina.getByLabel('Nueva fecha de corte').fill('2025-05-31');
    await pagina.getByLabel('Justificación').fill('Prueba de recorrido');
    await pagina.getByRole('button', { name: 'Cambiar fecha' }).click();
    await expect(pagina.getByText('31/05/2025')).toBeVisible();

    expect(errores, errores.join('\n')).toEqual([]);
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
