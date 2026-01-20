-- Création de la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS mobilis_dashboard;
USE mobilis_dashboard;

-- Suppression de la table si elle existe pour repartir à zéro
DROP TABLE IF EXISTS speed_tests;

-- Création de la table principale
CREATE TABLE speed_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(36) UNIQUE, -- UUID pour identifier chaque test
    cell_id VARCHAR(50), -- Identifiant de la cellule (secteur) de l'antenne
    download_mbps DECIMAL(10, 2),
    upload_mbps DECIMAL(10, 2),
    latency_ms INT,
    jitter_ms INT,
    network_type ENUM('3G', '4G', '5G'),
    signal_strength_dbm INT, -- Ex: -85
    operator VARCHAR(50) DEFAULT 'Mobilis',
    device_type VARCHAR(50), -- Android, iOS, etc.
    wilaya VARCHAR(50),
    commune VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Index pour optimiser les filtres fréquents
    INDEX idx_wilaya (wilaya),
    INDEX idx_network_type (network_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_test_id (test_id)
);
