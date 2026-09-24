/**
 * Eliminar un proceso en curso desde la aplicación: se permite mientras no
 * tenga inventario, y la demostración se borra con su propio botón.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('el proceso sin inventario se elimina; la demostración no ofrece ese botón', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-eliminar-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // ── Un proceso recién iniciado sí se puede eliminar ──
    await pagina.getByRole('button', { name: 'Iniciar un proceso nuevo' }).click();
    await pagina.getByLabel('Nombre del proceso').fill('Proceso por error');
    await pagina.getByLabel('Fecha de corte').fill('2025-12-31');
    await pagina.getByLabel('Razón social').fill('E.S.E Hospital Creado Por Error');
    await pagina.getByLabel('NIT').fill('999888777-1');
    await pagina.getByLabel('Municipio').fill('Popayán');
    await pagina.getByLabel('Departamento').fill('Cauca');
    await pagina.getByLabel('Nombre del gerente').fill('Gerente Prueba');
    await pagina.getByLabel('Dirección de la sede principal').fill('Calle 1 # 2-3');
    await pagina.getByRole('button', { name: 'Iniciar el proceso y continuar' }).click();
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();

    await pagina.getByRole('link', { name: 'Valuación de Activos' }).click();
    await expect(pagina.getByRole('main').getByText('E.S.E Hospital Creado Por Error')).toBeVisible();

    await pagina.getByRole('button', { name: 'Eliminar Proceso por error' }).click();
    await expect(pagina.getByRole('heading', { name: /¿Eliminar «Proceso por error»\?/ })).toBeVisible();

    // Sin motivo no se puede confirmar: queda en bitácora.
    await expect(pagina.getByRole('button', { name: 'Sí, eliminar' })).toBeDisabled();
    await pagina.getByLabel('Motivo').fill('Proceso iniciado por error durante una prueba.');
    await pagina.getByRole('button', { name: 'Sí, eliminar' }).click();

    await expect(pagina.getByRole('main').getByText('E.S.E Hospital Creado Por Error')).toBeHidden();
    await expect(pagina.getByText('Todavía no hay ningún proceso')).toBeVisible();

    // ── La demostración trae inventario y tiene su propio botón de borrado ──
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await expect(pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ })).toBeVisible();
    // La demostración se borra con su propio botón, así que no ofrece el de eliminar.
    await expect(pagina.getByRole('button', { name: /^Eliminar / })).toBeHidden();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
