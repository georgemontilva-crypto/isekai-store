-- Isekai World — notificaciones push de la app instalada
-- Railway → MySQL → Data → Query (una sola sentencia)
CREATE TABLE IF NOT EXISTS pushSuscripciones (id int NOT NULL AUTO_INCREMENT, userId int NOT NULL, endpoint varchar(600) NOT NULL, p256dh varchar(200) NOT NULL, auth varchar(100) NOT NULL, dispositivo varchar(200) NULL, creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uniq_push_endpoint (endpoint), KEY idx_push_user (userId))
