/**
 * El hospital obtiene los formatos DESDE la aplicación. Antes había que buscarlos
 * fuera, que es justo lo que impedía cederla sin acompañamiento.
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, seccion } from './_lanzar';

test('los formatos están dentro de la aplicación y se pueden descargar', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-formatos-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();

    // Formatos es alcanzable desde el inicio, sin haber iniciado ningún proceso.
    await seccion(pagina, 'Formatos').click();
    await expect(pagina.getByRole('heading', { name: 'Formatos para diligenciar' })).toBeVisible();

    // Las cinco que se diligencian están presentes en la instalación (ADR-028).
    await expect(pagina.getByText('Faltan archivos de plantilla en la instalación')).toBeHidden();
    await expect(pagina.getByRole('button', { name: 'Descargar', exact: true })).toHaveCount(5);
    await expect(pagina.getByRole('button', { name: 'Descargar los 5 formatos indispensables' })).toBeVisible();

    // Fuera de un proceso, se avisa de que saldrán sin listas desplegables.
    await expect(pagina.getByText('Formatos en blanco')).toBeVisible();

    // Los cinco que el hospital diligencia están agrupados por etapa y explicados.
    await expect(pagina.getByText('PL-03', { exact: true })).toBeVisible();
    await expect(pagina.getByText('SIN estos dos datos no se puede calcular la depreciación', { exact: false })).toBeVisible();

    // Dentro de un proceso, salen con sus catálogos y el aviso desaparece.
    await pagina.getByRole('link', { name: 'Valuación de Activos' }).click();
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();
    await seccion(pagina, 'Formatos').click();
    await expect(pagina.getByRole('heading', { name: 'Formatos para diligenciar' })).toBeVisible();
    await expect(pagina.getByText('Formatos en blanco')).toBeHidden();

    // Los formatos del proceso cuelgan de él: entrar en ellos no saca del proceso
    // (defecto reportado por el propietario el 2026-09-03).
    for (const nombre of ['Configurar', 'Inventario', 'Calcular', 'Bajas', 'Informe'] as const) {
      await expect(seccion(pagina, nombre)).toBeVisible();
    }

    // Y se puede volver a cualquiera de ellas y seguir trabajando.
    await seccion(pagina, 'Inventario').click();
    await expect(pagina.getByRole('heading', { name: '1 · El barrido — PL-03' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
