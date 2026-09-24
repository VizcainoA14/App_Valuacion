/**
 * Pantalla 4 — Parámetros de cálculo con explicación de cada opción (RN-01-04,
 * RN-01-05) y convención de codificación con vista previa (RN-01-02, RF-01-04).
 */
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EsquemaParametrosCalculo, type ParametrosCalculo as Parametros } from '@compartido/parametros/parametrosCalculo';
import { METODO_CONTEO_MESES, METODO_DEPRECIACION, ENFOQUE_ADICIONES, BASE_COMPARACION_AVALUO } from '@compartido/enums/parametros';
import type { SegmentoCodigo } from '@compartido/dtos/configuracion';
import { componerCodigo, validarSegmentos } from '@compartido/reglas/codigoInstitucional';
import { useCanal, useMutacion, EFECTOS_CONFIGURACION } from '../../../ipc/consultas';
import { Aviso, Boton, Campo, Cargando, Casilla, Encabezado, Seccion, Selector, AreaTexto } from '../../../componentes/ui';
import { useProcesoId, mensajeError } from '../hooks';

const numero = (min: number, max: number) => z.preprocess((v) => Number(String(v).replace(',', '.')), z.number().min(min).max(max));

const esquema = EsquemaParametrosCalculo.extend({
  valor_residual_pct: numero(0, 100),
  decimales_calculo: numero(0, 4),
  umbral_capitalizacion: numero(0, Number.MAX_SAFE_INTEGER),
  umbral_semaforo_verde: numero(0, 1),
  umbral_semaforo_amarillo: numero(0, 1),
  umbral_semaforo_naranja: numero(0, 1),
  umbral_reparacion_baja_pct: numero(0, 100),
  tolerancia_cruce_valor_pct: numero(0, 100),
  vigencia_avaluo_meses: numero(1, 120),
  justificacion: z.string().trim().max(500).optional(),
});
type Valores = z.input<typeof esquema>;
type Validados = z.output<typeof esquema>;

export function ParametrosCalculo(): JSX.Element {
  const procesoId = useProcesoId();
  const parametros = useCanal('parametros:obtener', { procesoId });
  // La mutación vive aquí: el formulario se sincroniza con `values` y no se remonta al guardar.
  const actualizar = useMutacion('parametros:actualizar', ['parametros:obtener', ...EFECTOS_CONFIGURACION]);
  if (parametros.isPending) return <Cargando />;
  if (parametros.isError || parametros.data === undefined) return <Aviso tono="peligro">{parametros.error?.message ?? 'Sin parámetros'}</Aviso>;
  return (
    <>
      <Encabezado titulo="Parámetros de cálculo" subtitulo="Valen para los cálculos que vengan: cada corte guarda una copia de los que usó (RN-01-01). Cada cambio queda en bitácora (RF-01-08)." />
      <div className="flex flex-col gap-5">
        {actualizar.isError && <Aviso tono="peligro">{mensajeError(actualizar.error)}</Aviso>}
        {actualizar.isSuccess && <Aviso tono="exito">Parámetros guardados. Se aplican desde el próximo cálculo; los cortes ya hechos no cambian.</Aviso>}
        <FormularioParametros actuales={parametros.data} guardando={actualizar.isPending} onGuardar={(cambios, justificacion) => actualizar.mutate({ procesoId, cambios, justificacion })} />
        <ConvencionCodificacion procesoId={procesoId} />
      </div>
    </>
  );
}

