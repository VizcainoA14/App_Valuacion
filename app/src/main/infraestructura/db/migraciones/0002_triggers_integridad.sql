-- GENERADO por scripts/generar-triggers.ts. NO EDITAR A MANO: npm run db:triggers.
-- Reglas de integridad que no caben en un CHECK, máquina de estados del bien
-- e inmutabilidad: cortes, barridos y bitácora (ADR-028) y el proceso finalizado (ADR-029).

-- ── Reglas puntuales ──
--> statement-breakpoint
CREATE TRIGGER `trg_int02_bien_proceso` BEFORE UPDATE OF proceso_id ON `bien`
WHEN NEW.proceso_id <> OLD.proceso_id
BEGIN
	SELECT RAISE(ABORT, 'INT-02: un bien no puede cambiar de proceso');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_int03_bien_delete` BEFORE DELETE ON `bien`
WHEN (SELECT p.es_demostracion FROM proceso p WHERE p.id = OLD.proceso_id) = 0
BEGIN
	SELECT RAISE(ABORT, 'INT-03: un bien no se elimina; cambie su estado (RN-09-09)');
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
CREATE TRIGGER `trg_baja_inmutable` BEFORE UPDATE ON `baja`
WHEN OLD.anulada_en IS NOT NULL
	OR NEW.bien_id IS NOT OLD.bien_id
	OR NEW.fecha IS NOT OLD.fecha
	OR NEW.causal IS NOT OLD.causal
	OR NEW.justificacion IS NOT OLD.justificacion
	OR NEW.referencia IS NOT OLD.referencia
	OR NEW.anulada_en IS NULL
	OR NEW.motivo_anulacion IS NULL OR trim(NEW.motivo_anulacion) = ''
BEGIN
	SELECT RAISE(ABORT, 'Una baja registrada solo se anula, con motivo; no se modifica');
END;
--> statement-breakpoint
-- ── Máquina de estados del bien (ADR-028) ──
--> statement-breakpoint
CREATE TRIGGER `trg_estado_bien_inicial` BEFORE INSERT ON `bien`
WHEN NEW.estado_registro <> 'ACTIVO'
BEGIN
	SELECT RAISE(ABORT, 'Bien: todo registro nace en ACTIVO (ADR-028)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_bien_transicion` BEFORE UPDATE OF estado_registro ON `bien`
WHEN NEW.estado_registro <> OLD.estado_registro AND NOT (
	(OLD.estado_registro = 'ACTIVO' AND NEW.estado_registro IN ('NO_ENCONTRADO', 'DADO_DE_BAJA'))
	OR (OLD.estado_registro = 'NO_ENCONTRADO' AND NEW.estado_registro IN ('ACTIVO', 'DADO_DE_BAJA'))
	OR (OLD.estado_registro = 'DADO_DE_BAJA' AND NEW.estado_registro IN ('ACTIVO'))
)
BEGIN
	SELECT RAISE(ABORT, 'Bien: transición de estado_registro no permitida (ADR-028)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_proceso_inicial` BEFORE INSERT ON `proceso`
WHEN NEW.estado <> 'EN_CURSO'
BEGIN
	SELECT RAISE(ABORT, 'Proceso: todo registro nace en EN_CURSO (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_estado_proceso_transicion` BEFORE UPDATE OF estado ON `proceso`
WHEN NEW.estado <> OLD.estado AND NOT (
	(OLD.estado = 'EN_CURSO' AND NEW.estado IN ('FINALIZADO'))
)
BEGIN
	SELECT RAISE(ABORT, 'Proceso: transición de estado no permitida (ADR-029)');
END;
--> statement-breakpoint
-- ── Inmutabilidad: 6 tablas ──
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_barrido_upd` BEFORE UPDATE ON `barrido`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'barrido: lo registrado no se modifica');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_bitacora_upd` BEFORE UPDATE ON `bitacora`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'bitacora: lo registrado no se modifica');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_calculo_depreciacion_upd` BEFORE UPDATE ON `calculo_depreciacion`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'calculo_depreciacion: lo registrado no se modifica');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_calculo_exclusion_upd` BEFORE UPDATE ON `calculo_exclusion`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'calculo_exclusion: lo registrado no se modifica');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_calculo_obsolescencia_upd` BEFORE UPDATE ON `calculo_obsolescencia`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'calculo_obsolescencia: lo registrado no se modifica');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_inmutable_corte_upd` BEFORE UPDATE ON `corte`
WHEN 1
BEGIN
	SELECT RAISE(ABORT, 'corte: lo registrado no se modifica');
