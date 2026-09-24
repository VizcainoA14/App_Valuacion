/**
 * Del candidato a la baja registrada, sobre la aplicación real (ADR-028, ADR-029). La
 * aplicación no aprueba nada: registra lo que el hospital decidió, con una
 * justificación individual, y una baja equivocada se anula en vez de borrarse.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, seccion } from './_lanzar';

test('registrar la baja de un candidato y anularla', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-bajas-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    // Sin cálculo no hay candidatos: la pantalla lo dice y ofrece ir a calcular.
    await seccion(pagina, 'Bajas').click();
    await expect(pagina.getByText('Todavía no se ha calculado nada')).toBeVisible();
    await pagina.getByRole('link', { name: 'Ir a calcular' }).click();
    await pagina.getByRole('button', { name: 'Calcular 50 bienes al 30/06/2025' }).click();
    await expect(pagina.locator('[data-prueba="calculo-hecho"]')).toBeVisible();

    await seccion(pagina, 'Bajas').click();
    await expect(pagina.getByRole('columnheader', { name: 'Por qué es candidato' })).toBeVisible();

    // Registrar la baja del primer candidato: sin comité ni acta.
    await pagina.getByRole('button', { name: 'Registrar baja' }).first().click();
    // RN-09-06: una justificación genérica no habilita el botón.
    await pagina.getByLabel('Justificación').fill('Obsoleto');
    const registrar = pagina.getByRole('dialog').getByRole('button', { name: 'Registrar baja' });
    await expect(registrar).toBeDisabled();
    await pagina.getByLabel('Justificación').fill('Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición.');
    await pagina.getByLabel('Documento que la aprobó').fill('Resolución 045 de 2025');
    await registrar.click();

    // Queda en las bajas registradas, con el documento anotado.
    await expect(pagina.getByText('Resolución 045 de 2025')).toBeVisible();

    // Una baja equivocada se anula, con motivo.
    await pagina.getByRole('button', { name: 'Anular' }).first().click();
    await pagina.getByLabel('Motivo').fill('Se registró sobre el bien equivocado.');
    await pagina.getByRole('button', { name: 'Anular baja' }).click();
    await expect(pagina.getByText('No hay bajas registradas.')).toBeVisible();
    await pagina.getByLabel('Mostrar anuladas').check();
    await expect(pagina.getByText(/^Anulada /)).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
