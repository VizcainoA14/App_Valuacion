CREATE TABLE `abreviatura_tipo` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`abreviatura` text NOT NULL,
	`descripcion` text NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_abreviatura` ON `abreviatura_tipo` (`proceso_id`,`abreviatura`);--> statement-breakpoint
CREATE TABLE `clase_activo` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`subcuenta_contable` text NOT NULL,
	`vida_util_contable_meses` integer,
	`vida_util_tecnica_anios_x10k` integer,
	`es_depreciable` integer DEFAULT true NOT NULL,
	`requiere_hoja_vida` integer DEFAULT false NOT NULL,
	`requiere_invima` integer DEFAULT false NOT NULL,
	`responsable_tecnico` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_clase_depreciable" CHECK("clase_activo"."es_depreciable" IN (0, 1)),
	CONSTRAINT "chk_clase_hoja_vida" CHECK("clase_activo"."requiere_hoja_vida" IN (0, 1)),
	CONSTRAINT "chk_clase_invima" CHECK("clase_activo"."requiere_invima" IN (0, 1)),
	CONSTRAINT "chk_clase_activo" CHECK("clase_activo"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_clase_codigo` ON `clase_activo` (`proceso_id`,`codigo`);--> statement-breakpoint
CREATE TABLE `convencion_codigo` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`segmentos_json` text NOT NULL,
	`longitud_consecutivo` integer NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_convencion_proceso` ON `convencion_codigo` (`proceso_id`);--> statement-breakpoint
CREATE TABLE `parametro_calculo` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`clave` text NOT NULL,
	`valor` text NOT NULL,
	`tipo_dato` text NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_parametro_tipo" CHECK("parametro_calculo"."tipo_dato" IN ('texto', 'numero', 'booleano', 'enum'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_parametro_clave` ON `parametro_calculo` (`proceso_id`,`clave`);--> statement-breakpoint
