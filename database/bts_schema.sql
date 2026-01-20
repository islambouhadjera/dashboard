-- Table pour les antennes BTS
-- Table pour les antennes BTS
-- Chaque BTS a 3 sous-antennes (A, B, C) couvrant 120° chacune, identifiées par un Cell ID
-- L'état n'est plus stocké ici, il est calculé dynamiquement basé sur les tests de vitesse

CREATE TABLE IF NOT EXISTS bts_antennas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    wilaya VARCHAR(50) NOT NULL,
    commune VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    cell_id_A VARCHAR(50) UNIQUE,
    cell_id_B VARCHAR(50) UNIQUE,
    cell_id_C VARCHAR(50) UNIQUE,
    date_installation DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_wilaya (wilaya),
    INDEX idx_commune (commune)
);

-- Commentaire: 
-- Sous-antenne A: couvre 0° à 120° (Nord vers Est)
-- Sous-antenne B: couvre 120° à 240° (Est vers Sud-Ouest)
-- Sous-antenne C: couvre 240° à 360° (Sud-Ouest vers Nord)
-- Rayon de couverture: 40 km
