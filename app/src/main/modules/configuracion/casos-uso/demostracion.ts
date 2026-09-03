/**
 * T-B-11 — Hospital de demostración: entidad ficticia completa que se carga y se
 * borra de un clic. Tres salvaguardas (plan 5.2): `es_demostracion = 1`, banda
 * visible permanente en la interfaz, y marca de agua "EJEMPLO — SIN VALIDEZ" en
 * todo documento generado (la aplica el generador documental del hito G leyendo
 * la misma bandera).
 */
import demo from '../../../../../recursos/semillas/hospital_demo.json';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { EntidadDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { aCentavos, aX10k, decimal } from '../../../../compartido/motor/dinero';
import { comoFechaIso } from '../../../../compartido/tipos/basicos';
import { sumarDias } from '../../../../compartido/motor/fechas';
import { componerCodigo } from '../../../../compartido/reglas/codigoInstitucional';
import type { PerfilResponsable } from '../../../../compartido/enums/plataforma';
import type { EstadoActual } from '../../../../compartido/enums/catalogos';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { entidadRepo } from '../repositorio/entidad.repo';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { claseRepo, aniosAX10k } from '../repositorio/clase.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { abreviaturaRepo, convencionRepo } from '../repositorio/convencion.repo';
import { ejercicioRepo } from '../repositorio/ejercicio.repo';
import { responsableRepo } from '../../plataforma';
import { CLASES_SUGERIDAS, ABREVIATURAS_SUGERIDAS, PARAMETROS_SEMILLA } from '../semillas';

export const NIT_DEMOSTRACION = demo.entidad.nit;

const SEGMENTOS_DEMO = [{ tipo: 'PREFIJO_ENTIDAD' as const, valor: 'HDM' }, { tipo: 'CODIGO_SEDE' as const }, { tipo: 'ABREVIATURA_TIPO' as const }, { tipo: 'CONSECUTIVO' as const }];

export function cargarDemostracion(_e: EntradaValidadaDe<'demo:cargar'>, ctx: ContextoIpc): EntidadDto {
  if (entidadRepo.porNit(ctx.db, NIT_DEMOSTRACION) !== null) {
    throw new ErrorReglaNegocio('DEMO_YA_CARGADA', 'El hospital de demostración ya está cargado. Bórrelo antes de volver a cargarlo.');
  }
  const ahora = ctx.ahoraIso();
  const { db } = ctx;

  const entidad = entidadRepo.insertar(db, { id: nuevoId(), ...demo.entidad, nivelComplejidad: demo.entidad.nivelComplejidad as 'I' | 'II' | 'III', esDemostracion: true, creadoEn: ahora, actualizadoEn: ahora });

  // Responsables (TR-12): uno por perfil que interviene en el recorrido.
  const responsables = new Map<PerfilResponsable, string>();
  for (const r of demo.responsables) {
    const creado = responsableRepo.insertar(db, {
      id: nuevoId(),
      entidadId: entidad.id,
      nombreCompleto: r.nombreCompleto,
      documentoIdentidad: r.documentoIdentidad,
      perfil: r.perfil as PerfilResponsable,
      cargo: r.cargo,
      tarjetaProfesional: 'tarjetaProfesional' in r ? r.tarjetaProfesional : null,
      registroRaa: 'registroRaa' in r ? r.registroRaa : null,
      esExterno: 'esExterno' in r ? r.esExterno : false,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    responsables.set(creado.perfil, creado.id);
  }

  // Sedes y servicios.
  const sedes = new Map<string, string>();
  const servicios = new Map<string, string>();
  for (const s of demo.sedes) {
    const sede = sedeRepo.insertar(db, { id: nuevoId(), entidadId: entidad.id, codigo: s.codigo, nombre: s.nombre, direccion: s.direccion, municipio: s.municipio, activa: true, creadoEn: ahora, actualizadoEn: ahora });
    sedes.set(s.codigo, sede.id);
    for (const sv of s.servicios) {
      const servicio = servicioRepo.insertar(db, { id: nuevoId(), sedeId: sede.id, codigo: sv.codigo, nombre: sv.nombre, tipo: sv.tipo as 'asistencial' | 'administrativo' | 'apoyo', responsable: sv.responsable, activo: true, creadoEn: ahora, actualizadoEn: ahora });
      servicios.set(`${s.codigo}/${sv.codigo}`, servicio.id);
    }
  }

  // Clases (6 de las sugeridas), parámetros CONFIRMADOS (para poder recorrer el flujo), convención y abreviaturas.
  const clases = new Map<string, { id: string; vidaUtilTecnicaAnios: number | null }>();
  for (const c of CLASES_SUGERIDAS.filter((x) => demo.clases.includes(x.codigo))) {
    const clase = claseRepo.insertar(db, { id: nuevoId(), entidadId: entidad.id, codigo: c.codigo, nombre: c.nombre, subcuentaContable: c.subcuentaContable, vidaUtilContableMeses: c.vidaUtilContableMeses, vidaUtilTecnicaAnios: aniosAX10k(c.vidaUtilTecnicaAnios), esDepreciable: c.esDepreciable, requiereHojaVida: c.requiereHojaVida, requiereInvima: c.requiereInvima, responsableTecnico: c.responsableTecnico, activo: true, creadoEn: ahora, actualizadoEn: ahora });
    clases.set(c.codigo, { id: clase.id, vidaUtilTecnicaAnios: c.vidaUtilTecnicaAnios });
  }
  const parametros = { ...PARAMETROS_SEMILLA, metodo_conteo_meses_confirmado: true };
  parametroRepo.guardar(db, entidad.id, parametros, ahora);
  convencionRepo.guardar(db, entidad.id, SEGMENTOS_DEMO, 3, ahora);
  abreviaturaRepo.reemplazar(db, entidad.id, ABREVIATURAS_SUGERIDAS);

  // Ejercicio con parámetros congelados, abierto por la coordinadora.
  const coordinadora = responsables.get('COORDINADOR');
  if (coordinadora === undefined) throw new ErrorValidacion('DEMO_SIN_COORDINADOR', 'La semilla no trae coordinador.');
  const ejercicio = ejercicioRepo.insertar(db, { id: nuevoId(), entidadId: entidad.id, nombre: demo.ejercicio.nombre, fechaCorte: demo.ejercicio.fechaCorte, parametrosCongeladosJson: JSON.stringify(parametros), contratoNumero: demo.ejercicio.contratoNumero, creadoPorResponsableId: coordinadora, creadoEn: ahora });

  // 50 bienes con hoja de vida, en ACTIVO por la ruta válida de la máquina de estados.
  const insertarBien = ctx.sqlite.prepare(
    `INSERT INTO bien (id, ejercicio_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id, marca, modelo, serie, sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, responsable_custodia, fecha_toma, funcionario_conteo, estado_registro, creado_en, actualizado_en)
     VALUES (@id, @ejercicioId, @codigo, @placa, @descripcion, @claseId, @marca, @modelo, @serie, @sedeId, @servicioId, 1, @estadoActual, 'PROPIO', @custodio, @fechaToma, 'Técnico de conteo (demo)', 'BORRADOR', @ahora, @ahora)`,
  );
  const transitar = ctx.sqlite.prepare('UPDATE bien SET estado_registro = ? WHERE id = ?');
  const insertarHoja = ctx.sqlite.prepare(
    `INSERT INTO hoja_vida (id, bien_id, tipo_instalacion, registro_invima, fabricante, estado_operativo, forma_adquisicion, fecha_adquisicion, documento_adquisicion, numero_factura, proveedor, costo_adquisicion_cent, adiciones_mejoras_cent, fecha_puesta_servicio, creado_en, actualizado_en)
     VALUES (@id, @bienId, @tipoInstalacion, @invima, @fabricante, @estadoOperativo, 'COMPRA', @fechaAdquisicion, 'Factura (demo)', @factura, @proveedor, @costoCent, 0, @puestaServicio, @ahora, @ahora)`,
  );
  const consecutivos = new Map<string, number>();
  let numero = 0;
  for (const fila of demo.bienes) {
    const [codigoClase, abreviatura, descripcion, marca, modelo, codigoSede, codigoServicio, estadoActual, fechaAdquisicion, costoPesos] = fila as [string, string, string, string, string, string, string, string, string, number];
    numero += 1;
    const clase = clases.get(codigoClase);
    const sedeId = sedes.get(codigoSede);
    const servicioId = servicios.get(`${codigoSede}/${codigoServicio}`);
    if (clase === undefined || sedeId === undefined || servicioId === undefined) throw new ErrorValidacion('DEMO_INCOHERENTE', `Bien ${numero}: clase, sede o servicio inexistente en la semilla.`);
    const claveConsecutivo = `${codigoSede}/${abreviatura}`;
    const consecutivo = (consecutivos.get(claveConsecutivo) ?? 0) + 1;
    consecutivos.set(claveConsecutivo, consecutivo);
    const bienId = nuevoId();
    const fechaAdq = comoFechaIso(fechaAdquisicion);
    insertarBien.run({
      id: bienId,
      ejercicioId: ejercicio.id,
      codigo: componerCodigo(SEGMENTOS_DEMO, 3, { codigoSede, abreviatura, consecutivo }),
      placa: `DEMO-${String(numero).padStart(4, '0')}`,
      descripcion,
      claseId: clase.id,
      marca,
      modelo,
      serie: `SN-DEMO-${String(numero).padStart(4, '0')}`,
      sedeId,
      servicioId,
      estadoActual: estadoActual as EstadoActual,
      custodio: 'Custodio de ejemplo',
      fechaToma: '2025-05-15',
      ahora,
    });
    transitar.run('VALIDADO', bienId);
    transitar.run('ACTIVO', bienId);
    insertarHoja.run({
      id: nuevoId(),
      bienId,
      tipoInstalacion: codigoClase === 'MAQ' ? 'FIJO' : 'MOVIL',
      invima: codigoClase === 'EMC' ? `INVIMA-DEMO-${String(numero).padStart(4, '0')}` : null,
      fabricante: marca,
      estadoOperativo: estadoActual === 'INSERVIBLE' ? 'FUERA_SERVICIO' : estadoActual === 'MALO' ? 'NO_OPERATIVO' : 'OPERATIVO',
      fechaAdquisicion: fechaAdq,
      factura: `F-DEMO-${String(numero).padStart(4, '0')}`,
      proveedor: `${marca} Colombia (demo)`,
      costoCent: aCentavos(costoPesos),
      puestaServicio: sumarDias(fechaAdq, 15),
      ahora,
    });
  }

  // Inmueble con avalúo del perito (paso 08).
  const perito = responsables.get('PERITO');
  const inm = demo.inmueble;
  const inmuebleId = nuevoId();
  ctx.sqlite
    .prepare(
      `INSERT INTO inmueble (id, entidad_id, codigo_inmueble, nombre, tipo_inmueble, direccion, municipio, departamento, destinacion, uso_actual, matricula_inmobiliaria, codigo_catastral, titulo_adquisicion, fecha_adquisicion, estado_legalizacion, area_terreno_m2_x10k, area_construida_m2_x10k, numero_pisos, vetustez_anios, vida_util_total_anios, estado_conservacion, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(inmuebleId, entidad.id, inm.codigoInmueble, inm.nombre, inm.tipoInmueble, inm.direccion, inm.municipio, inm.departamento, inm.destinacion, inm.usoActual, inm.matriculaInmobiliaria, inm.codigoCatastral, inm.tituloAdquisicion, inm.fechaAdquisicion, inm.estadoLegalizacion, aX10k(inm.areaTerrenoM2), aX10k(inm.areaConstruidaM2), inm.numeroPisos, inm.vetustezAnios, inm.vidaUtilTotalAnios, inm.estadoConservacion, ahora, ahora);

  const av = inm.avaluo;
  const valorTerreno = decimal(av.valorM2Terreno).mul(inm.areaTerrenoM2);
  const m2Depreciado = decimal(av.costoReposicionM2).mul(av.factorDepreciacion);
  const valorConstruccion = m2Depreciado.mul(inm.areaConstruidaM2);
  const valorTotal = valorTerreno.plus(valorConstruccion);
  const peritoNombre = demo.responsables.find((r) => r.perfil === 'PERITO');
  ctx.sqlite
    .prepare(
      `INSERT INTO avaluo_inmueble (id, inmueble_id, ejercicio_id, metodo_terreno, valor_m2_terreno_cent, valor_total_terreno_cent, metodo_construccion, costo_reposicion_m2_cent, factor_depreciacion_x10k, valor_m2_construccion_depreciado_cent, valor_total_construccion_cent, valor_total_inmueble_cent, perito_id, perito_nombre, perito_registro_raa, fecha_visita, fecha_informe, vigencia_hasta, valor_libros_anterior_cent, diferencia_valuacion_cent, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      nuevoId(), inmuebleId, ejercicio.id, av.metodoTerreno, aCentavos(av.valorM2Terreno), aCentavos(valorTerreno), av.metodoConstruccion, aCentavos(av.costoReposicionM2), aX10k(av.factorDepreciacion), aCentavos(m2Depreciado), aCentavos(valorConstruccion), aCentavos(valorTotal),
      perito ?? null, peritoNombre?.nombreCompleto ?? 'Perito de ejemplo', (peritoNombre !== undefined && 'registroRaa' in peritoNombre ? peritoNombre.registroRaa : null) ?? 'AVAL-DEMO', av.fechaVisita, av.fechaInforme, sumarDias(comoFechaIso(av.fechaInforme), 365), aCentavos(av.valorLibrosAnterior), aCentavos(valorTotal.minus(av.valorLibrosAnterior)), ahora,
    );

  ctx.bitacora.registrar({ ejercicioId: ejercicio.id, entidadAfectada: 'entidad', registroId: entidad.id, accion: 'IMPORTAR', valorNuevo: `Hospital de demostración cargado: ${demo.bienes.length} bienes, ${demo.sedes.length} sedes, 1 inmueble` });
  return entidad;
}

/** Tablas hijas del ejercicio y de la entidad, en orden de borrado (las FK son RESTRICT). */
const TABLAS_POR_EJERCICIO = ['oferta_comparable', 'avaluo_inmueble', 'efecto_contable_baja', 'disposicion_final', 'propuesta_baja', 'valuacion_mueble', 'deterioro', 'calculo_depreciacion', 'calculo_obsolescencia', 'override_vida_util', 'soporte_documental', 'mantenimiento', 'foto_bien', 'movimiento_bien', 'hoja_vida', 'partida_conciliatoria', 'activo_contable', 'saldo_contable', 'conciliacion', 'referencia_mercado', 'consolidado_subcuenta', 'verificacion_cuadre', 'acta_custodia', 'bien_en_custodia', 'acto_administrativo', 'acta_comite', 'producto_contractual', 'capacitacion', 'acta_entrega', 'cierre_ejercicio', 'bien'] as const;

export function borrarDemostracion(e: EntradaValidadaDe<'demo:borrar'>, ctx: ContextoIpc): { eliminados: Record<string, number> } {
  const entidad = entidadRepo.porId(ctx.db, e.entidadId);
  if (entidad === null) throw new ErrorValidacion('ENTIDAD_INEXISTENTE', 'La entidad no existe.', { campo: 'entidadId' });
  if (!entidad.esDemostracion) {
    throw new ErrorReglaNegocio('NO_ES_DEMOSTRACION', 'Solo el hospital de demostración se puede borrar; los datos reales nunca se eliminan (RN-09-09).');
  }
  const { sqlite } = ctx;
  const eliminados: Record<string, number> = {};
  const contar = (tabla: string, n: number): void => {
    if (n > 0) eliminados[tabla] = (eliminados[tabla] ?? 0) + n;
  };
  const ejercicios = (sqlite.prepare('SELECT id FROM ejercicio WHERE entidad_id = ?').all(e.entidadId) as { id: string }[]).map((x) => x.id);

  for (const ejercicioId of ejercicios) {
    // Bitácora del ejercicio de demostración: no es evidencia real.
    contar('bitacora', sqlite.prepare('DELETE FROM bitacora WHERE ejercicio_id = ?').run(ejercicioId).changes);
    for (const tabla of TABLAS_POR_EJERCICIO) {
      const conEjercicio = (sqlite.pragma(`table_info(${tabla})`) as { name: string }[]).some((c) => c.name === 'ejercicio_id');
      const sql = conEjercicio
        ? `DELETE FROM ${tabla} WHERE ejercicio_id = ?`
        : tabla === 'oferta_comparable'
          ? `DELETE FROM ${tabla} WHERE avaluo_id IN (SELECT id FROM avaluo_inmueble WHERE ejercicio_id = ?)`
          : ['efecto_contable_baja', 'disposicion_final'].includes(tabla)
            ? `DELETE FROM ${tabla} WHERE propuesta_baja_id IN (SELECT id FROM propuesta_baja WHERE ejercicio_id = ?)`
            : `DELETE FROM ${tabla} WHERE bien_id IN (SELECT id FROM bien WHERE ejercicio_id = ?)`;
      contar(tabla, sqlite.prepare(sql).run(ejercicioId).changes);
    }
    contar('ejercicio', sqlite.prepare('DELETE FROM ejercicio WHERE id = ?').run(ejercicioId).changes);
  }

  contar('documento_inmueble', sqlite.prepare('DELETE FROM documento_inmueble WHERE inmueble_id IN (SELECT id FROM inmueble WHERE entidad_id = ?)').run(e.entidadId).changes);
  for (const tabla of ['inmueble', 'factor_estado', 'abreviatura_tipo', 'convencion_codigo', 'parametro_calculo', 'clase_activo'] as const) {
    contar(tabla, sqlite.prepare(`DELETE FROM ${tabla} WHERE entidad_id = ?`).run(e.entidadId).changes);
  }
  contar('servicio', sqlite.prepare('DELETE FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE entidad_id = ?)').run(e.entidadId).changes);
  contar('sede', sqlite.prepare('DELETE FROM sede WHERE entidad_id = ?').run(e.entidadId).changes);
  const responsables = (sqlite.prepare('SELECT id FROM responsable WHERE entidad_id = ?').all(e.entidadId) as { id: string }[]).map((x) => x.id);
  for (const id of responsables) contar('bitacora', sqlite.prepare('DELETE FROM bitacora WHERE responsable_id = ? OR registro_id = ?').run(id, id).changes);
  contar('responsable', sqlite.prepare('DELETE FROM responsable WHERE entidad_id = ?').run(e.entidadId).changes);
  contar('bitacora', sqlite.prepare('DELETE FROM bitacora WHERE registro_id = ?').run(e.entidadId).changes);
  contar('entidad', sqlite.prepare('DELETE FROM entidad WHERE id = ?').run(e.entidadId).changes);

  return { eliminados };
}