function FormularioParametros({ actuales, guardando, onGuardar }: { actuales: Parametros; guardando: boolean; onGuardar: (cambios: Parametros, justificacion: string | null) => void }): JSX.Element {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Valores, unknown, Validados>({ resolver: zodResolver(esquema), defaultValues: actuales, values: actuales });
  const opciones = <C extends { valores: readonly string[]; etiqueta: (v: never) => string }>(c: C) => c.valores.map((v) => ({ valor: v, etiqueta: c.etiqueta(v as never) }));

  return (
    <form noValidate onSubmit={handleSubmit(({ justificacion, ...cambios }) => onGuardar(cambios, justificacion ?? null))} className="flex flex-col gap-5">

      <Seccion titulo="Depreciación" descripcion="El método de conteo de meses es el punto crítico del sistema (ANEXO_C §3.3): conviene acordarlo con el contador. El informe declara el que se usó.">
        <div className="grid gap-4 md:grid-cols-2">
          <Selector etiqueta="Método de depreciación" ayuda="Fórmula del paso 06 · Manual de Políticas Contables" opciones={opciones(METODO_DEPRECIACION)} {...register('metodo_depreciacion')} />
          <Selector etiqueta="Método de conteo de meses" ayuda="mes_completo: solo meses cumplidos · dias_exactos: días/365,25×12 (sugerido) · fraccion_anual: equivalente a días exactos" opciones={opciones(METODO_CONTEO_MESES)} {...register('metodo_conteo_meses')} />
          <Casilla etiqueta="Deprecia el mes de adquisición" ayuda="Si no, la depreciación inicia el primer día del mes siguiente (ANEXO_C §3.2)" {...register('deprecia_mes_adquisicion')} />
          <Casilla etiqueta="Usa la fecha de puesta en servicio" ayuda="Cuando existe, en lugar de la fecha de adquisición" {...register('usa_puesta_en_servicio')} />
          <Selector etiqueta="Enfoque de adiciones y mejoras" ayuda="ANEXO_C §3.6" opciones={opciones(ENFOQUE_ADICIONES)} {...register('enfoque_adiciones')} />
          <Campo etiqueta="Valor residual (%)" type="number" step="0.01" ayuda="Base depreciable = saldo ajustado − residual" error={errors.valor_residual_pct?.message} {...register('valor_residual_pct')} />
          <Campo etiqueta="Decimales de cálculo" type="number" min={0} max={4} error={errors.decimales_calculo?.message} {...register('decimales_calculo')} />
          <Campo etiqueta="Umbral de capitalización (pesos)" type="number" ayuda="Qué es activo y qué es gasto, según el manual" error={errors.umbral_capitalizacion?.message} {...register('umbral_capitalizacion')} />
        </div>
      </Seccion>

      <Seccion titulo="Semáforo de obsolescencia" descripcion="RN-01-05: fronteras con ≤. Verde ≤ verde · amarillo ≤ amarillo · naranja < 1 · rojo ≥ 1.">
        <div className="grid gap-4 md:grid-cols-3">
          <Campo etiqueta="Verde hasta" type="number" step="0.01" min={0} max={1} error={errors.umbral_semaforo_verde?.message} {...register('umbral_semaforo_verde')} />
          <Campo etiqueta="Amarillo hasta" type="number" step="0.01" min={0} max={1} error={errors.umbral_semaforo_amarillo?.message} {...register('umbral_semaforo_amarillo')} />
          <Campo etiqueta="Naranja hasta" type="number" step="0.01" min={0} max={1} ayuda="Rojo: índice ≥ 1 (vida útil agotada)" error={errors.umbral_semaforo_naranja?.message} {...register('umbral_semaforo_naranja')} />
        </div>
      </Seccion>

      <Seccion titulo="Valuación, bajas y conciliación">
        <div className="grid gap-4 md:grid-cols-2">
          <Selector etiqueta="Base de comparación del avalúo" ayuda="CT-03: valor neto en libros por defecto (con deterioro descontado)" opciones={opciones(BASE_COMPARACION_AVALUO)} {...register('base_comparacion_avaluo')} />
          <Campo etiqueta="Vigencia del avalúo de inmuebles (meses)" type="number" min={1} error={errors.vigencia_avaluo_meses?.message} {...register('vigencia_avaluo_meses')} />
          <Campo etiqueta="Reparación sobre reposición que justifica la baja (%)" type="number" step="0.01" error={errors.umbral_reparacion_baja_pct?.message} {...register('umbral_reparacion_baja_pct')} />
          <Campo etiqueta="Tolerancia de cruce por valor (%)" type="number" step="0.01" ayuda="Emparejamiento físico ↔ libros (RN-04-01)" error={errors.tolerancia_cruce_valor_pct?.message} {...register('tolerancia_cruce_valor_pct')} />
          <Campo etiqueta="Moneda" maxLength={3} error={errors.moneda?.message} {...register('moneda')} />
        </div>
      </Seccion>

      <Seccion titulo="Guardar">
        <AreaTexto etiqueta="Justificación (opcional)" ayuda="Se registra junto a cada parámetro cambiado." error={errors.justificacion?.message} {...register('justificacion')} />
        <div className="mt-3 flex justify-end">
          <Boton type="submit" variante="primario" disabled={!isDirty} cargando={guardando}>
            Guardar parámetros
          </Boton>
        </div>
      </Seccion>
    </form>
  );
}

