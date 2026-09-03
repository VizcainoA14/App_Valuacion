CREATE TABLE `abreviatura_tipo` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`abreviatura` text NOT NULL,
	`descripcion` text NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_abreviatura` ON `abreviatura_tipo` (`entidad_id`,`abreviatura`);--> statement-breakpoint
CREATE TABLE `clase_activo` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
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
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_clase_depreciable" CHECK("clase_activo"."es_depreciable" IN (0, 1)),
	CONSTRAINT "chk_clase_hoja_vida" CHECK("clase_activo"."requiere_hoja_vida" IN (0, 1)),
	CONSTRAINT "chk_clase_invima" CHECK("clase_activo"."requiere_invima" IN (0, 1)),
	CONSTRAINT "chk_clase_activo" CHECK("clase_activo"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_clase_codigo` ON `clase_activo` (`entidad_id`,`codigo`);--> statement-breakpoint
CREATE TABLE `convencion_codigo` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`segmentos_json` text NOT NULL,
	`longitud_consecutivo` integer NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_convencion_entidad` ON `convencion_codigo` (`entidad_id`);--> statement-breakpoint
CREATE TABLE `ejercicio` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`nombre` text NOT NULL,
	`fecha_corte` text NOT NULL,
	`estado` text DEFAULT 'ABIERTO' NOT NULL,
	`paso_actual` integer DEFAULT 1 NOT NULL,
	`parametros_congelados_json` text NOT NULL,
	`contrato_numero` text,
	`creado_por_responsable_id` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cerrado_en` text,
	`inmutable` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`creado_por_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_ejercicio_estado" CHECK("ejercicio"."estado" IN ('ABIERTO', 'EN_LEVANTAMIENTO', 'EN_CONCILIACION', 'EN_CALCULO', 'EN_VALUACION', 'EN_APROBACION', 'CERRADO')),
	CONSTRAINT "chk_ejercicio_inmutable" CHECK("ejercicio"."inmutable" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_ejercicio_entidad` ON `ejercicio` (`entidad_id`,`fecha_corte`);--> statement-breakpoint
