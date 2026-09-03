/**
 * ADR-026 etapa 5 — del candidato a la propuesta y de la propuesta a la decisión
 * del Comité, sobre la aplicación real.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('proponer la baja de un candidato y recorrer la decisión del Comité', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-bajas-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    // Sin cálculo no hay candidatos: la bandeja lo dice y ofrece ir a calcular.
    await pagina.getByRole('link', { name: /^5. Bajas/ }).click();
    await expect(pagina.getByText('Ningún bien es candidato a baja')).toBeVisible();

    await pagina.getByRole('link', { name: 'Ir al cálculo' }).click();
    await pagina.getByRole('button', { name: 'Calcular', exact: true }).click();
    await expect(pagina.getByRole('button', { name: 'Recalcular' })).toBeVisible();

    await pagina.getByRole('link', { name: /^5. Bajas/ }).click();
    await expect(pagina.getByRole('columnheader', { name: 'Por qué es candidato' })).toBeVisible();

    // Proponer la baja del primer candidato.
    await pagina.getByRole('button', { name: 'Proponer baja' }).first().click();
    await expect(pagina.getByText('Esto no da de baja el bien')).toBeVisible();

    // RN-09-06: una justificación genérica no habilita el botón.
    await pagina.getByLabel('Justificación técnica').fill('Obsoleto');
    await expect(pagina.getByRole('button', { name: 'Proponer al Comité' })).toBeDisabled();

    await pagina.getByLabel('Justificación técnica').fill('Falla en tarjeta de control; la reparación no fue autorizada por costo frente al valor de reposición.');
    await pagina.getByRole('button', { name: 'Proponer al Comité' }).click();

    // La propuesta aparece con su efecto contable y su estado.
    await pagina.getByRole('link', { name: 'Propuestas' }).click();
    await expect(pagina.getByRole('heading', { name: 'Efecto contable de las bajas propuestas' })).toBeVisible();
    await expect(pagina.getByText('Pérdida a reconocer')).toBeVisible();
    await expect(pagina.getByText('Propuesto', { exact: true })).toBeVisible();

    // Recorrido del Comité: a revisión y luego rechazo con observación.
    await pagina.getByRole('button', { name: 'Enviar a revisión del Comité' }).click();
    await expect(pagina.getByText('En revisión', { exact: true })).toBeVisible();

    await pagina.getByRole('button', { name: 'Rechazar' }).click();
    await pagina.getByLabel('Observación del Comité').fill('El Comité ordena cotizar la reparación antes de decidir.');
    await pagina.getByRole('button', { name: 'Registrar el rechazo' }).click();
    await expect(pagina.getByText('Rechazado', { exact: true })).toBeVisible();
    await expect(pagina.getByText('El Comité ordena cotizar la reparación antes de decidir.')).toBeVisible();

    // Y el bien vuelve a la bandeja: está activo otra vez (RN-09-04).
    await pagina.getByRole('link', { name: 'Candidatos' }).click();
    await expect(pagina.getByRole('button', { name: 'Proponer baja' }).first()).toBeEnabled();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
