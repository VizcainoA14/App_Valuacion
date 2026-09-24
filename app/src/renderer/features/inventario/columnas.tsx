import type { JSX } from 'react';
import type { BienListadoDto } from '@compartido/dtos/inventario';
import { ESTADO_ACTUAL, CONDICION_TENENCIA } from '@compartido/enums/catalogos';
import { ESTADO_BIEN } from '@compartido/enums/estados';
import type { ColumnaDatos } from '../../componentes/TablaDatos/TablaDatos';
import { Insignia } from '../../componentes/ui';
import { formatearDinero, formatearFecha } from '../../formato';

/** El color nunca es el único portador: cada estado lleva su texto (accesibilidad). */
function InsigniaEstado({ estado }: { estado: BienListadoDto['estadoActual'] }): JSX.Element {
  const tono = estado === 'BUENO' ? 'exito' : estado === 'REGULAR' ? 'aviso' : estado === 'MALO' ? 'alerta' : 'peligro';
  return <Insignia tono={tono === 'alerta' ? 'aviso' : tono}>{ESTADO_ACTUAL.etiqueta(estado)}</Insignia>;
}

export const COLUMNAS_BIEN: readonly ColumnaDatos<BienListadoDto>[] = [
  { clave: 'codigo', titulo: 'Código', ordenPor: 'codigoInstitucional', anchoPx: 150, celda: (b) => <span className="font-mono">{b.codigoInstitucional}</span>, textoPlano: (b) => b.codigoInstitucional },
  { clave: 'placa', titulo: 'Placa', ordenPor: 'placa', anchoPx: 120, celda: (b) => <span className="font-mono">{b.placa}</span>, textoPlano: (b) => b.placa },
  { clave: 'descripcion', titulo: 'Descripción', ordenPor: 'descripcionFuncional', anchoPx: 260, celda: (b) => b.descripcionFuncional, textoPlano: (b) => b.descripcionFuncional },
  { clave: 'clase', titulo: 'Clase', ordenPor: 'claseCodigo', anchoPx: 110, celda: (b) => <span title={b.claseNombre}>{b.claseCodigo}</span>, textoPlano: (b) => b.claseNombre },
  { clave: 'ubicacion', titulo: 'Sede / servicio', ordenPor: 'servicioCodigo', anchoPx: 170, celda: (b) => `${b.sedeCodigo} · ${b.servicioNombre}`, textoPlano: (b) => `${b.sedeCodigo} / ${b.servicioCodigo}` },
  { clave: 'marca', titulo: 'Marca', anchoPx: 120, celda: (b) => b.marca ?? '—', textoPlano: (b) => b.marca ?? '' },
  { clave: 'serie', titulo: 'Serie', anchoPx: 130, celda: (b) => <span className="font-mono text-sm">{b.serie ?? '—'}</span>, textoPlano: (b) => b.serie ?? '' },
  { clave: 'estado', titulo: 'Estado', ordenPor: 'estadoActual', anchoPx: 120, celda: (b) => <InsigniaEstado estado={b.estadoActual} />, textoPlano: (b) => ESTADO_ACTUAL.etiqueta(b.estadoActual) },
  { clave: 'tenencia', titulo: 'Tenencia', anchoPx: 120, celda: (b) => (b.condicionTenencia === 'PROPIO' ? 'Propio' : <Insignia tono="neutro">{CONDICION_TENENCIA.etiqueta(b.condicionTenencia)}</Insignia>), textoPlano: (b) => CONDICION_TENENCIA.etiqueta(b.condicionTenencia) },
  {
    clave: 'costo',
    titulo: 'Costo de adquisición',
    ordenPor: 'costoAdquisicion',
    anchoPx: 160,
    alineacion: 'derecha',
    // RN-03-02: sin costo NO es cero; se muestra como dato faltante.
    celda: (b) => (b.costoAdquisicion === null ? <span className="text-texto-secundario">Sin dato</span> : formatearDinero(b.costoAdquisicion)),
    textoPlano: (b) => (b.costoAdquisicion === null ? 'Sin dato' : formatearDinero(b.costoAdquisicion)),
  },
  { clave: 'fechaAdq', titulo: 'Adquisición', anchoPx: 110, celda: (b) => formatearFecha(b.fechaAdquisicion), textoPlano: (b) => formatearFecha(b.fechaAdquisicion) },
  {
    clave: 'registro',
    titulo: 'En el inventario',
    ordenPor: 'estadoRegistro',
    anchoPx: 150,
    celda: (b) => <Insignia tono={b.estadoRegistro === 'NO_ENCONTRADO' ? 'aviso' : b.estadoRegistro === 'ACTIVO' ? 'exito' : 'neutro'}>{ESTADO_BIEN.etiqueta(b.estadoRegistro)}</Insignia>,
    textoPlano: (b) => ESTADO_BIEN.etiqueta(b.estadoRegistro),
  },
];
