/**
 * T-B-11 — Hospital de demostración: entidad ficticia completa que se carga y se
 * borra de un clic. Tres salvaguardas (plan 5.2): `es_demostracion = 1`, banda
 * visible permanente en la interfaz, y marca "EJEMPLO — SIN VALIDEZ" en el
 * informe, que lee la misma bandera.
 *
 * Trae configuración e inventario con sus datos económicos: lo justo para
 * calcular. Los cortes los hace quien la usa, como haría un hospital real.
 */
import demo from '../../../../../recursos/semillas/hospital_demo.json';
import type { ContextoIpc } from '../../../ipc/registroIpc';
import type { EntradaValidadaDe } from '../../../../compartido/ipc/contrato';
import type { ProcesoDto } from '../../../../compartido/dtos/configuracion';
import { ErrorReglaNegocio, ErrorValidacion } from '../../../../compartido/errores';
import { aCentavos } from '../../../../compartido/motor/dinero';
import { comoFechaIso } from '../../../../compartido/tipos/basicos';
import { sumarDias } from '../../../../compartido/motor/fechas';
import { componerCodigo } from '../../../../compartido/reglas/codigoInstitucional';
import type { EstadoActual } from '../../../../compartido/enums/catalogos';
import { nuevoId } from '../../../infraestructura/db/identificadores';
import { procesoRepo } from '../repositorio/proceso.repo';
import { borrarProcesoCompleto } from './procesos';
import { sedeRepo } from '../repositorio/sede.repo';
import { servicioRepo } from '../repositorio/servicio.repo';
import { claseRepo, aniosAX10k } from '../repositorio/clase.repo';
import { parametroRepo } from '../repositorio/parametro.repo';
import { abreviaturaRepo, convencionRepo } from '../repositorio/convencion.repo';
import { CLASES_SUGERIDAS, ABREVIATURAS_SUGERIDAS, PARAMETROS_SEMILLA } from '../semillas';

export const NIT_DEMOSTRACION = demo.entidad.nit;
/** La fecha a la que calcula el proceso de demostración: todos sus bienes son anteriores. */
export const CORTE_DEMOSTRACION = '2025-06-30';

const SEGMENTOS_DEMO = [{ tipo: 'PREFIJO_ENTIDAD' as const, valor: 'HDM' }, { tipo: 'CODIGO_SEDE' as const }, { tipo: 'ABREVIATURA_TIPO' as const }, { tipo: 'CONSECUTIVO' as const }];

export function cargarDemostracion(_e: EntradaValidadaDe<'demo:cargar'>, ctx: ContextoIpc): ProcesoDto {
  if (procesoRepo.listar(ctx.db).some((p) => p.esDemostracion)) {
    throw new ErrorReglaNegocio('DEMO_YA_CARGADA', 'El proceso de demostración ya está cargado. Bórrelo antes de volver a cargarlo.');
  }
  const ahora = ctx.ahoraIso();
  const { db } = ctx;

  const entidad = procesoRepo.insertar(db, { id: nuevoId(), nombre: 'Proceso de demostración', fechaCorte: CORTE_DEMOSTRACION, ...demo.entidad, nivelComplejidad: demo.entidad.nivelComplejidad as 'I' | 'II' | 'III', esDemostracion: true, creadoEn: ahora, actualizadoEn: ahora });

  // Sedes y servicios.
  const sedes = new Map<string, string>();
  const servicios = new Map<string, string>();
  for (const s of demo.sedes) {
    const sede = sedeRepo.insertar(db, { id: nuevoId(), procesoId: entidad.id, codigo: s.codigo, nombre: s.nombre, direccion: s.direccion, municipio: s.municipio, activa: true, creadoEn: ahora, actualizadoEn: ahora });
    sedes.set(s.codigo, sede.id);
    for (const sv of s.servicios) {
      const servicio = servicioRepo.insertar(db, { id: nuevoId(), sedeId: sede.id, codigo: sv.codigo, nombre: sv.nombre, tipo: sv.tipo as 'asistencial' | 'administrativo' | 'apoyo', responsable: sv.responsable, activo: true, creadoEn: ahora, actualizadoEn: ahora });
      servicios.set(`${s.codigo}/${sv.codigo}`, servicio.id);
    }
  }

  // Clases (6 de las sugeridas), parámetros sugeridos, convención y abreviaturas.
  const clases = new Map<string, { id: string; vidaUtilTecnicaAnios: number | null }>();
  for (const c of CLASES_SUGERIDAS.filter((x) => demo.clases.includes(x.codigo))) {
    const clase = claseRepo.insertar(db, { id: nuevoId(), procesoId: entidad.id, codigo: c.codigo, nombre: c.nombre, subcuentaContable: c.subcuentaContable, vidaUtilContableMeses: c.vidaUtilContableMeses, vidaUtilTecnicaAnios: aniosAX10k(c.vidaUtilTecnicaAnios), esDepreciable: c.esDepreciable, requiereHojaVida: c.requiereHojaVida, requiereInvima: c.requiereInvima, responsableTecnico: c.responsableTecnico, activo: true, creadoEn: ahora, actualizadoEn: ahora });
    clases.set(c.codigo, { id: clase.id, vidaUtilTecnicaAnios: c.vidaUtilTecnicaAnios });
  }
  parametroRepo.guardar(db, entidad.id, PARAMETROS_SEMILLA, ahora);
  convencionRepo.guardar(db, entidad.id, SEGMENTOS_DEMO, 3, ahora);
  abreviaturaRepo.reemplazar(db, entidad.id, ABREVIATURAS_SUGERIDAS);

  // 50 bienes con hoja de vida. Todo bien nace ACTIVO (ADR-028).
  const insertarBien = ctx.sqlite.prepare(
    `INSERT INTO bien (id, proceso_id, codigo_institucional, placa, descripcion_funcional, clase_activo_id, marca, modelo, serie, sede_id, servicio_id, cantidad, estado_actual, condicion_tenencia, responsable_custodia, fecha_toma, funcionario_conteo, creado_en, actualizado_en)
     VALUES (@id, @procesoId, @codigo, @placa, @descripcion, @claseId, @marca, @modelo, @serie, @sedeId, @servicioId, 1, @estadoActual, 'PROPIO', @custodio, @fechaToma, 'Técnico de conteo (demo)', @ahora, @ahora)`,
  );
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
      procesoId: entidad.id,
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

  ctx.bitacora.registrar({ entidadAfectada: 'entidad', registroId: entidad.id, accion: 'IMPORTAR', valorNuevo: `Hospital de demostración cargado: ${demo.bienes.length} bienes, ${demo.sedes.length} sedes` });
  return entidad;
}

export function borrarDemostracion(e: EntradaValidadaDe<'demo:borrar'>, ctx: ContextoIpc): { eliminados: Record<string, number> } {
  const entidad = procesoRepo.porId(ctx.db, e.procesoId);
  if (entidad === null) throw new ErrorValidacion('PROCESO_INEXISTENTE', 'El proceso no existe.', { campo: 'procesoId' });
  if (!entidad.esDemostracion) {
    throw new ErrorReglaNegocio('NO_ES_DEMOSTRACION', 'Solo el proceso de demostración se borra con este botón; un proceso real se elimina desde su propia pantalla, y solo mientras está en curso.');
  }
  const eliminados = borrarProcesoCompleto(ctx, e.procesoId, { conBitacora: true });
  return { eliminados };
}
