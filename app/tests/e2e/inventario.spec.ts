/**
 * T-C-02 — `<TablaDatos>` sobre el inventario de la demostración: virtualiza,
 * ordena y filtra contra el main, y selecciona todo el filtro (no solo la página).
 */
import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzarApp, seccion } from './_lanzar';

test('inventario: carga, listado que filtra, ordena y selecciona, y servicios barridos', async () => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'valuacion-e2e-inv-'));
  const app = await lanzarApp({ argumentos: [`--user-data=${userData}`] });
  try {
    const pagina = await app.firstWindow();
    await pagina.getByRole('button', { name: 'Cargar proceso de demostración' }).click();
    await pagina.getByRole('link', { name: /HOSPITAL DE DEMOSTRACIÓN/ }).click();

    // La sección abre por "Cargar": con la base vacía, un listado vacío no dice
    // qué hacer a continuación.
    await seccion(pagina, 'Inventario').click();
    await expect(pagina.getByRole('heading', { name: '1 · El barrido — PL-03' })).toBeVisible();
    await expect(pagina.getByRole('heading', { name: '2 · Fecha y costo de adquisición — PL-05' })).toBeVisible();
    await expect(pagina.getByRole('button', { name: 'Importar PL-03' })).toBeVisible();
    await expect(pagina.getByRole('button', { name: 'Importar PL-05' })).toBeVisible();
    // La demostración ya trae inventario, así que el avance es visible.
    await expect(pagina.getByText('50 bienes')).toBeVisible();

    // `exact` porque la propia pantalla ofrece además "Ver el listado de bienes".
    await pagina.getByRole('link', { name: 'Listado de bienes', exact: true }).click();
    await expect(pagina.getByRole('heading', { name: 'Bienes del inventario' })).toBeVisible();
    await expect(pagina.getByText('50 registros')).toBeVisible();

    // Virtualización: con 50 filas y alto fijo, no se pintan todas a la vez.
    const filasPintadas = await pagina.getByRole('row').count();
    expect(filasPintadas).toBeLessThan(50);

    // Filtro por texto, resuelto en el main.
    await pagina.getByRole('textbox', { name: 'Buscar' }).fill('monitor');
    await pagina.getByRole('button', { name: 'Buscar' }).click();
    await expect(pagina.getByText(/^[1-9]\d? registros$/)).toBeVisible();
    const conFiltro = Number((await pagina.getByText(/registros/).first().textContent())?.match(/\d+/)?.[0] ?? '0');
    expect(conFiltro).toBeGreaterThan(0);
    expect(conFiltro).toBeLessThan(50);

    // Filtro sin resultados: mensaje distinto al de "no hay registros".
    await pagina.getByRole('textbox', { name: 'Buscar' }).fill('inexistentexyz');
    await pagina.getByRole('button', { name: 'Buscar' }).click();
    await expect(pagina.getByText('Ningún registro coincide con los filtros')).toBeVisible();

    await pagina.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(pagina.getByText('50 registros')).toBeVisible();

    // Orden por columna (el main reordena; cambia la primera fila).
    // gridcell 0 es la casilla de selección; la 1 es el código institucional.
    const celdaCodigo = pagina.getByRole('gridcell').nth(1);
    const primeraPorCodigo = (await celdaCodigo.textContent()) ?? '';
    expect(primeraPorCodigo).not.toBe('');
    await pagina.getByRole('button', { name: /^Placa/ }).click();
    await pagina.getByRole('button', { name: /^Placa/ }).click(); // descendente
    await expect(celdaCodigo).not.toHaveText(primeraPorCodigo);

    // Selección: con 50 bienes cabe una sola página, así que marcar los visibles
    // ya cubre el filtro completo y el atajo "seleccionar los N del filtro" no
    // aparece (solo tiene sentido cuando falta traer páginas; probado en unitarios).
    await pagina.getByRole('checkbox', { name: 'Seleccionar los registros visibles' }).check();
    await expect(pagina.getByText('50 seleccionados')).toBeVisible();
    await expect(pagina.getByRole('button', { name: /Seleccionar los \d+ del filtro/ })).toBeHidden();
    await pagina.getByRole('button', { name: 'Limpiar selección' }).click();
    await expect(pagina.getByText('50 seleccionados')).toBeHidden();

    // Servicios: la demostración tiene bienes en los 8 servicios activos.
    await pagina.getByRole('link', { name: 'Barridos y servicios' }).click();
    await expect(pagina.getByRole('heading', { name: 'Barridos y servicios' }).first()).toBeVisible();
    await expect(pagina.getByText('8 de 8 servicios activos con bienes · 50 bienes vigentes')).toBeVisible();
    // Sus bienes no vinieron de un barrido, así que el historial está vacío.
    await expect(pagina.getByText('Todavía no se ha importado ningún barrido.')).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
