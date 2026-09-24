/**
 * Iniciar un proceso y configurarlo de punta a punta en la app real: nombre,
 * fecha de corte y hospital; sedes y servicios; y queda listo para calcular.
 * No hay acta que confirmar (ADR-028, ADR-029).
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('configuración completa: proceso → sedes y servicios → listo para calcular', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-configuracion-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // Lo primero que se ve son los procesos; sin ninguno, se inicia el primero.
    await expect(pagina.getByRole('heading', { name: 'Procesos de valuación' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Iniciar un proceso nuevo' }).click();
    await expect(pagina.getByRole('heading', { name: 'Iniciar un proceso' })).toBeVisible();
    await pagina.getByLabel('Nombre del proceso').fill('Valuación cierre 2025');
    await pagina.getByLabel('Fecha de corte').fill('2025-12-31');

    await pagina.getByLabel('Razón social').fill('E.S.E Hospital San Vicente');
    await pagina.getByLabel('NIT').fill('890000000-1');
    await pagina.getByLabel('Municipio').fill('Popayán');
    await pagina.getByLabel('Departamento').fill('Cauca');
    await pagina.getByLabel('Nombre del gerente').fill('Gerente Prueba');
    await pagina.getByLabel('Dirección de la sede principal').fill('Calle 1 # 2-3');
    // Ya no se piden los datos del contador: el informe no lleva firmas.
    await expect(pagina.getByLabel('Nombre del contador')).toHaveCount(0);
    await pagina.getByRole('button', { name: 'Iniciar el proceso y continuar' }).click();

    // La barra lateral es la del proceso: su nombre y su fecha de corte.
    await expect(pagina.locator('[data-prueba="proceso-actual"]')).toContainText('Valuación cierre 2025');
    await expect(pagina.locator('[data-prueba="proceso-actual"]')).toContainText('31/12/2025');

    // Cae en sedes y servicios; el asistente muestra el progreso de las cuatro partes.
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();
    await expect(pagina.getByRole('navigation', { name: 'Progreso de la configuración' })).toContainText('de 4 completos');
    await expect(pagina.getByText('La configuración está lista')).toBeHidden();

    // Los nombres accesibles excluyen el asterisco de "obligatorio" (aria-hidden).
    await pagina.getByRole('button', { name: 'Nueva sede' }).click();
    await pagina.getByRole('textbox', { name: 'Código', exact: true }).fill('01');
    await pagina.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Sede principal');
    await pagina.getByRole('textbox', { name: 'Dirección', exact: true }).fill('Calle 5 # 4-20');
    await pagina.getByRole('textbox', { name: 'Municipio', exact: true }).fill('Popayán');
    await pagina.getByRole('button', { name: 'Guardar sede' }).click();
    await expect(pagina.getByRole('heading', { name: /Sede principal/ })).toBeVisible();

    await pagina.getByRole('button', { name: 'Servicio' }).click();
    await pagina.getByRole('textbox', { name: 'Código', exact: true }).fill('URG');
    await pagina.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Urgencias');
    await pagina.getByRole('button', { name: 'Guardar servicio' }).click();
    await expect(pagina.getByText('Urgencias')).toBeVisible();

    // Con sede y servicio, la configuración está lista y lo dice, con el siguiente paso.
    await expect(pagina.getByText('La configuración está lista')).toBeVisible();
    await expect(pagina.getByRole('link', { name: 'Inventario', exact: true })).toBeVisible();

    // Parámetros: ya no hay casilla de "confirmado por acta".
    await pagina.getByRole('link', { name: /4\. Parámetros/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Parámetros de cálculo' })).toBeVisible();
    await expect(pagina.getByLabel(/confirmado por acta/)).toHaveCount(0);
    await pagina.getByLabel('Valor residual (%)').fill('5');
    await pagina.getByRole('button', { name: 'Guardar parámetros' }).click();
    await expect(pagina.getByText('Parámetros guardados')).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
