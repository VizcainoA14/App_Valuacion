/**
 * Etapa 6 — el informe declara lo que está calculado y decidido, y solo eso.
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
  gerente: 'Gerente Prueba',
  contador: 'Carlos Contador',
  tarjetaProfesionalContador: 'T.P. 12345-T',
  esDemostracion: false,
  ejercicio: 'Corte 2025',
  fechaCorte: '2025-06-30',
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
  totalDeterioro: comoCentavos(0),
  totalValorNeto: comoCentavos(1_238_255_577),
  porSemaforo: { VERDE: 1, AMARILLO: 0, NARANJA: 0, ROJO: 1 },
  subcuentas: [{ subcuenta: '167002', clase: 'Equipo médico-científico', bienes: 2, saldoAjustado: comoCentavos(2_373_928_000), depreciacionAcumulada: comoCentavos(1_135_672_423), valorNeto: comoCentavos(1_238_255_577) }],
  bajas: [],
  perdidaBajas: comoCentavos(0),
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

  it('sin bajas propuestas no inventa un total de pérdida', () => {
    expect(construirInformeHtml(BASE)).not.toContain('Pérdida total a reconocer');
  });
});

describe('datos del informe sobre el hospital de demostración', () => {
  it('se niega a generar el informe de un ejercicio sin calcular', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const ej = valor(await a.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    if (ej === undefined) throw new Error('sin ejercicio');

    const r = await a.registro.invocar('informe:previsualizar', { entidadId: demo.id, ejercicioId: ej.id });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.codigo).toBe('SIN_CALCULO');
      expect(r.error.mensaje).toContain('etapa 4');
    }
  });

  it('tras calcular, el informe trae los totales, el anexo y la marca de demostración', async () => {
    const a = await arnesPaso01();
    const demo = valor(await a.registro.invocar('demo:cargar', undefined));
    const ej = valor(await a.registro.invocar('ejercicio:listar', { entidadId: demo.id }))[0];
    if (ej === undefined) throw new Error('sin ejercicio');
    valor(await a.registro.invocar('calculo:ejecutar', { entidadId: demo.id, ejercicioId: ej.id }));

    const r = valor(await a.registro.invocar('informe:previsualizar', { entidadId: demo.id, ejercicioId: ej.id }));
    expect(r.bienes).toBe(50);
    expect(r.html).toContain('EJEMPLO — SIN VALIDEZ');
    expect(r.html).toContain('HOSPITAL DE DEMOSTRACIÓN');
    expect(r.html).toContain('Anexo · Listado depreciado bien por bien');
    expect(r.html).toContain('Consolidado por subcuenta');
    // El total del consolidado tiene que cuadrar con el del detalle (VAL-06-06).
    const resumen = valor(await a.registro.invocar('calculo:resumen', { ejercicioId: ej.id }));
    const esperado = (resumen.totalValorNetoLibros / 100).toLocaleString('es-CO', { minimumFractionDigits: 2 });
    expect(r.html).toContain(`$ ${esperado}`);
  });
});