CREATE TABLE `proceso` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`fecha_corte` text NOT NULL,
	`estado` text DEFAULT 'EN_CURSO' NOT NULL,
	`finalizado_en` text,
	`razon_social` text NOT NULL,
	`nit` text NOT NULL,
	`municipio` text NOT NULL,
	`departamento` text NOT NULL,
	`nivel_complejidad` text NOT NULL,
	`nombre_gerente` text NOT NULL,
	`acto_nombramiento_gerente` text,
	`direccion` text NOT NULL,
	`telefono` text,
	`email` text,
	`logo_url` text,
	`es_demostracion` integer DEFAULT false NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "chk_proceso_estado" CHECK("proceso"."estado" IN ('EN_CURSO', 'FINALIZADO')),
	CONSTRAINT "chk_proceso_nivel" CHECK("proceso"."nivel_complejidad" IN ('I', 'II', 'III')),
	CONSTRAINT "chk_proceso_demo" CHECK("proceso"."es_demostracion" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_proceso_estado` ON `proceso` (`estado`,`creado_en`);--> statement-breakpoint
CREATE TABLE `sede` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`direccion` text NOT NULL,
	`municipio` text NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_sede_activa" CHECK("sede"."activa" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sede_codigo` ON `sede` (`proceso_id`,`codigo`);--> statement-breakpoint
CREATE TABLE `servicio` (
	`id` text PRIMARY KEY NOT NULL,
	`sede_id` text NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`responsable` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sede_id`) REFERENCES `sede`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_servicio_tipo" CHECK("servicio"."tipo" IN ('asistencial', 'administrativo', 'apoyo')),
	CONSTRAINT "chk_servicio_activo" CHECK("servicio"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_servicio_codigo` ON `servicio` (`sede_id`,`codigo`);--> statement-breakpoint
CREATE TABLE `barrido` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`fecha` text NOT NULL,
	`archivo` text NOT NULL,
	`archivo_conservado` text NOT NULL,
	`hash_sha256` text NOT NULL,
	`bienes_nuevos` integer NOT NULL,
	`bienes_actualizados` integer NOT NULL,
	`bienes_no_encontrados` integer NOT NULL,
	`servicios_recorridos` integer NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_barrido_nuevos" CHECK("barrido"."bienes_nuevos" >= 0),
	CONSTRAINT "chk_barrido_actualizados" CHECK("barrido"."bienes_actualizados" >= 0),
	CONSTRAINT "chk_barrido_no_encontrados" CHECK("barrido"."bienes_no_encontrados" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_barrido_proceso` ON `barrido` (`proceso_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `bien` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`codigo_institucional` text NOT NULL,
	`placa` text NOT NULL,
	`descripcion_funcional` text NOT NULL,
	`clase_activo_id` text NOT NULL,
	`marca` text,
	`modelo` text,
	`serie` text,
	`sede_id` text NOT NULL,
	`servicio_id` text NOT NULL,
	`cantidad` integer DEFAULT 1 NOT NULL,
	`estado_actual` text NOT NULL,
	`condicion_tenencia` text NOT NULL,
	`responsable_custodia` text,
	`fecha_toma` text NOT NULL,
	`funcionario_conteo` text NOT NULL,
	`observaciones` text,
	`estado_registro` text DEFAULT 'ACTIVO' NOT NULL,
	`ultimo_barrido_id` text,
	`obsolescencia_funcional` integer DEFAULT false NOT NULL,
	`justificacion_funcional` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`clase_activo_id`) REFERENCES `clase_activo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sede_id`) REFERENCES `sede`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servicio_id`) REFERENCES `servicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`ultimo_barrido_id`) REFERENCES `barrido`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_bien_estado_actual" CHECK("bien"."estado_actual" IN ('BUENO', 'REGULAR', 'MALO', 'INSERVIBLE')),
	CONSTRAINT "chk_bien_tenencia" CHECK("bien"."condicion_tenencia" IN ('PROPIO', 'COMODATO', 'ARRENDADO', 'TERCERO')),
	CONSTRAINT "chk_bien_estado_registro" CHECK("bien"."estado_registro" IN ('ACTIVO', 'NO_ENCONTRADO', 'DADO_DE_BAJA')),
	CONSTRAINT "chk_bien_funcional" CHECK("bien"."obsolescencia_funcional" IN (0, 1)),
	CONSTRAINT "chk_bien_cantidad" CHECK("bien"."cantidad" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bien_codigo` ON `bien` (`proceso_id`,`codigo_institucional`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bien_placa` ON `bien` (`proceso_id`,`placa`);--> statement-breakpoint
CREATE INDEX `ix_bien_clase` ON `bien` (`proceso_id`,`clase_activo_id`);--> statement-breakpoint
CREATE INDEX `ix_bien_servicio` ON `bien` (`proceso_id`,`servicio_id`);--> statement-breakpoint
CREATE INDEX `ix_bien_serie` ON `bien` (`serie`);--> statement-breakpoint
CREATE INDEX `ix_bien_estado` ON `bien` (`proceso_id`,`estado_registro`);--> statement-breakpoint
CREATE TABLE `hoja_vida` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`tipo_instalacion` text,
	`registro_invima` text,
	`especificaciones` text,
	`fabricante` text,
	`pais_origen` text,
	`estado_operativo` text NOT NULL,
	`forma_adquisicion` text NOT NULL,
	`fecha_adquisicion` text,
	`documento_adquisicion` text,
	`numero_factura` text,
	`proveedor` text,
	`costo_adquisicion_cent` integer,
	`adiciones_mejoras_cent` integer DEFAULT 0 NOT NULL,
	`fuente_financiacion` text,
	`fecha_puesta_servicio` text,
	`vida_util_tecnica_override_x10k` integer,
	`justificacion_override` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_hv_instalacion" CHECK("hoja_vida"."tipo_instalacion" IN ('FIJO', 'MOVIL')),
	CONSTRAINT "chk_hv_operativo" CHECK("hoja_vida"."estado_operativo" IN ('OPERATIVO', 'NO_OPERATIVO', 'FUERA_SERVICIO')),
	CONSTRAINT "chk_hv_adquisicion" CHECK("hoja_vida"."forma_adquisicion" IN ('COMPRA', 'DONACION', 'COMODATO', 'REPOSICION', 'TRASLADO')),
	CONSTRAINT "chk_hv_adiciones" CHECK("hoja_vida"."adiciones_mejoras_cent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_hoja_vida_bien` ON `hoja_vida` (`bien_id`);--> statement-breakpoint
CREATE TABLE `mantenimiento` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`fecha` text NOT NULL,
	`tipo` text NOT NULL,
	`descripcion` text NOT NULL,
	`ejecutado_por` text,
	`costo_cent` integer,
	`resultado` text,
	`soporte_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_mantenimiento_bien` ON `mantenimiento` (`bien_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `soporte_documental` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`tipo_documento` text NOT NULL,
	`url` text NOT NULL,
	`hash_sha256` text NOT NULL,
	`cargado_en` text NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_soporte_bien` ON `soporte_documental` (`bien_id`);--> statement-breakpoint
CREATE TABLE `calculo_depreciacion` (
	`id` text PRIMARY KEY NOT NULL,
	`corte_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`valor_adquisicion_cent` integer NOT NULL,
	`adiciones_mejoras_cent` integer DEFAULT 0 NOT NULL,
	`saldo_final_ajustado_cent` integer NOT NULL,
	`valor_residual_cent` integer DEFAULT 0 NOT NULL,
	`base_depreciable_cent` integer NOT NULL,
	`fecha_inicio_depreciacion` text NOT NULL,
	`vida_util_meses` integer NOT NULL,
	`depreciacion_mensual_x10k` integer NOT NULL,
	`meses_transcurridos_x10k` integer NOT NULL,
	`metodo_conteo_aplicado` text NOT NULL,
	`depreciacion_acumulada_cent` integer NOT NULL,
	`deterioro_cent` integer DEFAULT 0 NOT NULL,
	`saldo_por_depreciar_cent` integer NOT NULL,
	`valor_neto_libros_cent` integer NOT NULL,
	`totalmente_depreciado` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`corte_id`) REFERENCES `corte`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_dep_metodo" CHECK("calculo_depreciacion"."metodo_conteo_aplicado" IN ('mes_completo', 'dias_exactos', 'fraccion_anual')),
	CONSTRAINT "chk_dep_total" CHECK("calculo_depreciacion"."totalmente_depreciado" IN (0, 1)),
	CONSTRAINT "chk_dep_tope" CHECK("calculo_depreciacion"."depreciacion_acumulada_cent" <= "calculo_depreciacion"."base_depreciable_cent"),
	CONSTRAINT "chk_dep_vida_util" CHECK("calculo_depreciacion"."vida_util_meses" > 0),
	CONSTRAINT "chk_dep_saldo" CHECK("calculo_depreciacion"."saldo_por_depreciar_cent" >= 0),
	CONSTRAINT "chk_dep_deterioro" CHECK("calculo_depreciacion"."deterioro_cent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_calc_dep_bien` ON `calculo_depreciacion` (`corte_id`,`bien_id`);--> statement-breakpoint
CREATE TABLE `calculo_exclusion` (
	`id` text PRIMARY KEY NOT NULL,
	`corte_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`ambito` text NOT NULL,
	`estado` text NOT NULL,
	`motivo` text NOT NULL,
	FOREIGN KEY (`corte_id`) REFERENCES `corte`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_exclusion_ambito" CHECK("calculo_exclusion"."ambito" IN ('GENERAL', 'OBSOLESCENCIA', 'DEPRECIACION')),
	CONSTRAINT "chk_exclusion_estado" CHECK("calculo_exclusion"."estado" IN ('NO_APLICA', 'NO_CALCULABLE', 'ERROR_DATOS'))
);
--> statement-breakpoint
CREATE INDEX `ix_calc_exclusion` ON `calculo_exclusion` (`corte_id`,`bien_id`);--> statement-breakpoint
CREATE TABLE `calculo_obsolescencia` (
	`id` text PRIMARY KEY NOT NULL,
	`corte_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`vida_util_tecnica_aplicada_x10k` integer NOT NULL,
	`edad_actual_anios_x10k` integer NOT NULL,
	`indice_obsolescencia_x10k` integer NOT NULL,
	`anios_restantes_x10k` integer NOT NULL,
	`fecha_fin_vida_util` text NOT NULL,
	`semaforo` text NOT NULL,
	`obsolescencia_funcional` integer DEFAULT false NOT NULL,
	`candidato_baja` integer DEFAULT false NOT NULL,
	`motivos_baja` text,
	FOREIGN KEY (`corte_id`) REFERENCES `corte`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_obs_semaforo" CHECK("calculo_obsolescencia"."semaforo" IN ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO')),
	CONSTRAINT "chk_obs_funcional" CHECK("calculo_obsolescencia"."obsolescencia_funcional" IN (0, 1)),
	CONSTRAINT "chk_obs_candidato" CHECK("calculo_obsolescencia"."candidato_baja" IN (0, 1)),
	CONSTRAINT "chk_obs_indice" CHECK("calculo_obsolescencia"."indice_obsolescencia_x10k" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_calc_obs_bien` ON `calculo_obsolescencia` (`corte_id`,`bien_id`);--> statement-breakpoint
CREATE INDEX `ix_calc_obs_semaforo` ON `calculo_obsolescencia` (`corte_id`,`semaforo`);--> statement-breakpoint
CREATE TABLE `corte` (
	`id` text PRIMARY KEY NOT NULL,
	`proceso_id` text NOT NULL,
	`fecha_corte` text NOT NULL,
	`parametros_json` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`proceso_id`) REFERENCES `proceso`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_corte_proceso` ON `corte` (`proceso_id`);--> statement-breakpoint
CREATE TABLE `baja` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`fecha` text NOT NULL,
	`causal` text NOT NULL,
	`justificacion` text NOT NULL,
	`referencia` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`anulada_en` text,
	`motivo_anulacion` text,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_baja_causal" CHECK("baja"."causal" IN ('OBSOLESCENCIA', 'INSERVIBLE', 'CASO_FORTUITO', 'DESUSO', 'DONACION_O_TRASLADO'))
);
--> statement-breakpoint
CREATE INDEX `ix_baja_bien` ON `baja` (`bien_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_baja_vigente` ON `baja` (`bien_id`) WHERE "baja"."anulada_en" IS NULL;--> statement-breakpoint
CREATE TABLE `bitacora` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_afectada` text NOT NULL,
	`registro_id` text NOT NULL,
	`accion` text NOT NULL,
	`campo` text,
	`valor_anterior` text,
	`valor_nuevo` text,
	`fecha` text NOT NULL,
	`origen` text NOT NULL,
	`justificacion` text,
	CONSTRAINT "chk_bitacora_accion" CHECK("bitacora"."accion" IN ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CALCULAR', 'APROBAR', 'RECHAZAR', 'IMPORTAR', 'EXPORTAR', 'CERRAR'))
);
--> statement-breakpoint
CREATE INDEX `ix_bitacora_registro` ON `bitacora` (`entidad_afectada`,`registro_id`);--> statement-breakpoint
CREATE INDEX `ix_bitacora_fecha` ON `bitacora` (`fecha`);