-- GENERADO por scripts/generar-triggers.ts (T-B-04). NO EDITAR A MANO: npm run db:triggers.
-- Reglas de integridad ANEXO_B §8 que no caben en un CHECK, máquinas de estado ANEXO_B §6
-- e inmutabilidad del ejercicio cerrado (INT-09, ADR-017) sobre TODAS las tablas del ejercicio.

-- ── INT-02 … INT-08, INT-10 y RN-10-07 ──
--> statement-breakpoint
CREATE TRIGGER `trg_int02_bien_ejercicio` BEFORE UPDATE OF ejercicio_id ON `bien`
WHEN NEW.ejercicio_id <> OLD.ejercicio_id
BEGIN
	SELECT RAISE(ABORT, 'INT-02: un bien no puede cambiar de ejercicio');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int03_bien_delete` BEFORE DELETE ON `bien`
WHEN (SELECT e.es_demostracion FROM ejercicio j JOIN entidad e ON e.id = j.entidad_id WHERE j.id = OLD.ejercicio_id) = 0
BEGIN
	SELECT RAISE(ABORT, 'INT-03: un bien no se elimina; cambie su estado (RN-09-09)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int04_hoja_vida_insert` BEFORE INSERT ON `hoja_vida`
WHEN NEW.fecha_adquisicion IS NOT NULL AND NEW.fecha_adquisicion > (SELECT j.fecha_corte FROM bien b JOIN ejercicio j ON j.id = b.ejercicio_id WHERE b.id = NEW.bien_id)
BEGIN
	SELECT RAISE(ABORT, 'INT-04: fecha_adquisicion posterior a la fecha de corte del ejercicio');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int04_hoja_vida_update` BEFORE UPDATE OF fecha_adquisicion, bien_id ON `hoja_vida`
WHEN NEW.fecha_adquisicion IS NOT NULL AND NEW.fecha_adquisicion > (SELECT j.fecha_corte FROM bien b JOIN ejercicio j ON j.id = b.ejercicio_id WHERE b.id = NEW.bien_id)
BEGIN
	SELECT RAISE(ABORT, 'INT-04: fecha_adquisicion posterior a la fecha de corte del ejercicio');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int04_ejercicio_fecha_corte` BEFORE UPDATE OF fecha_corte ON `ejercicio`
WHEN EXISTS (SELECT 1 FROM hoja_vida h JOIN bien b ON b.id = h.bien_id WHERE b.ejercicio_id = NEW.id AND h.fecha_adquisicion > NEW.fecha_corte)
BEGIN
	SELECT RAISE(ABORT, 'INT-04: hay bienes adquiridos después de la nueva fecha de corte');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int07_propuesta_insert` BEFORE INSERT ON `propuesta_baja`
WHEN NEW.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA') AND NEW.acta_comite_id IS NULL
BEGIN
	SELECT RAISE(ABORT, 'INT-07: una baja ejecutada exige acta del Comité');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int07_propuesta_update` BEFORE UPDATE OF estado_aprobacion, acta_comite_id ON `propuesta_baja`
WHEN NEW.estado_aprobacion IN ('EJECUTADO', 'DISPOSICION_DOCUMENTADA') AND NEW.acta_comite_id IS NULL
BEGIN
	SELECT RAISE(ABORT, 'INT-07: una baja ejecutada exige acta del Comité');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int08_acto_insert` BEFORE INSERT ON `acto_administrativo`
WHEN NEW.estado IN ('FIRMADO', 'PUBLICADO') AND NEW.acta_comite_id IS NULL
BEGIN
	SELECT RAISE(ABORT, 'INT-08: un acto firmado exige acta del Comité');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int08_acto_update` BEFORE UPDATE OF estado, acta_comite_id ON `acto_administrativo`