const TIPOS: readonly { tipo: SegmentoCodigo['tipo']; etiqueta: string }[] = [
  { tipo: 'PREFIJO_ENTIDAD', etiqueta: 'Prefijo de la entidad' },
  { tipo: 'CODIGO_SEDE', etiqueta: 'Código de sede' },
  { tipo: 'ABREVIATURA_TIPO', etiqueta: 'Abreviatura del tipo' },
  { tipo: 'CONSECUTIVO', etiqueta: 'Consecutivo' },
  { tipo: 'SEPARADOR', etiqueta: 'Separador' },
];

function ConvencionCodificacion({ procesoId }: { procesoId: string }): JSX.Element {
  const convencion = useCanal('convencion:obtener', { procesoId });
  const guardar = useMutacion('convencion:guardar', ['convencion:obtener', ...EFECTOS_CONFIGURACION]);
  const [segmentos, setSegmentos] = useState<SegmentoCodigo[] | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);

  if (convencion.isPending) return <Cargando />;
  if (convencion.data === undefined) return <Aviso tono="peligro">Sin convención.</Aviso>;
  const actuales = segmentos ?? [...convencion.data.segmentos];
  const longitudActual = longitud ?? convencion.data.longitudConsecutivo;
  const problema = validarSegmentos(actuales);
  const ejemplo = problema === null ? componerCodigo(actuales, longitudActual, { codigoSede: '01', abreviatura: 'AGM', consecutivo: 1 }) : '—';

  const cambiar = (i: number, s: SegmentoCodigo): void => setSegmentos(actuales.map((x, j) => (j === i ? s : x)));

  return (
    <Seccion
      titulo="Convención de codificación (plaqueteo)"
      descripcion={convencion.data.definida ? 'RN-01-02 · Definida por el hospital.' : 'VAL-01-10 · No definida: se usará la genérica SEDE-TIPO-CONSECUTIVO hasta que la configure.'}
      acciones={
        <Boton variante="primario" cargando={guardar.isPending} disabled={problema !== null} onClick={() => guardar.mutate({ procesoId, segmentos: actuales, longitudConsecutivo: longitudActual }, { onSuccess: () => { setSegmentos(null); setLongitud(null); } })}>
          Guardar convención
        </Boton>
      }
    >
      {guardar.isError && <Aviso tono="peligro" className="mb-3">{mensajeError(guardar.error)}</Aviso>}
      <ol className="flex flex-col gap-2">
        {actuales.map((s, i) => (
          <li key={i} className="flex flex-wrap items-end gap-2">
            <span className="w-6 text-sm text-texto-secundario">{i + 1}.</span>
            <div className="w-56">
              <Selector etiqueta="Segmento" opciones={TIPOS.map((t) => ({ valor: t.tipo, etiqueta: t.etiqueta }))} value={s.tipo} onChange={(e) => {
                const tipo = e.target.value as SegmentoCodigo['tipo'];
                cambiar(i, tipo === 'PREFIJO_ENTIDAD' ? { tipo, valor: 'HSV' } : tipo === 'SEPARADOR' ? { tipo, valor: '-' } : { tipo });
              }} />
            </div>
            {(s.tipo === 'PREFIJO_ENTIDAD' || s.tipo === 'SEPARADOR') && (
              <div className="w-32">
                <Campo etiqueta="Valor" value={s.valor} maxLength={s.tipo === 'SEPARADOR' ? 3 : 10} onChange={(e) => cambiar(i, { tipo: s.tipo, valor: e.target.value } as SegmentoCodigo)} />
              </div>
            )}
            <Boton variante="sutil" onClick={() => setSegmentos(actuales.filter((_, j) => j !== i))} disabled={actuales.length <= 1}>
              Quitar
            </Boton>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Boton onClick={() => setSegmentos([...actuales, { tipo: 'SEPARADOR', valor: '-' }])} disabled={actuales.length >= 8}>
          Añadir segmento
        </Boton>
        <div className="w-40">
          <Campo etiqueta="Longitud del consecutivo" type="number" min={1} max={10} value={longitudActual} onChange={(e) => setLongitud(Number(e.target.value))} />
        </div>
        <p className="text-base text-texto">
          Ejemplo (sede 01, tipo AGM, consecutivo 1): <span className="font-mono font-semibold" data-prueba="codigo-ejemplo">{ejemplo}</span>
        </p>
      </div>
      {problema !== null && <Aviso tono="aviso" className="mt-3">{problema}</Aviso>}
    </Seccion>
  );
}
