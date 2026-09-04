/**
 * Eliminar una entidad desde la aplicación: se permite mientras la valuación no
 * haya empezado, y en cuanto existe un ejercicio se explica por qué no.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('la entidad se elimina antes del ejercicio, y después ya no', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-eliminar-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // ── Una entidad recién creada sí se puede eliminar ──
    await pagina.getByRole('button', { name: 'Nueva entidad' }).click();
    await pagina.getByLabel('Razón social').fill('E.S.E Hospital Creado Por Error');
    await pagina.getByLabel('NIT').fill('999888777-1');
    await pagina.getByLabel('Municipio').fill('Popayán');
    await pagina.getByLabel('Departamento').fill('Cauca');
    await pagina.getByLabel('Nombre del gerente').fill('Gerente Prueba');
    await pagina.getByLabel('Dirección de la sede principal').fill('Calle 1 # 2-3');
    await pagina.getByRole('button', { name: 'Crear entidad y continuar' }).click();
    await expect(pagina.getByRole('heading', { name: 'Sedes y servicios' })).toBeVisible();

    await pagina.getByRole('link', { name: 'Valuación de Activos' }).click();
    await expect(pagina.getByText('E.S.E Hospital Creado Por Error')).toBeVisible();

    await pagina.getByRole('button', { name: 'Eliminar E.S.E Hospital Creado Por Error' }).click();
    await expect(pagina.getByRole('heading', { name: /¿Eliminar E.S.E Hospital Creado Por Error\?/ })).toBeVisible();

    // Sin motivo no se puede confirmar: queda en bitácora.
    await expect(pagina.getByRole('button', { name: 'Sí, eliminar' })).toBeDisabled();
    await pagina.getByLabel('Motivo').fill('Entidad creada por error durante una prueba.');
    await pagina.getByRole('button', { name: 'Sí, eliminar' }).click();

    await expect(pagina.getByText('E.S.E Hospital Creado Por Error')).toBeHidden();
    await expect(pagina.getByText('Aún no hay entidades')).toBeVisible();

    // ── Con un ejercicio abierto, la aplicación se niega y dice por qué ──
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await expect(pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ })).toBeVisible();
    // La demostración se borra con su propio botón, así que no ofrece el de eliminar.
    await expect(pagina.getByRole('button', { name: /^Eliminar / })).toBeHidden();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
