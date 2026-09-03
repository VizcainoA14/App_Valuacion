/**
 * T-B-10 — criterio de verificación del backlog, de punta a punta en la app real:
 * se crea una entidad, se configura y se abre un ejercicio con parámetros
 * congelados; el panel de validaciones bloquea el avance hasta cumplirlas.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('paso 01 completo: entidad → sedes → parámetros → ejercicio → puede avanzar', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-paso01-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // Selector de entidades vacío → asistente de nueva entidad.
    await expect(pagina.getByRole('heading', { name: 'Entidades' })).toBeVisible();
    await pagina.getByRole('button', { name: 'Nueva entidad' }).click();
    await expect(pagina.getByRole('heading', { name: 'Nueva entidad' })).toBeVisible();

    await pagina.getByLabel('Razón social').fill('E.S.E Hospital San Vicente');
    await pagina.getByLabel('NIT').fill('890000000-1');
    await pagina.getByLabel('Municipio').fill('Popayán');
    await pagina.getByLabel('Departamento').fill('Cauca');
    await pagina.getByLabel('Nombre del gerente').fill('Gerente Prueba');
    await pagina.getByLabel('Dirección de la sede principal').fill('Calle 1 # 2-3');
    await pagina.getByRole('button', { name: 'Crear entidad y continuar' }).click();

    // Cae en sedes y servicios; el asistente muestra el progreso.
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();
    await expect(pagina.getByRole('navigation', { name: 'Progreso de la parametrización' })).toContainText('de 5 completos');

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

    // Ejercicio: antes de crearlo y confirmar el método, no se puede avanzar.
    await pagina.getByRole('link', { name: /5\. Ejercicio/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Ejercicio de valuación' })).toBeVisible();
    await expect(pagina.getByRole('button', { name: 'Avanzar al paso 02' })).toBeDisabled();
    await expect(pagina.locator('[data-validacion="VAL-01-06"]')).toHaveAttribute('data-cumple', 'false');
    await expect(pagina.locator('[data-validacion="VAL-01-07"]')).toHaveAttribute('data-cumple', 'false');

    // Responsable que abre el ejercicio (TR-12).
    await pagina.getByRole('button', { name: 'Nuevo responsable' }).click();
    await pagina.getByLabel('Nombre completo').fill('Ana Coordinadora');
    await pagina.getByLabel('Documento de identidad').fill('1000000000');
    await pagina.getByLabel('Cargo').fill('Líder de valuación');
    await pagina.getByRole('button', { name: 'Guardar responsable' }).click();
    await expect(pagina.getByText('Ana Coordinadora')).toBeVisible();

    await pagina.getByRole('button', { name: 'Nuevo ejercicio' }).click();
    await pagina.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Valuación corte junio 2025');
    await pagina.getByLabel('Fecha de corte').fill('2025-06-30');
    await pagina.getByLabel('Responsable que abre el ejercicio').selectOption({ index: 1 });
    await pagina.getByRole('button', { name: 'Crear ejercicio' }).click();
    await expect(pagina.getByText('Valuación corte junio 2025')).toBeVisible();
    await expect(pagina.getByText(/dias_exactos \(sin confirmar\)/)).toBeVisible();
    await expect(pagina.locator('[data-validacion="VAL-01-06"]')).toHaveAttribute('data-cumple', 'true');
    await expect(pagina.getByRole('button', { name: 'Avanzar al paso 02' })).toBeDisabled();

    // Confirmar el método de conteo por acta (CT-02) → VAL-01-07 cumple → se puede avanzar.
    await pagina.getByRole('link', { name: /4\. Parámetros/ }).click();
    await pagina.getByLabel(/confirmado por acta/).check();
    await pagina.getByRole('button', { name: 'Guardar parámetros' }).click();
    await expect(pagina.getByText('Parámetros guardados')).toBeVisible();

    await pagina.getByRole('link', { name: /5\. Ejercicio/ }).click();
    await expect(pagina.locator('[data-validacion="VAL-01-07"]')).toHaveAttribute('data-cumple', 'true');
    await expect(pagina.getByText(/dias_exactos \(confirmado\)/)).toBeVisible(); // RN-01-01: copia refrescada en ABIERTO
    await expect(pagina.getByRole('button', { name: 'Avanzar al paso 02' })).toBeEnabled();
    await expect(pagina.getByText('Todas las bloqueantes cumplidas')).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
