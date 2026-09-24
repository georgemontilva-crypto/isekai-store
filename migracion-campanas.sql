-- Isekai World — campañas de correo
-- Railway → MySQL → Data → Query. UNA sentencia a la vez.

-- Paso 1
CREATE TABLE IF NOT EXISTS `campanas` (`id` int NOT NULL AUTO_INCREMENT, `asunto` varchar(150) NOT NULL, `preheader` varchar(150) NULL, `titulo` varchar(120) NOT NULL, `cuerpo` text NOT NULL, `imagenUrl` varchar(500) NULL, `botonTexto` varchar(40) NULL, `botonUrl` varchar(500) NULL, `segmento` varchar(20) NOT NULL, `estado` varchar(20) NOT NULL DEFAULT 'borrador', `total` int NOT NULL DEFAULT 0, `enviados` int NOT NULL DEFAULT 0, `fallidos` int NOT NULL DEFAULT 0, `ultimoError` varchar(300) NULL, `creadoPor` int NULL, `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `enviadoEn` timestamp NULL DEFAULT NULL, PRIMARY KEY (`id`));

-- Paso 2
CREATE TABLE IF NOT EXISTS `campanaEnvios` (`id` int NOT NULL AUTO_INCREMENT, `campanaId` int NOT NULL, `email` varchar(320) NOT NULL, `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), UNIQUE KEY `uniq_campana_email` (`campanaId`, `email`));

-- Paso 3
CREATE TABLE IF NOT EXISTS `bajasMarketing` (`id` int NOT NULL AUTO_INCREMENT, `email` varchar(320) NOT NULL, `creadoEn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), UNIQUE KEY `uniq_baja_email` (`email`));