CREATE TABLE `entidad` (
	`id` text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "chk_entidad_nivel" CHECK("entidad"."nivel_complejidad" IN ('I', 'II', 'III')),
	CONSTRAINT "chk_entidad_demo" CHECK("entidad"."es_demostracion" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_entidad_nit` ON `entidad` (`nit`);--> statement-breakpoint
CREATE TABLE `factor_estado` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`estado` text NOT NULL,
	`factor_x10k` integer NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_factor_estado" CHECK("factor_estado"."estado" IN ('BUENO', 'REGULAR', 'MALO', 'INSERVIBLE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_factor_estado` ON `factor_estado` (`entidad_id`,`estado`);--> statement-breakpoint
CREATE TABLE `parametro_calculo` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`clave` text NOT NULL,
	`valor` text NOT NULL,
	`tipo_dato` text NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_parametro_tipo" CHECK("parametro_calculo"."tipo_dato" IN ('texto', 'numero', 'booleano', 'enum'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_parametro_clave` ON `parametro_calculo` (`entidad_id`,`clave`);--> statement-breakpoint
CREATE TABLE `responsable` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`nombre_completo` text NOT NULL,
	`documento_identidad` text NOT NULL,
	`perfil` text NOT NULL,
	`cargo` text NOT NULL,
	`tarjeta_profesional` text,
	`registro_raa` text,
	`es_externo` integer DEFAULT false NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_responsable_perfil" CHECK("responsable"."perfil" IN ('COORDINADOR', 'ESPECIALISTA_BIOMEDICO', 'ESPECIALISTA_SISTEMAS', 'ESPECIALISTA_FISICOS', 'CONTADOR', 'PERITO', 'MIEMBRO_COMITE', 'GERENTE', 'ASESOR_JURIDICO', 'SUPERVISOR')),
	CONSTRAINT "chk_responsable_externo" CHECK("responsable"."es_externo" IN (0, 1)),
	CONSTRAINT "chk_responsable_activo" CHECK("responsable"."activo" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_responsable_entidad` ON `responsable` (`entidad_id`,`perfil`);--> statement-breakpoint
CREATE TABLE `sede` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`direccion` text NOT NULL,
	`municipio` text NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_sede_activa" CHECK("sede"."activa" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sede_codigo` ON `sede` (`entidad_id`,`codigo`);--> statement-breakpoint
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
CREATE TABLE `acta_custodia` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`servicio_id` text NOT NULL,
	`responsable` text NOT NULL,
	`fecha` text NOT NULL,
	`documento_url` text,
	`estado_firma` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servicio_id`) REFERENCES `servicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_acta_custodia` ON `acta_custodia` (`ejercicio_id`,`servicio_id`);--> statement-breakpoint
CREATE TABLE `bien` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
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
	`estado_registro` text DEFAULT 'BORRADOR' NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`clase_activo_id`) REFERENCES `clase_activo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sede_id`) REFERENCES `sede`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servicio_id`) REFERENCES `servicio`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_bien_estado_actual" CHECK("bien"."estado_actual" IN ('BUENO', 'REGULAR', 'MALO', 'INSERVIBLE')),
	CONSTRAINT "chk_bien_tenencia" CHECK("bien"."condicion_tenencia" IN ('PROPIO', 'COMODATO', 'ARRENDADO', 'TERCERO')),
	CONSTRAINT "chk_bien_estado_registro" CHECK("bien"."estado_registro" IN ('BORRADOR', 'VALIDADO', 'ACTIVO', 'INCOMPLETO', 'PROPUESTO_BAJA', 'DADO_DE_BAJA')),
	CONSTRAINT "chk_bien_cantidad" CHECK("bien"."cantidad" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bien_codigo` ON `bien` (`ejercicio_id`,`codigo_institucional`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bien_placa` ON `bien` (`ejercicio_id`,`placa`);--> statement-breakpoint
CREATE INDEX `ix_bien_clase` ON `bien` (`ejercicio_id`,`clase_activo_id`);--> statement-breakpoint
CREATE INDEX `ix_bien_servicio` ON `bien` (`ejercicio_id`,`servicio_id`);--> statement-breakpoint
CREATE INDEX `ix_bien_serie` ON `bien` (`serie`);--> statement-breakpoint
CREATE INDEX `ix_bien_estado` ON `bien` (`ejercicio_id`,`estado_registro`);--> statement-breakpoint
CREATE TABLE `bien_en_custodia` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`motivo` text NOT NULL,
	`fecha_ingreso_custodia` text NOT NULL,
	`proxima_revision` text,
	`estado_funcional` text,
	`responsable` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_custodia_bien` ON `bien_en_custodia` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE TABLE `foto_bien` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`url` text NOT NULL,
	`tipo` text NOT NULL,
	`hash_sha256` text NOT NULL,
	`tomada_en` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_foto_bien` ON `foto_bien` (`bien_id`);--> statement-breakpoint
CREATE TABLE `movimiento_bien` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`servicio_origen_id` text NOT NULL,
	`servicio_destino_id` text NOT NULL,
	`fecha` text NOT NULL,
	`motivo` text NOT NULL,
	`responsable_id` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servicio_origen_id`) REFERENCES `servicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servicio_destino_id`) REFERENCES `servicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_movimiento_bien` ON `movimiento_bien` (`bien_id`,`fecha`);--> statement-breakpoint
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
CREATE TABLE `override_vida_util` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`vida_util_catalogo_x10k` integer NOT NULL,
	`vida_util_ajustada_x10k` integer NOT NULL,
	`fuente` text NOT NULL,
	`justificacion` text NOT NULL,
	`especialista_id` text,
	`soporte_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`especialista_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_override_bien` ON `override_vida_util` (`bien_id`);--> statement-breakpoint
CREATE TABLE `soporte_documental` (
	`id` text PRIMARY KEY NOT NULL,
	`bien_id` text NOT NULL,
	`tipo_documento` text NOT NULL,
	`url` text NOT NULL,
	`hash_sha256` text NOT NULL,
	`cargado_por_responsable_id` text,
	`cargado_en` text NOT NULL,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cargado_por_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_soporte_bien` ON `soporte_documental` (`bien_id`);--> statement-breakpoint
CREATE TABLE `activo_contable` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`identificador_contable` text NOT NULL,
	`descripcion_contable` text NOT NULL,
	`subcuenta` text NOT NULL,
	`fecha_adquisicion_libros` text,
	`valor_libros_cent` integer NOT NULL,
	`depreciacion_acum_libros_cent` integer DEFAULT 0 NOT NULL,
	`bien_id_emparejado` text,
	`metodo_emparejamiento` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id_emparejado`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_activo_contable_id` ON `activo_contable` (`ejercicio_id`,`identificador_contable`);--> statement-breakpoint
CREATE INDEX `ix_activo_contable_bien` ON `activo_contable` (`bien_id_emparejado`);--> statement-breakpoint
CREATE INDEX `ix_activo_contable_subcuenta` ON `activo_contable` (`ejercicio_id`,`subcuenta`);--> statement-breakpoint
CREATE TABLE `conciliacion` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`subcuenta` text NOT NULL,
	`cantidad_libros` integer NOT NULL,
	`cantidad_fisico` integer NOT NULL,
	`valor_libros_cent` integer NOT NULL,
	`valor_fisico_cent` integer NOT NULL,
	`diferencia_valor_cent` integer NOT NULL,
	`depreciacion_libros_cent` integer NOT NULL,
	`depreciacion_recalculada_cent` integer NOT NULL,
	`calculado_en` text NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_conciliacion_subcuenta` ON `conciliacion` (`ejercicio_id`,`subcuenta`);--> statement-breakpoint
CREATE TABLE `partida_conciliatoria` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text,
	`activo_contable_id` text,
	`tipo_diferencia` text NOT NULL,
	`valor_involucrado_cent` integer NOT NULL,
	`causa_probable` text,
	`accion_propuesta` text NOT NULL,
	`soporte_url` text,
	`estado` text NOT NULL,
	`resuelta_en` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`activo_contable_id`) REFERENCES `activo_contable`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_partida_tipo" CHECK("partida_conciliatoria"."tipo_diferencia" IN ('SOBRANTE_FISICO', 'FALTANTE_FISICO', 'DIFERENCIA_VALOR', 'DIFERENCIA_FECHA', 'DIFERENCIA_DEPRECIACION', 'CLASIFICACION_ERRONEA', 'DUPLICADO_LIBROS', 'BIEN_TERCERO')),
	CONSTRAINT "chk_partida_accion" CHECK("partida_conciliatoria"."accion_propuesta" IN ('INCORPORAR', 'DAR_DE_BAJA', 'AJUSTAR_VALOR', 'AJUSTAR_DEPRECIACION', 'RECLASIFICAR'))
);
--> statement-breakpoint
CREATE INDEX `ix_partida_ejercicio` ON `partida_conciliatoria` (`ejercicio_id`,`tipo_diferencia`);--> statement-breakpoint
CREATE TABLE `saldo_contable` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`subcuenta` text NOT NULL,
	`nombre_subcuenta` text NOT NULL,
	`saldo_inicial_cent` integer NOT NULL,
	`movimientos_debito_cent` integer DEFAULT 0 NOT NULL,
	`movimientos_credito_cent` integer DEFAULT 0 NOT NULL,
	`saldo_libros_corte_cent` integer NOT NULL,
	`depreciacion_acum_libros_cent` integer DEFAULT 0 NOT NULL,
	`deterioro_libros_cent` integer DEFAULT 0 NOT NULL,
	`importado_en` text NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_saldo_subcuenta` ON `saldo_contable` (`ejercicio_id`,`subcuenta`);--> statement-breakpoint
CREATE TABLE `calculo_depreciacion` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`fecha_corte` text NOT NULL,
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
	`entrada_hash` text NOT NULL,
	`parametros_hash` text NOT NULL,
	`calculado_en` text NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_dep_metodo" CHECK("calculo_depreciacion"."metodo_conteo_aplicado" IN ('mes_completo', 'dias_exactos', 'fraccion_anual')),
	CONSTRAINT "chk_dep_total" CHECK("calculo_depreciacion"."totalmente_depreciado" IN (0, 1)),
	CONSTRAINT "chk_dep_tope" CHECK("calculo_depreciacion"."depreciacion_acumulada_cent" <= "calculo_depreciacion"."base_depreciable_cent"),
	CONSTRAINT "chk_dep_vida_util" CHECK("calculo_depreciacion"."vida_util_meses" > 0),
	CONSTRAINT "chk_dep_saldo" CHECK("calculo_depreciacion"."saldo_por_depreciar_cent" >= 0),
	CONSTRAINT "chk_dep_deterioro" CHECK("calculo_depreciacion"."deterioro_cent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_calc_dep_bien` ON `calculo_depreciacion` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE TABLE `calculo_obsolescencia` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`fecha_corte` text NOT NULL,
	`vida_util_tecnica_aplicada_x10k` integer NOT NULL,
	`edad_actual_anios_x10k` integer NOT NULL,
	`indice_obsolescencia_x10k` integer NOT NULL,
	`anios_restantes_x10k` integer NOT NULL,
	`fecha_fin_vida_util` text NOT NULL,
	`semaforo` text NOT NULL,
	`obsolescencia_funcional` integer DEFAULT false NOT NULL,
	`justificacion_funcional` text,
	`candidato_baja` integer DEFAULT false NOT NULL,
	`concepto_especialista` text,
	`entrada_hash` text NOT NULL,
	`parametros_hash` text NOT NULL,
	`calculado_en` text NOT NULL,
	`calculado_por_responsable_id` text,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`calculado_por_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_obs_semaforo" CHECK("calculo_obsolescencia"."semaforo" IN ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO')),
	CONSTRAINT "chk_obs_funcional" CHECK("calculo_obsolescencia"."obsolescencia_funcional" IN (0, 1)),
	CONSTRAINT "chk_obs_candidato" CHECK("calculo_obsolescencia"."candidato_baja" IN (0, 1)),
	CONSTRAINT "chk_obs_indice" CHECK("calculo_obsolescencia"."indice_obsolescencia_x10k" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_calc_obs_bien` ON `calculo_obsolescencia` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE INDEX `ix_calc_obs_semaforo` ON `calculo_obsolescencia` (`ejercicio_id`,`semaforo`);--> statement-breakpoint
CREATE TABLE `deterioro` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`valor_neto_antes_cent` integer NOT NULL,
	`valor_recuperable_cent` integer NOT NULL,
	`deterioro_reconocido_cent` integer NOT NULL,
	`indicio` text NOT NULL,
	`justificacion` text NOT NULL,
	`especialista_id` text,
	`soporte_url` text,
	`reconocido_en` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`especialista_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_deterioro_indicio" CHECK("deterioro"."indicio" IN ('DANO_FISICO', 'OBSOLESCENCIA', 'DESUSO', 'CAMBIO_NORMATIVO')),
	CONSTRAINT "chk_deterioro_valor" CHECK("deterioro"."deterioro_reconocido_cent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_deterioro_bien` ON `deterioro` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE TABLE `referencia_mercado` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`familia_equipo` text NOT NULL,
	`especificacion` text,
	`proveedor` text NOT NULL,
	`valor_cotizado_cent` integer NOT NULL,
	`fecha_cotizacion` text NOT NULL,
	`vigencia_hasta` text NOT NULL,
	`soporte_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_referencia_familia` ON `referencia_mercado` (`ejercicio_id`,`familia_equipo`);--> statement-breakpoint
CREATE TABLE `valuacion_mueble` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`metodo_valuacion` text NOT NULL,
	`valor_equipo_nuevo_equivalente_cent` integer,
	`factor_estado_x10k` integer,
	`factor_vida_restante_x10k` integer,
	`valor_avaluo_calculado_cent` integer,
	`valor_avaluo_final_cent` integer NOT NULL,
	`diferencia_vs_libros_cent` integer NOT NULL,
	`tipo_ajuste` text NOT NULL,
	`justificacion_tecnica` text NOT NULL,
	`especialista_id` text NOT NULL,
	`fecha_valuacion` text NOT NULL,
	`soporte_mercado_url` text,
	`estado_aprobacion` text DEFAULT 'PENDIENTE' NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`especialista_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_val_metodo" CHECK("valuacion_mueble"."metodo_valuacion" IN ('COSTO_REPOSICION_DEPRECIADO', 'COMPARACION_MERCADO', 'VALOR_EN_LIBROS', 'VALOR_RESIDUAL_CHATARRA', 'VALOR_CERO')),
	CONSTRAINT "chk_val_ajuste" CHECK("valuacion_mueble"."tipo_ajuste" IN ('VALORIZACION', 'DESVALORIZACION', 'SIN_CAMBIO')),
	CONSTRAINT "chk_val_aprobacion" CHECK("valuacion_mueble"."estado_aprobacion" IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
	CONSTRAINT "chk_val_final" CHECK("valuacion_mueble"."valor_avaluo_final_cent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_valuacion_bien` ON `valuacion_mueble` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE INDEX `ix_valuacion_especialista` ON `valuacion_mueble` (`ejercicio_id`,`especialista_id`);--> statement-breakpoint
CREATE TABLE `avaluo_inmueble` (
	`id` text PRIMARY KEY NOT NULL,
	`inmueble_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`metodo_terreno` text,
	`valor_m2_terreno_cent` integer,
	`valor_total_terreno_cent` integer,
	`metodo_construccion` text,
	`costo_reposicion_m2_cent` integer,
	`factor_depreciacion_x10k` integer,
	`valor_m2_construccion_depreciado_cent` integer,
	`valor_total_construccion_cent` integer,
	`valor_total_inmueble_cent` integer NOT NULL,
	`perito_id` text,
	`perito_nombre` text NOT NULL,
	`perito_registro_raa` text NOT NULL,
	`fecha_visita` text,
	`fecha_informe` text NOT NULL,
	`vigencia_hasta` text NOT NULL,
	`informe_url` text,
	`valor_libros_anterior_cent` integer,
	`diferencia_valuacion_cent` integer,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`perito_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_avaluo_inmueble_ejercicio` ON `avaluo_inmueble` (`inmueble_id`,`ejercicio_id`);--> statement-breakpoint
CREATE TABLE `documento_inmueble` (
	`id` text PRIMARY KEY NOT NULL,
	`inmueble_id` text NOT NULL,
	`tipo_documento` text NOT NULL,
	`url` text NOT NULL,
	`hash_sha256` text NOT NULL,
	`fecha_expedicion` text,
	`vigencia_hasta` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_documento_inmueble` ON `documento_inmueble` (`inmueble_id`);--> statement-breakpoint
CREATE TABLE `inmueble` (
	`id` text PRIMARY KEY NOT NULL,
	`entidad_id` text NOT NULL,
	`codigo_inmueble` text NOT NULL,
	`nombre` text NOT NULL,
	`tipo_inmueble` text NOT NULL,
	`direccion` text NOT NULL,
	`municipio` text NOT NULL,
	`departamento` text NOT NULL,
	`destinacion` text,
	`uso_actual` text,
	`matricula_inmobiliaria` text,
	`codigo_catastral` text,
	`titulo_adquisicion` text,
	`fecha_adquisicion` text,
	`afectaciones` text,
	`estado_legalizacion` text NOT NULL,
	`area_terreno_m2_x10k` integer,
	`area_construida_m2_x10k` integer,
	`numero_pisos` integer,
	`vetustez_anios` integer,
	`vida_util_total_anios` integer,
	`estado_conservacion` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`entidad_id`) REFERENCES `entidad`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_inmueble_legalizacion" CHECK("inmueble"."estado_legalizacion" IN ('LEGALIZADO', 'EN_TRAMITE', 'SIN_TITULO')),
	CONSTRAINT "chk_inmueble_conservacion" CHECK("inmueble"."estado_conservacion" IN ('1_NUEVO', '2_BUENO', '3_REGULAR', '4_DEFICIENTE', '5_INSERVIBLE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_inmueble_codigo` ON `inmueble` (`entidad_id`,`codigo_inmueble`);--> statement-breakpoint
CREATE TABLE `oferta_comparable` (
	`id` text PRIMARY KEY NOT NULL,
	`avaluo_id` text NOT NULL,
	`direccion` text NOT NULL,
	`descripcion` text,
	`area_terreno_m2_x10k` integer,
	`area_construida_m2_x10k` integer,
	`valor_ofertado_cent` integer NOT NULL,
	`factor_negociacion_x10k` integer,
	`valor_depurado_cent` integer,
	`valor_m2_homogeneizado_cent` integer,
	`incluida` integer DEFAULT true NOT NULL,
	`motivo_descarte` text,
	`fuente` text,
	`link` text,
	FOREIGN KEY (`avaluo_id`) REFERENCES `avaluo_inmueble`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_oferta_incluida" CHECK("oferta_comparable"."incluida" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_oferta_avaluo` ON `oferta_comparable` (`avaluo_id`);--> statement-breakpoint
CREATE TABLE `disposicion_final` (
	`id` text PRIMARY KEY NOT NULL,
	`propuesta_baja_id` text NOT NULL,
	`destino_final` text NOT NULL,
	`fecha_disposicion` text NOT NULL,
	`responsable_entrega` text NOT NULL,
	`responsable_recibe` text NOT NULL,
	`gestor_autorizado` text,
	`certificado_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`propuesta_baja_id`) REFERENCES `propuesta_baja`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_disposicion_destino" CHECK("disposicion_final"."destino_final" IN ('VENTA', 'REMATE', 'DESTRUCCION', 'DONACION', 'RECICLAJE_RAEE', 'GESTOR_AMBIENTAL'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_disposicion_propuesta` ON `disposicion_final` (`propuesta_baja_id`);--> statement-breakpoint
CREATE TABLE `efecto_contable_baja` (
	`id` text PRIMARY KEY NOT NULL,
	`propuesta_baja_id` text NOT NULL,
	`valor_bruto_cent` integer NOT NULL,
	`depreciacion_asociada_cent` integer NOT NULL,
	`deterioro_asociado_cent` integer DEFAULT 0 NOT NULL,
	`valor_neto_cent` integer NOT NULL,
	`valor_recuperado_cent` integer DEFAULT 0 NOT NULL,
	`perdida_reconocida_cent` integer NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`propuesta_baja_id`) REFERENCES `propuesta_baja`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_efecto_propuesta` ON `efecto_contable_baja` (`propuesta_baja_id`);--> statement-breakpoint
CREATE TABLE `propuesta_baja` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`bien_id` text NOT NULL,
	`causal` text NOT NULL,
	`justificacion_tecnica` text NOT NULL,
	`costo_reparacion_estimado_cent` integer,
	`valor_reposicion_cent` integer,
	`relacion_reparacion_reposicion_x10k` integer,
	`valor_salvamento_cent` integer,
	`destino_final_propuesto` text,
	`soporte_url` text,
	`especialista_id` text NOT NULL,
	`fecha_propuesta` text NOT NULL,
	`estado_aprobacion` text DEFAULT 'PROPUESTO' NOT NULL,
	`acta_comite_id` text,
	`resolucion_id` text,
	`observacion_comite` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bien_id`) REFERENCES `bien`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`especialista_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`acta_comite_id`) REFERENCES `acta_comite`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`resolucion_id`) REFERENCES `acto_administrativo`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_propuesta_causal" CHECK("propuesta_baja"."causal" IN ('OBSOLESCENCIA', 'INSERVIBLE', 'CASO_FORTUITO', 'DESUSO', 'DONACION_O_TRASLADO')),
	CONSTRAINT "chk_propuesta_destino" CHECK("propuesta_baja"."destino_final_propuesto" IN ('VENTA', 'REMATE', 'DESTRUCCION', 'DONACION', 'RECICLAJE_RAEE', 'GESTOR_AMBIENTAL')),
	CONSTRAINT "chk_propuesta_estado" CHECK("propuesta_baja"."estado_aprobacion" IN ('PROPUESTO', 'EN_REVISION', 'APROBADO_COMITE', 'RESOLUCION_EMITIDA', 'EJECUTADO', 'DISPOSICION_DOCUMENTADA', 'RECHAZADO'))
);
--> statement-breakpoint
CREATE INDEX `ix_propuesta_bien` ON `propuesta_baja` (`ejercicio_id`,`bien_id`);--> statement-breakpoint
CREATE INDEX `ix_propuesta_estado` ON `propuesta_baja` (`ejercicio_id`,`estado_aprobacion`);--> statement-breakpoint
CREATE TABLE `acta_comite` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`numero_acta` text NOT NULL,
	`fecha` text NOT NULL,
	`lugar` text NOT NULL,
	`asistentes_json` text NOT NULL,
	`quorum_valido` integer NOT NULL,
	`orden_del_dia` text NOT NULL,
	`decisiones` text NOT NULL,
	`documento_url` text,
	`estado_firma` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_acta_quorum" CHECK("acta_comite"."quorum_valido" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_acta_numero` ON `acta_comite` (`ejercicio_id`,`numero_acta`);--> statement-breakpoint
CREATE TABLE `acto_administrativo` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`tipo_resolucion` text NOT NULL,
	`numero` text,
	`fecha` text,
	`epigrafe` text NOT NULL,
	`acta_comite_id` text,
	`contenido_generado` text,
	`documento_url` text,
	`estado` text DEFAULT 'PROYECTADO' NOT NULL,
	`preparo_responsable_id` text,
	`reviso_responsable_id` text,
	`firmo_responsable_id` text,
	`fecha_firma` text,
	`inmutable` integer DEFAULT false NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`acta_comite_id`) REFERENCES `acta_comite`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`preparo_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviso_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`firmo_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_acto_estado" CHECK("acto_administrativo"."estado" IN ('PROYECTADO', 'EN_REVISION_JURIDICA', 'APROBADO_COMITE', 'FIRMADO', 'PUBLICADO')),
	CONSTRAINT "chk_acto_inmutable" CHECK("acto_administrativo"."inmutable" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_acto_ejercicio` ON `acto_administrativo` (`ejercicio_id`,`estado`);--> statement-breakpoint
CREATE TABLE `consolidado_subcuenta` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`subcuenta` text NOT NULL,
	`nombre_subcuenta` text NOT NULL,
	`saldo_anterior_cent` integer NOT NULL,
	`incorporaciones_cent` integer DEFAULT 0 NOT NULL,
	`retiros_por_baja_cent` integer DEFAULT 0 NOT NULL,
	`ajustes_de_valor_cent` integer DEFAULT 0 NOT NULL,
	`valorizaciones_cent` integer DEFAULT 0 NOT NULL,
	`desvalorizaciones_cent` integer DEFAULT 0 NOT NULL,
	`nuevo_saldo_bruto_cent` integer NOT NULL,
	`depreciacion_acum_anterior_cent` integer NOT NULL,
	`ajuste_depreciacion_cent` integer DEFAULT 0 NOT NULL,
	`depreciacion_retirada_baja_cent` integer DEFAULT 0 NOT NULL,
	`nueva_depreciacion_acumulada_cent` integer NOT NULL,
	`deterioro_anterior_cent` integer DEFAULT 0 NOT NULL,
	`nuevo_deterioro_cent` integer DEFAULT 0 NOT NULL,
	`valor_neto_final_cent` integer NOT NULL,
	`cantidad_bienes` integer NOT NULL,
	`calculado_en` text NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_consolidado_subcuenta` ON `consolidado_subcuenta` (`ejercicio_id`,`subcuenta`);--> statement-breakpoint
CREATE TABLE `verificacion_cuadre` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`subcuenta` text NOT NULL,
	`total_detalle_cent` integer NOT NULL,
	`total_auxiliar_cent` integer NOT NULL,
	`total_mayor_cent` integer NOT NULL,
	`cuadra` integer NOT NULL,
	`diferencia_cent` integer NOT NULL,
	`verificado_en` text NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_cuadre_cuadra" CHECK("verificacion_cuadre"."cuadra" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `ix_cuadre_ejercicio` ON `verificacion_cuadre` (`ejercicio_id`,`subcuenta`);--> statement-breakpoint
CREATE TABLE `acta_entrega` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`numero_contrato` text NOT NULL,
	`fecha` text NOT NULL,
	`productos_json` text NOT NULL,
	`documento_url` text,
	`estado_firma` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_acta_entrega_ejercicio` ON `acta_entrega` (`ejercicio_id`);--> statement-breakpoint
CREATE TABLE `capacitacion` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`sesion` integer NOT NULL,
	`tema` text NOT NULL,
	`fecha` text NOT NULL,
	`duracion_minutos` integer NOT NULL,
	`dirigido_a` text NOT NULL,
	`contenido` text,
	`metodologia` text,
	`material_url` text,
	`lista_asistencia_url` text,
	`resultado_evaluacion` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_capacitacion_ejercicio` ON `capacitacion` (`ejercicio_id`,`sesion`);--> statement-breakpoint
CREATE TABLE `cierre_ejercicio` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`fecha_cierre` text NOT NULL,
	`cerrado_por_responsable_id` text NOT NULL,
	`acta_liquidacion_url` text,
	`observaciones` text,
	`hash_contenido` text NOT NULL,
	`version_app` text NOT NULL,
	`version_esquema` integer NOT NULL,
	`inmutable` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cerrado_por_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_cierre_inmutable" CHECK("cierre_ejercicio"."inmutable" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_cierre_ejercicio` ON `cierre_ejercicio` (`ejercicio_id`);--> statement-breakpoint
CREATE TABLE `producto_contractual` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text NOT NULL,
	`codigo_producto` text NOT NULL,
	`nombre` text NOT NULL,
	`paso_origen` integer NOT NULL,
	`formato_requerido` text NOT NULL,
	`estado` text NOT NULL,
	`entregable_url` text,
	`fecha_entrega` text,
	`verificado_por_responsable_id` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`verificado_por_responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_producto_codigo` ON `producto_contractual` (`ejercicio_id`,`codigo_producto`);--> statement-breakpoint
CREATE TABLE `bitacora` (
	`id` text PRIMARY KEY NOT NULL,
	`ejercicio_id` text,
	`entidad_afectada` text NOT NULL,
	`registro_id` text NOT NULL,
	`accion` text NOT NULL,
	`campo` text,
	`valor_anterior` text,
	`valor_nuevo` text,
	`responsable_id` text,
	`fecha` text NOT NULL,
	`origen` text NOT NULL,
	`justificacion` text,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicio`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`responsable_id`) REFERENCES `responsable`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_bitacora_accion" CHECK("bitacora"."accion" IN ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CALCULAR', 'APROBAR', 'RECHAZAR', 'IMPORTAR', 'EXPORTAR', 'CERRAR'))
);
--> statement-breakpoint
CREATE INDEX `ix_bitacora_registro` ON `bitacora` (`entidad_afectada`,`registro_id`);--> statement-breakpoint
CREATE INDEX `ix_bitacora_ejercicio` ON `bitacora` (`ejercicio_id`,`fecha`);