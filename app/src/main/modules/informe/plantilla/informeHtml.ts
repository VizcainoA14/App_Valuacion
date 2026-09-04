/**
 * El informe de valuación, en HTML listo para imprimir (TR-05).
 *
 * Función pura: datos → cadena. Se puede probar sin Electron, y es la misma
 * maqueta que ve el usuario en pantalla y la que sale en el PDF.
 *
 * Dos exigencias de `/Teoria` mandan sobre el diseño:
 *   RF-06-08  el método de depreciación aplicado va **en el encabezado**
 *   ANEXO_C   lo no calculado se declara con su motivo, nunca como un cero
 */
import type { Centavos } from '../../../../compartido/tipos/basicos';

export interface FilaDetalleInforme {
  readonly codigo: string;
  readonly descripcion: string;
  readonly clase: string;
  readonly servicio: string;
  readonly fechaAdquisicion: string | null;
  readonly saldoAjustado: Centavos | null;
  readonly depreciacionAcumulada: Centavos | null;
  readonly valorNeto: Centavos | null;
  readonly indice: number | null;
  readonly semaforo: string | null;
}

export interface FilaSubcuentaInforme {
  readonly subcuenta: string;
  readonly clase: string;
  readonly bienes: number;
  readonly saldoAjustado: Centavos;
  readonly depreciacionAcumulada: Centavos;
  readonly valorNeto: Centavos;
}

export interface FilaBajaInforme {
  readonly codigo: string;
  readonly descripcion: string;
  readonly causal: string;
  readonly justificacion: string;
  readonly especialista: string;
  readonly estado: string;
  readonly valorNeto: Centavos;
  readonly perdida: Centavos;
}

export interface FilaExcluidaInforme {
  readonly codigo: string;
  readonly ambito: string;
  readonly motivo: string;
}

export interface DatosInforme {
  readonly razonSocial: string;
  readonly nit: string;
  readonly municipio: string;
  readonly departamento: string;
  readonly gerente: string;
  /** ADR-027: los dos firmantes salen de los datos de la entidad. */
  readonly contador: string | null;
  readonly tarjetaProfesionalContador: string | null;
  readonly esDemostracion: boolean;
  readonly ejercicio: string;
  readonly fechaCorte: string;
  readonly generadoEn: string;
  readonly metodoConteo: string;
  readonly metodoDepreciacion: string;
  readonly valorResidualPct: number;
  readonly depreciaMesAdquisicion: boolean;
  readonly usaPuestaEnServicio: boolean;
  readonly bienesConsiderados: number;
  readonly conDepreciacion: number;
  readonly sinDepreciacion: number;
  readonly noAplicaDepreciacion: number;
  readonly totalSaldoAjustado: Centavos;
  readonly totalDepreciacion: Centavos;
  readonly totalDeterioro: Centavos;
  readonly totalValorNeto: Centavos;
  readonly porSemaforo: Readonly<Record<string, number>>;
  readonly subcuentas: readonly FilaSubcuentaInforme[];
  readonly bajas: readonly FilaBajaInforme[];
  readonly perdidaBajas: Centavos;
  readonly excluidos: readonly FilaExcluidaInforme[];
  readonly detalle: readonly FilaDetalleInforme[];
}

