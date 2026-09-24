-- Isekai World Fest — confirmaciones a la rueda de prensa
-- Railway → MySQL → Data → Query (una sola sentencia)
CREATE TABLE IF NOT EXISTS `wfPrensaConfirmaciones` (`id` int NOT NULL AUTO_INCREMENT, `clave` varchar(64) NOT NULL, `ip` varchar(64) NOT NULL, `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), UNIQUE KEY `uniq_prensa_clave` (`clave`), KEY `idx_prensa_ip` (`ip`));
