-- Búsqueda de bienes por descripción, marca, modelo y serie (plan 2.4 §3).
-- Tabla FTS5 independiente sincronizada por triggers: la PK de `bien` es TEXT,
-- así que no se usa el modo "external content" (depende del rowid).
-- unicode61 + remove_diacritics: "cámara" y "camara" son la misma búsqueda.
CREATE VIRTUAL TABLE `bien_fts` USING fts5(
	`bien_id` UNINDEXED,
	`descripcion_funcional`,
	`marca`,
	`modelo`,
	`serie`,
	tokenize = 'unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `trg_bien_fts_insert` AFTER INSERT ON `bien` BEGIN
	INSERT INTO `bien_fts` (`bien_id`, `descripcion_funcional`, `marca`, `modelo`, `serie`)
	VALUES (NEW.`id`, NEW.`descripcion_funcional`, NEW.`marca`, NEW.`modelo`, NEW.`serie`);
END;
--> statement-breakpoint
CREATE TRIGGER `trg_bien_fts_update` AFTER UPDATE OF `descripcion_funcional`, `marca`, `modelo`, `serie` ON `bien` BEGIN
	DELETE FROM `bien_fts` WHERE `bien_id` = OLD.`id`;
	INSERT INTO `bien_fts` (`bien_id`, `descripcion_funcional`, `marca`, `modelo`, `serie`)
	VALUES (NEW.`id`, NEW.`descripcion_funcional`, NEW.`marca`, NEW.`modelo`, NEW.`serie`);
END;
--> statement-breakpoint
CREATE TRIGGER `trg_bien_fts_delete` AFTER DELETE ON `bien` BEGIN
	DELETE FROM `bien_fts` WHERE `bien_id` = OLD.`id`;
END;
