-- Isekai World Fest — raid: registro de ataques anulados por auto clicker
-- Railway → MySQL → Data → Query (una sola sentencia)
ALTER TABLE `wfRaidAtaques` ADD COLUMN `motivo` varchar(40) NULL DEFAULT NULL;
