/**
 * ADR-026 etapa 2 — el hospital obtiene los formatos DESDE la aplicación. Antes
 * había que buscarlos fuera, que es justo lo que impedía cederla sin acompañamiento.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp } from './_lanzar';

test('los formatos están dentro de la aplicación y se pueden descargar', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-formatos-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // La etapa 2 es alcanzable sin haber configurado nada todavía.
    await pagina.getByRole('link', { name: /^2\. Formatos/ }).click();
    await expect(pagina.getByRole('heading', { name: 'Formatos para diligenciar' })).toBeVisible();

    // Las 28 plantillas de ANEXO_A están presentes en la instalación.
    await expect(pagina.getByText('Faltan archivos de plantilla en la instalación')).toBeHidden();
    await expect(pagina.getByRole('button', { name: 'Descargar', exact: true })).toHaveCount(28);
    await expect(pagina.getByRole('button', { name: 'Descargar los 5 formatos indispensables' })).toBeVisible();

    // Sin entidad, se avisa de que saldrán sin listas desplegables.
    await expect(pagina.getByText('Todavía no hay una entidad seleccionada')).toBeVisible();

    // Los cinco que el hospital diligencia están agrupados por etapa y explicados.
    await expect(pagina.getByText('PL-03')).toBeVisible();
    await expect(pagina.getByText('SIN estos dos datos no se puede calcular la depreciación', { exact: false })).toBeVisible();

    // Con la demostración cargada, el aviso desaparece.
    await pagina.getByRole('link', { name: 'Valuación de Activos' }).click();
    await pagina.getByRole('button', { name: 'Cargar hospital de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();
    await pagina.getByRole('link', { name: /^2\. Formatos/ }).click();
    await expect(pagina.getByText('Todavía no hay una entidad seleccionada')).toBeHidden();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
