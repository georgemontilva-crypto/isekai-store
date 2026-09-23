-- ═══════════════════════════════════════════════════════════════════════
-- Isekai World Fest — raid comunitario
-- Pegar completo en Railway → MySQL → Data → Query y ejecutar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `wfRaid` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `vidaMax` int NOT NULL,
  `danio` int NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `derrotadoEn` timestamp NULL DEFAULT NULL,
  `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `wfRaidAtaques` (
  `id` int NOT NULL AUTO_INCREMENT,
  `raidId` int NOT NULL,
  `clave` varchar(64) NOT NULL,
  `ip` varchar(64) NOT NULL,
  `dia` varchar(10) NOT NULL,
  `golpes` int NOT NULL,
  `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_raid_clave_dia` (`raidId`, `clave`, `dia`),
  KEY `idx_raid_ip_dia` (`raidId`, `ip`, `dia`)
);

-- Primer jefe. La vida se puede cambiar cuando quieras (ver instrucciones).
INSERT INTO `wfRaid` (`nombre`, `vidaMax`) VALUES ('Guardián del Portal', 100000);