WHEN NEW.estado IN ('FIRMADO', 'PUBLICADO') AND NEW.acta_comite_id IS NULL
BEGIN
	SELECT RAISE(ABORT, 'INT-08: un acto firmado exige acta del Comité');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_rn1007_acto_congelado` BEFORE UPDATE ON `acto_administrativo`
WHEN OLD.inmutable = 1 AND (
	NEW.inmutable = 0
	OR NEW.contenido_generado IS NOT OLD.contenido_generado
	OR NEW.epigrafe IS NOT OLD.epigrafe
	OR NEW.numero IS NOT OLD.numero
	OR NEW.fecha IS NOT OLD.fecha
	OR NEW.tipo_resolucion IS NOT OLD.tipo_resolucion
	OR NEW.acta_comite_id IS NOT OLD.acta_comite_id
	OR NEW.firmo_responsable_id IS NOT OLD.firmo_responsable_id
	OR NEW.fecha_firma IS NOT OLD.fecha_firma
)
BEGIN
	SELECT RAISE(ABORT, 'RN-10-07: un acto firmado es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_rnf07_bitacora_justificacion` BEFORE INSERT ON `bitacora`
WHEN NEW.accion = 'ACTUALIZAR' AND NEW.campo IN ('costo_adquisicion', 'fecha_adquisicion', 'clase_activo_id', 'valor_avaluo_final', 'vida_util_tecnica_override', 'deterioro', 'causal_baja', 'fecha_corte') AND (NEW.justificacion IS NULL OR trim(NEW.justificacion) = '')
BEGIN
	SELECT RAISE(ABORT, 'RNF-07: modificar un campo sensible exige justificación (ANEXO_B §7.1)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int10_calculo_dep_insert` BEFORE INSERT ON `calculo_depreciacion`
WHEN (SELECT c.es_depreciable FROM bien b JOIN clase_activo c ON c.id = b.clase_activo_id WHERE b.id = NEW.bien_id) = 0
BEGIN
	SELECT RAISE(ABORT, 'INT-10: la clase del bien no es depreciable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int10_calculo_dep_update` BEFORE UPDATE OF bien_id ON `calculo_depreciacion`
WHEN (SELECT c.es_depreciable FROM bien b JOIN clase_activo c ON c.id = b.clase_activo_id WHERE b.id = NEW.bien_id) = 0
BEGIN
	SELECT RAISE(ABORT, 'INT-10: la clase del bien no es depreciable');
END;
--> statement-breakpoint
-- ── Máquinas de estado (ANEXO_B §6) ──
--> statement-breakpoint
CREATE TRIGGER `trg_estado_ejercicio_inicial` BEFORE INSERT ON `ejercicio`
WHEN NEW.estado <> 'ABIERTO'
BEGIN
	SELECT RAISE(ABORT, 'Ejercicio: todo registro nace en ABIERTO (ANEXO_B §6.1)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_ejercicio_transicion` BEFORE UPDATE OF estado ON `ejercicio`
WHEN NEW.estado <> OLD.estado AND NOT (
	(OLD.estado = 'ABIERTO' AND NEW.estado IN ('EN_LEVANTAMIENTO'))
	OR (OLD.estado = 'EN_LEVANTAMIENTO' AND NEW.estado IN ('EN_CONCILIACION'))
	OR (OLD.estado = 'EN_CONCILIACION' AND NEW.estado IN ('EN_CALCULO'))
	OR (OLD.estado = 'EN_CALCULO' AND NEW.estado IN ('EN_VALUACION'))
	OR (OLD.estado = 'EN_VALUACION' AND NEW.estado IN ('EN_APROBACION'))
	OR (OLD.estado = 'EN_APROBACION' AND NEW.estado IN ('CERRADO'))
)
BEGIN
	SELECT RAISE(ABORT, 'Ejercicio: transición de estado no permitida (ANEXO_B §6.1)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_bien_inicial` BEFORE INSERT ON `bien`
WHEN NEW.estado_registro <> 'BORRADOR'
BEGIN
	SELECT RAISE(ABORT, 'Bien: todo registro nace en BORRADOR (ANEXO_B §6.2)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_bien_transicion` BEFORE UPDATE OF estado_registro ON `bien`
WHEN NEW.estado_registro <> OLD.estado_registro AND NOT (
	(OLD.estado_registro = 'BORRADOR' AND NEW.estado_registro IN ('VALIDADO', 'INCOMPLETO'))
	OR (OLD.estado_registro = 'VALIDADO' AND NEW.estado_registro IN ('ACTIVO', 'INCOMPLETO'))
	OR (OLD.estado_registro = 'ACTIVO' AND NEW.estado_registro IN ('PROPUESTO_BAJA', 'INCOMPLETO'))
	OR (OLD.estado_registro = 'INCOMPLETO' AND NEW.estado_registro IN ('VALIDADO', 'ACTIVO'))
	OR (OLD.estado_registro = 'PROPUESTO_BAJA' AND NEW.estado_registro IN ('DADO_DE_BAJA', 'ACTIVO'))
)
BEGIN
	SELECT RAISE(ABORT, 'Bien: transición de estado_registro no permitida (ANEXO_B §6.2)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_propuesta_baja_inicial` BEFORE INSERT ON `propuesta_baja`
WHEN NEW.estado_aprobacion <> 'PROPUESTO'
BEGIN
	SELECT RAISE(ABORT, 'Propuesta de baja: todo registro nace en PROPUESTO (ANEXO_B §6.3)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_propuesta_baja_transicion` BEFORE UPDATE OF estado_aprobacion ON `propuesta_baja`
WHEN NEW.estado_aprobacion <> OLD.estado_aprobacion AND NOT (
	(OLD.estado_aprobacion = 'PROPUESTO' AND NEW.estado_aprobacion IN ('EN_REVISION'))
	OR (OLD.estado_aprobacion = 'EN_REVISION' AND NEW.estado_aprobacion IN ('APROBADO_COMITE', 'RECHAZADO'))
	OR (OLD.estado_aprobacion = 'APROBADO_COMITE' AND NEW.estado_aprobacion IN ('RESOLUCION_EMITIDA'))
	OR (OLD.estado_aprobacion = 'RESOLUCION_EMITIDA' AND NEW.estado_aprobacion IN ('EJECUTADO'))
	OR (OLD.estado_aprobacion = 'EJECUTADO' AND NEW.estado_aprobacion IN ('DISPOSICION_DOCUMENTADA'))
)
BEGIN
	SELECT RAISE(ABORT, 'Propuesta de baja: transición de estado_aprobacion no permitida (ANEXO_B §6.3)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_acto_administrativo_inicial` BEFORE INSERT ON `acto_administrativo`
WHEN NEW.estado <> 'PROYECTADO'
BEGIN
	SELECT RAISE(ABORT, 'Acto administrativo: todo registro nace en PROYECTADO (ANEXO_B §6.4)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_acto_administrativo_transicion` BEFORE UPDATE OF estado ON `acto_administrativo`
WHEN NEW.estado <> OLD.estado AND NOT (
	(OLD.estado = 'PROYECTADO' AND NEW.estado IN ('EN_REVISION_JURIDICA'))
	OR (OLD.estado = 'EN_REVISION_JURIDICA' AND NEW.estado IN ('APROBADO_COMITE'))
	OR (OLD.estado = 'APROBADO_COMITE' AND NEW.estado IN ('FIRMADO'))
	OR (OLD.estado = 'FIRMADO' AND NEW.estado IN ('PUBLICADO'))
)
BEGIN
	SELECT RAISE(ABORT, 'Acto administrativo: transición de estado no permitida (ANEXO_B §6.4)');
END;
--> statement-breakpoint
-- ── INT-09: 98 triggers sobre 33 tablas (incluido ejercicio) ──
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_comite_ins` BEFORE INSERT ON `acta_comite`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_comite_upd` BEFORE UPDATE ON `acta_comite`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_comite_del` BEFORE DELETE ON `acta_comite`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_custodia_ins` BEFORE INSERT ON `acta_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_custodia_upd` BEFORE UPDATE ON `acta_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_custodia_del` BEFORE DELETE ON `acta_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_entrega_ins` BEFORE INSERT ON `acta_entrega`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_entrega_upd` BEFORE UPDATE ON `acta_entrega`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acta_entrega_del` BEFORE DELETE ON `acta_entrega`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_activo_contable_ins` BEFORE INSERT ON `activo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_activo_contable_upd` BEFORE UPDATE ON `activo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_activo_contable_del` BEFORE DELETE ON `activo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acto_administrativo_ins` BEFORE INSERT ON `acto_administrativo`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acto_administrativo_upd` BEFORE UPDATE ON `acto_administrativo`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_acto_administrativo_del` BEFORE DELETE ON `acto_administrativo`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_avaluo_inmueble_ins` BEFORE INSERT ON `avaluo_inmueble`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_avaluo_inmueble_upd` BEFORE UPDATE ON `avaluo_inmueble`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_avaluo_inmueble_del` BEFORE DELETE ON `avaluo_inmueble`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_ins` BEFORE INSERT ON `bien`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_upd` BEFORE UPDATE ON `bien`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_del` BEFORE DELETE ON `bien`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_en_custodia_ins` BEFORE INSERT ON `bien_en_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_en_custodia_upd` BEFORE UPDATE ON `bien_en_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bien_en_custodia_del` BEFORE DELETE ON `bien_en_custodia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bitacora_ins` BEFORE INSERT ON `bitacora`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO' AND NEW.accion <> 'EXPORTAR'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bitacora_upd` BEFORE UPDATE ON `bitacora`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_bitacora_del` BEFORE DELETE ON `bitacora`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_depreciacion_ins` BEFORE INSERT ON `calculo_depreciacion`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_depreciacion_upd` BEFORE UPDATE ON `calculo_depreciacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_depreciacion_del` BEFORE DELETE ON `calculo_depreciacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_obsolescencia_ins` BEFORE INSERT ON `calculo_obsolescencia`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_obsolescencia_upd` BEFORE UPDATE ON `calculo_obsolescencia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_calculo_obsolescencia_del` BEFORE DELETE ON `calculo_obsolescencia`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_capacitacion_ins` BEFORE INSERT ON `capacitacion`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_capacitacion_upd` BEFORE UPDATE ON `capacitacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_capacitacion_del` BEFORE DELETE ON `capacitacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_cierre_ejercicio_ins` BEFORE INSERT ON `cierre_ejercicio`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_cierre_ejercicio_upd` BEFORE UPDATE ON `cierre_ejercicio`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_cierre_ejercicio_del` BEFORE DELETE ON `cierre_ejercicio`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_conciliacion_ins` BEFORE INSERT ON `conciliacion`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_conciliacion_upd` BEFORE UPDATE ON `conciliacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_conciliacion_del` BEFORE DELETE ON `conciliacion`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_consolidado_subcuenta_ins` BEFORE INSERT ON `consolidado_subcuenta`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_consolidado_subcuenta_upd` BEFORE UPDATE ON `consolidado_subcuenta`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_consolidado_subcuenta_del` BEFORE DELETE ON `consolidado_subcuenta`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_deterioro_ins` BEFORE INSERT ON `deterioro`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_deterioro_upd` BEFORE UPDATE ON `deterioro`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_deterioro_del` BEFORE DELETE ON `deterioro`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_disposicion_final_ins` BEFORE INSERT ON `disposicion_final`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_disposicion_final_upd` BEFORE UPDATE ON `disposicion_final`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.propuesta_baja_id) = 'CERRADO' OR (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_disposicion_final_del` BEFORE DELETE ON `disposicion_final`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_efecto_contable_baja_ins` BEFORE INSERT ON `efecto_contable_baja`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_efecto_contable_baja_upd` BEFORE UPDATE ON `efecto_contable_baja`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.propuesta_baja_id) = 'CERRADO' OR (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_efecto_contable_baja_del` BEFORE DELETE ON `efecto_contable_baja`
WHEN (SELECT j.estado FROM propuesta_baja v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.propuesta_baja_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_ejercicio_update` BEFORE UPDATE ON `ejercicio`
WHEN OLD.estado = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_ejercicio_delete` BEFORE DELETE ON `ejercicio`
WHEN OLD.estado = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_foto_bien_ins` BEFORE INSERT ON `foto_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_foto_bien_upd` BEFORE UPDATE ON `foto_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_foto_bien_del` BEFORE DELETE ON `foto_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_hoja_vida_ins` BEFORE INSERT ON `hoja_vida`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_hoja_vida_upd` BEFORE UPDATE ON `hoja_vida`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_hoja_vida_del` BEFORE DELETE ON `hoja_vida`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_mantenimiento_ins` BEFORE INSERT ON `mantenimiento`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_mantenimiento_upd` BEFORE UPDATE ON `mantenimiento`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_mantenimiento_del` BEFORE DELETE ON `mantenimiento`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_movimiento_bien_ins` BEFORE INSERT ON `movimiento_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_movimiento_bien_upd` BEFORE UPDATE ON `movimiento_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_movimiento_bien_del` BEFORE DELETE ON `movimiento_bien`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_oferta_comparable_ins` BEFORE INSERT ON `oferta_comparable`
WHEN (SELECT j.estado FROM avaluo_inmueble v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.avaluo_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_oferta_comparable_upd` BEFORE UPDATE ON `oferta_comparable`
WHEN (SELECT j.estado FROM avaluo_inmueble v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.avaluo_id) = 'CERRADO' OR (SELECT j.estado FROM avaluo_inmueble v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.avaluo_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_oferta_comparable_del` BEFORE DELETE ON `oferta_comparable`
WHEN (SELECT j.estado FROM avaluo_inmueble v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.avaluo_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_override_vida_util_ins` BEFORE INSERT ON `override_vida_util`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_override_vida_util_upd` BEFORE UPDATE ON `override_vida_util`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_override_vida_util_del` BEFORE DELETE ON `override_vida_util`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_partida_conciliatoria_ins` BEFORE INSERT ON `partida_conciliatoria`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_partida_conciliatoria_upd` BEFORE UPDATE ON `partida_conciliatoria`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_partida_conciliatoria_del` BEFORE DELETE ON `partida_conciliatoria`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_producto_contractual_ins` BEFORE INSERT ON `producto_contractual`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_producto_contractual_upd` BEFORE UPDATE ON `producto_contractual`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_producto_contractual_del` BEFORE DELETE ON `producto_contractual`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_propuesta_baja_ins` BEFORE INSERT ON `propuesta_baja`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_propuesta_baja_upd` BEFORE UPDATE ON `propuesta_baja`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_propuesta_baja_del` BEFORE DELETE ON `propuesta_baja`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_referencia_mercado_ins` BEFORE INSERT ON `referencia_mercado`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_referencia_mercado_upd` BEFORE UPDATE ON `referencia_mercado`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_referencia_mercado_del` BEFORE DELETE ON `referencia_mercado`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_saldo_contable_ins` BEFORE INSERT ON `saldo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_saldo_contable_upd` BEFORE UPDATE ON `saldo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_saldo_contable_del` BEFORE DELETE ON `saldo_contable`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_soporte_documental_ins` BEFORE INSERT ON `soporte_documental`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_soporte_documental_upd` BEFORE UPDATE ON `soporte_documental`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO' OR (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = NEW.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_soporte_documental_del` BEFORE DELETE ON `soporte_documental`
WHEN (SELECT j.estado FROM bien v JOIN ejercicio j ON j.id = v.ejercicio_id WHERE v.id = OLD.bien_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_valuacion_mueble_ins` BEFORE INSERT ON `valuacion_mueble`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_valuacion_mueble_upd` BEFORE UPDATE ON `valuacion_mueble`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_valuacion_mueble_del` BEFORE DELETE ON `valuacion_mueble`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_verificacion_cuadre_ins` BEFORE INSERT ON `verificacion_cuadre`
WHEN (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_verificacion_cuadre_upd` BEFORE UPDATE ON `verificacion_cuadre`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO' OR (SELECT estado FROM ejercicio WHERE id = NEW.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int09_verificacion_cuadre_del` BEFORE DELETE ON `verificacion_cuadre`
WHEN (SELECT estado FROM ejercicio WHERE id = OLD.ejercicio_id) = 'CERRADO'
BEGIN
	SELECT RAISE(ABORT, 'INT-09: el ejercicio está CERRADO y es inmutable');
END;
