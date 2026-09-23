-- ═══════════════════════════════════════════════════════════════════════
-- Isekai World Fest — correos del raid
-- Railway → MySQL → Data → Query. Ejecutar UNA sentencia a la vez.
-- ═══════════════════════════════════════════════════════════════════════

-- Paso 1
ALTER TABLE `wfRaid` ADD COLUMN `premioEnviadoEn` timestamp NULL DEFAULT NULL;

-- Paso 2
CREATE TABLE IF NOT EXISTS `wfRaidBajas` (
  `userId` int NOT NULL,
  `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
);