END;
--> statement-breakpoint
-- ── Proceso finalizado: solo lectura (ADR-029) ──
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_abreviatura_tipo_ins` BEFORE INSERT ON `abreviatura_tipo`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_abreviatura_tipo_upd` BEFORE UPDATE ON `abreviatura_tipo`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_abreviatura_tipo_del` BEFORE DELETE ON `abreviatura_tipo`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_baja_ins` BEFORE INSERT ON `baja`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_baja_upd` BEFORE UPDATE ON `baja`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_baja_del` BEFORE DELETE ON `baja`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_barrido_ins` BEFORE INSERT ON `barrido`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_barrido_upd` BEFORE UPDATE ON `barrido`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_barrido_del` BEFORE DELETE ON `barrido`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_bien_ins` BEFORE INSERT ON `bien`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_bien_upd` BEFORE UPDATE ON `bien`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_bien_del` BEFORE DELETE ON `bien`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_depreciacion_ins` BEFORE INSERT ON `calculo_depreciacion`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_depreciacion_upd` BEFORE UPDATE ON `calculo_depreciacion`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_depreciacion_del` BEFORE DELETE ON `calculo_depreciacion`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_exclusion_ins` BEFORE INSERT ON `calculo_exclusion`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_exclusion_upd` BEFORE UPDATE ON `calculo_exclusion`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_exclusion_del` BEFORE DELETE ON `calculo_exclusion`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_obsolescencia_ins` BEFORE INSERT ON `calculo_obsolescencia`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_obsolescencia_upd` BEFORE UPDATE ON `calculo_obsolescencia`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = NEW.corte_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_calculo_obsolescencia_del` BEFORE DELETE ON `calculo_obsolescencia`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT c.proceso_id FROM corte c WHERE c.id = OLD.corte_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_clase_activo_ins` BEFORE INSERT ON `clase_activo`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_clase_activo_upd` BEFORE UPDATE ON `clase_activo`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_clase_activo_del` BEFORE DELETE ON `clase_activo`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_convencion_codigo_ins` BEFORE INSERT ON `convencion_codigo`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_convencion_codigo_upd` BEFORE UPDATE ON `convencion_codigo`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_convencion_codigo_del` BEFORE DELETE ON `convencion_codigo`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_corte_ins` BEFORE INSERT ON `corte`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_corte_upd` BEFORE UPDATE ON `corte`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_corte_del` BEFORE DELETE ON `corte`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_hoja_vida_ins` BEFORE INSERT ON `hoja_vida`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_hoja_vida_upd` BEFORE UPDATE ON `hoja_vida`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_hoja_vida_del` BEFORE DELETE ON `hoja_vida`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_mantenimiento_ins` BEFORE INSERT ON `mantenimiento`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_mantenimiento_upd` BEFORE UPDATE ON `mantenimiento`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_mantenimiento_del` BEFORE DELETE ON `mantenimiento`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_parametro_calculo_ins` BEFORE INSERT ON `parametro_calculo`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_parametro_calculo_upd` BEFORE UPDATE ON `parametro_calculo`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_parametro_calculo_del` BEFORE DELETE ON `parametro_calculo`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_proceso_upd` BEFORE UPDATE ON `proceso`
WHEN OLD.estado = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_proceso_del` BEFORE DELETE ON `proceso`
WHEN OLD.estado = 'FINALIZADO' AND OLD.es_demostracion = 0
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_sede_ins` BEFORE INSERT ON `sede`
WHEN (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_sede_upd` BEFORE UPDATE ON `sede`
WHEN (SELECT estado FROM proceso WHERE id = OLD.proceso_id) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = NEW.proceso_id) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_sede_del` BEFORE DELETE ON `sede`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = OLD.proceso_id) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_servicio_ins` BEFORE INSERT ON `servicio`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT s.proceso_id FROM sede s WHERE s.id = NEW.sede_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_servicio_upd` BEFORE UPDATE ON `servicio`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT s.proceso_id FROM sede s WHERE s.id = OLD.sede_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT s.proceso_id FROM sede s WHERE s.id = NEW.sede_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_servicio_del` BEFORE DELETE ON `servicio`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT s.proceso_id FROM sede s WHERE s.id = OLD.sede_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_soporte_documental_ins` BEFORE INSERT ON `soporte_documental`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_soporte_documental_upd` BEFORE UPDATE ON `soporte_documental`
WHEN (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 'FINALIZADO' OR (SELECT estado FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = NEW.bien_id)) = 'FINALIZADO'
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_finalizado_soporte_documental_del` BEFORE DELETE ON `soporte_documental`
WHEN (SELECT estado = 'FINALIZADO' AND es_demostracion = 0 FROM proceso WHERE id = (SELECT b.proceso_id FROM bien b WHERE b.id = OLD.bien_id)) = 1
BEGIN
	SELECT RAISE(ABORT, 'El proceso está FINALIZADO y es de solo lectura (ADR-029)');
END;
