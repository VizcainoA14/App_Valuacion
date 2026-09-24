/**
 * El informe declara lo que un corte calculó, y solo eso (ADR-028).
 *
 * La generación del PDF necesita Electron y se prueba en E2E; aquí se prueba lo
 * que decide qué dice el documento, que es lo que puede estar mal en silencio.
 */
import { describe, expect, it } from 'vitest';
import { arnesPaso01, valor } from '../configuracion/pruebas';
import { construirInformeHtml, type DatosInforme } from './plantilla/informeHtml';
import { comoCentavos } from '../../../compartido/tipos/basicos';

const BASE: DatosInforme = {
  razonSocial: 'E.S.E Hospital San Vicente',
  nit: '890000000-1',
  municipio: 'Popayán',
  departamento: 'Cauca',
  esDemostracion: false,
  nombreProceso: 'Valuación cierre primer semestre',
  fechaCorte: '2025-06-30',
  calculadoEn: '2025-09-02 09:30',
  generadoEn: '2025-09-02 10:00',
  metodoConteo: 'dias_exactos',
  metodoDepreciacion: 'linea_recta',
  valorResidualPct: 0,
  depreciaMesAdquisicion: true,
  usaPuestaEnServicio: false,
  bienesConsiderados: 3,
  conDepreciacion: 2,
  sinDepreciacion: 1,
  noAplicaDepreciacion: 0,
  totalSaldoAjustado: comoCentavos(2_373_928_000),
  totalDepreciacion: comoCentavos(1_135_672_423),
  totalValorNeto: comoCentavos(1_238_255_577),
  porSemaforo: { VERDE: 1, AMARILLO: 0, NARANJA: 0, ROJO: 1 },
  subcuentas: [{ subcuenta: '167002', clase: 'Equipo médico-científico', bienes: 2, saldoAjustado: comoCentavos(2_373_928_000), depreciacionAcumulada: comoCentavos(1_135_672_423), valorNeto: comoCentavos(1_238_255_577) }],
  candidatos: [],
  bajas: [],
  excluidos: [],
  detalle: [],
};

describe('maqueta del informe', () => {
  it('RF-06-08: declara el método aplicado en el encabezado del documento', () => {
    const html = construirInformeHtml(BASE);
    expect(html).toContain('Método aplicado');
    expect(html).toContain('Días exactos');
    expect(html).toContain('Línea recta');
  });

  it('formatea el dinero en pesos colombianos, desde centavos', () => {
    const html = construirInformeHtml(BASE);
    // 2.373.928.000 centavos = $ 23.739.280,00
    expect(html).toContain('$ 23.739.280,00');
    expect(html).toContain('$ 11.356.724,23');
  });

  it('escapa lo que escribe el hospital: un nombre con `<` no rompe el documento', () => {
    const html = construirInformeHtml({ ...BASE, razonSocial: 'E.S.E <script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('la marca de demostración solo aparece en el hospital ficticio', () => {
    expect(construirInformeHtml(BASE)).not.toContain('SIN VALIDEZ');
    expect(construirInformeHtml({ ...BASE, esDemostracion: true })).toContain('EJEMPLO — SIN VALIDEZ');
  });

  it('lo que quedó fuera se relaciona con su motivo, no se omite', () => {
    const html = construirInformeHtml({ ...BASE, excluidos: [{ codigo: 'B-9', ambito: 'Depreciación', motivo: 'Sin costo de adquisición' }] });
    expect(html).toContain('Bienes fuera del cálculo');
    expect(html).toContain('Sin costo de adquisición');
    expect(html).toContain('B-9');
  });

  it('no lleva bloque de firmas: es el soporte de cálculo, no el acto que lo adopta', () => {
    const html = construirInformeHtml(BASE);
    expect(html).not.toContain('class="firmas"');
    expect(html).not.toContain('T.P.');
    // Y dice dónde va la firma, para que nadie lo presente como si fuera el acto.
    expect(html).toContain('la entidad lo adopta mediante su propio acto');
  });

  it('los candidatos a baja llevan sus motivos', () => {
    const html = construirInformeHtml({
      ...BASE,
      candidatos: [{ codigo: 'B-7', descripcion: 'Monitor', clase: 'Equipo médico', indice: 1.2345, motivos: ['Superó su vida útil técnica: índice de obsolescencia 1.2345.'], valorNeto: comoCentavos(0) }],
    });
    expect(html).toContain('Candidatos a baja');
    expect(html).toContain('Superó su vida útil técnica');
    expect(html).toContain('1.2345');
  });
});

describe('datos del informe sobre el hospital de demostración', () => {
  it('sin un corte no hay informe: se pide el de un corte que existe', async () => {
    const a = await arnesPaso01();
    const r = await a.registro.invocar('informe:previsualizar', { corteId: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('CORTE_INEXISTENTE');
  });

  it('el informe de un corte trae los totales, el anexo y la marca de demostración', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const { corte } = valor(await a.registro.invocar('calculo:ejecutar', { procesoId: demo.id, fechaCorte: '2025-06-30', descripcion: null }));

    const r = valor(await a.registro.invocar('informe:previsualizar', { corteId: corte.id }));
    expect(r.bienes).toBe(50);
    expect(r.html).toContain('EJEMPLO — SIN VALIDEZ');
    expect(r.html).toContain('HOSPITAL DE DEMOSTRACIÓN');
    expect(r.html).toContain('Anexo · Listado depreciado bien por bien');
    expect(r.html).toContain('Consolidado por subcuenta');
    // El total del consolidado tiene que cuadrar con el del detalle (VAL-06-06).
    const resumen = valor(await a.registro.invocar('calculo:resumen', { corteId: corte.id }));
    const esperado = (resumen.totalValorNetoLibros / 100).toLocaleString('es-CO', { minimumFractionDigits: 2 });
    expect(r.html).toContain(`$ ${esperado}`);
  });
});

describe('un informe regenerado dice lo mismo que el primero', () => {
  it('cambiar el inventario después del corte no altera su informe', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const { corte } = valor(await a.registro.invocar('calculo:ejecutar', { procesoId: demo.id, fechaCorte: '2025-06-30', descripcion: null }));
    const antes = valor(await a.registro.invocar('informe:previsualizar', { corteId: corte.id }));

    // Se corrige un costo después del corte: el corte no se entera, el siguiente sí.
    a.sqlite.prepare('UPDATE hoja_vida SET costo_adquisicion_cent = costo_adquisicion_cent * 2').run();
    const despues = valor(await a.registro.invocar('informe:previsualizar', { corteId: corte.id }));
    const sinHora = (html: string): string => html.replace(/generado el [^.]+\./, '');
    expect(sinHora(despues.html)).toBe(sinHora(antes.html));
  });
});