/** Los cinco caracteres que romperían el HTML si un dato del hospital los trae. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** es-CO sin depender del `Intl` del renderer: el main formatea igual que la pantalla. */
function dinero(centavos: Centavos | null): string {
  if (centavos === null) return '—';
  const negativo = centavos < 0;
  const entero = Math.trunc(Math.abs(centavos) / 100);
  const decimales = String(Math.abs(centavos) % 100).padStart(2, '0');
  const miles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}$ ${miles},${decimales}`;
}

function entero(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fecha(iso: string | null): string {
  if (iso === null || iso === '') return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

const ETIQUETA_METODO: Readonly<Record<string, string>> = {
  mes_completo: 'Meses calendario completos',
  dias_exactos: 'Días exactos (÷ 365,25 × 12)',
  fraccion_anual: 'Fracción anual (÷ 365,25 × 12)',
  linea_recta: 'Línea recta',
};

const etiqueta = (v: string): string => ETIQUETA_METODO[v] ?? v;

function tabla(encabezados: readonly string[], filas: readonly (readonly string[])[], alineadasDerecha: readonly number[] = []): string {
  if (filas.length === 0) return '<p class="vacio">Sin registros.</p>';
  const th = encabezados.map((h, i) => `<th${alineadasDerecha.includes(i) ? ' class="der"' : ''}>${esc(h)}</th>`).join('');
  const tr = filas
    .map((f) => `<tr>${f.map((c, i) => `<td${alineadasDerecha.includes(i) ? ' class="der"' : ''}>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

const ESTILOS = `
  @page { size: Letter; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; color: #1a1a1a; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  h2 { font-size: 11pt; margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 1.5pt solid #1a3a5c; page-break-after: avoid; }
  h3 { font-size: 9.5pt; margin: 4mm 0 1.5mm; page-break-after: avoid; }
  p { margin: 0 0 2mm; }
  .membrete { border-bottom: 2pt solid #1a3a5c; padding-bottom: 3mm; margin-bottom: 4mm; }
  .membrete .entidad { font-size: 13pt; font-weight: 600; color: #1a3a5c; }
  .membrete .datos { color: #555; }
  .demo { background: #fff3cd; border: 1pt solid #b8860b; color: #664d03; padding: 2mm 3mm; margin-bottom: 4mm; font-weight: 600; text-align: center; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
  th, td { border: 0.5pt solid #c8c8c8; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
  th { background: #eef2f6; font-weight: 600; }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  .der { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { font-weight: 700; background: #eef2f6 !important; }
  .vacio { color: #666; font-style: italic; }
  .nota { color: #555; font-size: 8.5pt; }
  .mono { font-family: 'Consolas', 'Courier New', monospace; }
  .firmas { margin-top: 12mm; page-break-inside: avoid; }
  .firmas td { border: none; padding-top: 12mm; text-align: center; }
  .firmas .linea { border-top: 0.5pt solid #1a1a1a; padding-top: 1mm; }
  .anexo { page-break-before: always; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`;

export function construirInformeHtml(d: DatosInforme): string {
  const semaforos = ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'];

  const resumenContable = tabla(
    ['Concepto', 'Valor'],
    [
      ['Saldo final ajustado (costo + adiciones)', dinero(d.totalSaldoAjustado)],
      ['(−) Depreciación acumulada', dinero(d.totalDepreciacion)],
      ['(−) Deterioro reconocido', dinero(d.totalDeterioro)],
      ['<strong>Valor neto en libros</strong>', `<strong>${dinero(d.totalValorNeto)}</strong>`],
    ],
    [1],
  );

  const cobertura = tabla(
    ['Bienes', 'Cantidad'],
    [
      ['Considerados en el ejercicio (sin los dados de baja)', entero(d.bienesConsiderados)],
      ['Con depreciación calculada', entero(d.conDepreciacion)],
      ['Sin depreciación por datos incompletos', entero(d.sinDepreciacion)],
      ['No depreciables o de terceros', entero(d.noAplicaDepreciacion)],
    ],
    [1],
  );

  const vidaUtil = tabla(
    ['Semáforo', 'Bienes', 'Significado'],
    semaforos.map((s) => [
      esc(s),
      entero(d.porSemaforo[s] ?? 0),
      esc(
        s === 'VERDE'
          ? 'Menos de la mitad de su vida útil'
          : s === 'AMARILLO'
            ? 'Entre la mitad y el umbral de alerta'
            : s === 'NARANJA'
              ? 'Cerca del fin de su vida útil'
              : 'Superó su vida útil técnica',
      ),
    ]),
    [1],
  );

  const subcuentas = tabla(
    ['Subcuenta', 'Clase de activo', 'Bienes', 'Saldo ajustado', 'Depreciación acumulada', 'Valor neto'],
    [
      ...d.subcuentas.map((s) => [esc(s.subcuenta), esc(s.clase), entero(s.bienes), dinero(s.saldoAjustado), dinero(s.depreciacionAcumulada), dinero(s.valorNeto)]),
    ],
    [2, 3, 4, 5],
  );

  const totalSub = d.subcuentas.reduce((n, s) => n + s.valorNeto, 0);
  const cuadre =
    d.subcuentas.length === 0
      ? ''
      : `<p class="nota">Suma por subcuenta: ${dinero(totalSub as Centavos)} · Total del detalle: ${dinero(d.totalValorNeto)} · Diferencia: ${dinero((totalSub - d.totalValorNeto) as Centavos)}.</p>`;

  const bajas = tabla(
    ['Código', 'Bien', 'Causal', 'Justificación técnica', 'Especialista', 'Estado', 'Valor neto', 'Pérdida'],
    d.bajas.map((b) => [
      `<span class="mono">${esc(b.codigo)}</span>`,
      esc(b.descripcion),
      esc(b.causal),
      esc(b.justificacion),
      esc(b.especialista),
      esc(b.estado),
      dinero(b.valorNeto),
      dinero(b.perdida),
    ]),
    [6, 7],
  );

  const excluidos = tabla(
    ['Código', 'Cálculo', 'Motivo'],
    d.excluidos.map((x) => [`<span class="mono">${esc(x.codigo)}</span>`, esc(x.ambito), esc(x.motivo)]),
  );

  const detalle = tabla(
    ['Código', 'Bien', 'Clase', 'Servicio', 'Adquisición', 'Saldo ajustado', 'Depreciación', 'Valor neto', 'Índice', 'Semáforo'],
    d.detalle.map((f) => [
      `<span class="mono">${esc(f.codigo)}</span>`,
      esc(f.descripcion),
      esc(f.clase),
      esc(f.servicio),
      fecha(f.fechaAdquisicion),
      dinero(f.saldoAjustado),
      dinero(f.depreciacionAcumulada),
      dinero(f.valorNeto),
      f.indice === null ? '—' : f.indice.toFixed(4),
      esc(f.semaforo ?? '—'),
    ]),
    [5, 6, 7, 8],
  );

  return `<!doctype html>
<html lang="es-CO"><head><meta charset="utf-8"><title>Informe de valuación — ${esc(d.razonSocial)}</title><style>${ESTILOS}</style></head>
<body>
  ${d.esDemostracion ? '<div class="demo">EJEMPLO — SIN VALIDEZ. Datos del hospital de demostración.</div>' : ''}

  <div class="membrete">
    <div class="entidad">${esc(d.razonSocial)}</div>
    <div class="datos">NIT ${esc(d.nit)} · ${esc(d.municipio)}, ${esc(d.departamento)}</div>
  </div>

  <h1>Informe de valuación de activos fijos</h1>
  <p>Ejercicio <strong>${esc(d.ejercicio)}</strong> · fecha de corte <strong>${fecha(d.fechaCorte)}</strong> · generado el ${esc(d.generadoEn)}.</p>

  <h2>1. Método aplicado</h2>
  <p class="nota">Se declara en el encabezado del informe porque cambiarlo obliga a recalcular el ejercicio completo y las cifras dejan de cuadrar con contabilidad (RF-06-08, ANEXO_C §3.3).</p>
  ${tabla(
    ['Parámetro', 'Valor aplicado'],
    [
      ['Método de depreciación', esc(etiqueta(d.metodoDepreciacion))],
      ['Conteo de meses', esc(etiqueta(d.metodoConteo))],
      ['Valor residual', `${esc(d.valorResidualPct)} %`],
      ['Deprecia el mes de adquisición', d.depreciaMesAdquisicion ? 'Sí' : 'No'],
      ['Inicia en la puesta en servicio', d.usaPuestaEnServicio ? 'Sí' : 'No (inicia en la adquisición)'],
    ],
  )}

  <h2>2. Resumen contable</h2>
  ${resumenContable}
  ${cobertura}

  <h2>3. Consolidado por subcuenta</h2>
  ${subcuentas}
  ${cuadre}

  <h2>4. Estado de la vida útil</h2>
  ${vidaUtil}

  <h2>5. Bienes propuestos para baja</h2>
  <p class="nota">La aplicación registra estados; la baja la aprueba el Comité (RN-09-04). Cada justificación es individual (RN-09-06).</p>
  ${bajas}
  ${d.bajas.length === 0 ? '' : `<p><strong>Pérdida total a reconocer por las bajas: ${dinero(d.perdidaBajas)}</strong></p>`}

  <h2>6. Bienes fuera del cálculo</h2>
  <p class="nota">No se cuentan como cero: se relacionan con su motivo para que se resuelvan (ANEXO_C §2.4 y §3.4).</p>
  ${excluidos}

  <table class="firmas">
    <tr>
      <td><div class="linea">${esc(d.gerente)}<br>Gerente</div></td>
      <td><div class="linea">${esc(d.contador ?? '')}<br>Contador<br>T.P. ${esc(d.tarjetaProfesionalContador ?? '____________')}</div></td>
    </tr>
  </table>

  <div class="anexo">
    <h2>Anexo · Listado depreciado bien por bien</h2>
    <p class="nota">${entero(d.detalle.length)} bienes.</p>
    ${detalle}
  </div>
</body></html>`;
}
