-- Données de test pour les antennes BTS
-- Antennes réparties dans les wilayas principales

INSERT INTO bts_antennas (nom, wilaya, commune, latitude, longitude, etatA, etatB, etatC, date_installation) VALUES
-- Alger
('BTS-ALG-001', 'Alger', 'Alger-Centre', 36.7538, 3.0588, 'actif', 'actif', 'actif', '2020-03-15'),
('BTS-ALG-002', 'Alger', 'Bab Ezzouar', 36.7200, 3.1800, 'actif', 'maintenance', 'actif', '2019-06-20'),
('BTS-ALG-003', 'Alger', 'Hydra', 36.7400, 3.0200, 'actif', 'actif', 'inactif', '2021-01-10'),
('BTS-ALG-004', 'Alger', 'Kouba', 36.7100, 3.0500, 'inactif', 'actif', 'actif', '2018-11-05'),
('BTS-ALG-005', 'Alger', 'Bir Mourad Rais', 36.7350, 3.0400, 'actif', 'actif', 'actif', '2022-04-18'),

-- Oran
('BTS-ORA-001', 'Oran', 'Oran', 35.6969, -0.6331, 'actif', 'actif', 'actif', '2019-09-12'),
('BTS-ORA-002', 'Oran', 'Es Senia', 35.6400, -0.6100, 'actif', 'inactif', 'actif', '2020-02-28'),
('BTS-ORA-003', 'Oran', 'Bir El Djir', 35.7200, -0.5800, 'maintenance', 'actif', 'actif', '2021-07-15'),
('BTS-ORA-004', 'Oran', 'Arzew', 35.8500, -0.3200, 'actif', 'actif', 'maintenance', '2018-05-22'),

-- Constantine
('BTS-CON-001', 'Constantine', 'Constantine', 36.3650, 6.6147, 'actif', 'actif', 'actif', '2019-04-10'),
('BTS-CON-002', 'Constantine', 'El Khroub', 36.2600, 6.6800, 'actif', 'actif', 'inactif', '2020-08-05'),
('BTS-CON-003', 'Constantine', 'Hamma Bouziane', 36.4100, 6.5900, 'actif', 'maintenance', 'actif', '2021-12-01'),
('BTS-CON-004', 'Constantine', 'Didouche Mourad', 36.4500, 6.6300, 'inactif', 'inactif', 'actif', '2017-10-20'),

-- Ouargla
('BTS-OUA-001', 'Ouargla', 'Ouargla', 31.9527, 5.3249, 'actif', 'actif', 'actif', '2020-06-15'),
('BTS-OUA-002', 'Ouargla', 'Hassi Messaoud', 31.6800, 6.0700, 'actif', 'actif', 'maintenance', '2019-01-25'),
('BTS-OUA-003', 'Ouargla', 'Touggourt', 33.1000, 6.0600, 'maintenance', 'actif', 'actif', '2021-03-08'),

-- Annaba
('BTS-ANN-001', 'Annaba', 'Annaba', 36.9000, 7.7667, 'actif', 'actif', 'actif', '2018-12-12'),
('BTS-ANN-002', 'Annaba', 'El Bouni', 36.8600, 7.7200, 'actif', 'inactif', 'actif', '2020-09-30'),

-- Blida
('BTS-BLI-001', 'Blida', 'Blida', 36.4700, 2.8300, 'actif', 'actif', 'actif', '2019-07-18'),
('BTS-BLI-002', 'Blida', 'Boufarik', 36.5700, 2.9100, 'actif', 'actif', 'maintenance', '2021-05-22'),

-- Setif
('BTS-SET-001', 'Setif', 'Setif', 36.1900, 5.4100, 'actif', 'actif', 'actif', '2020-01-05'),
('BTS-SET-002', 'Setif', 'El Eulma', 36.1500, 5.6900, 'maintenance', 'actif', 'actif', '2019-11-15'),

-- Tlemcen
('BTS-TLE-001', 'Tlemcen', 'Tlemcen', 34.8800, -1.3200, 'actif', 'actif', 'actif', '2018-08-20'),

-- Batna
('BTS-BAT-001', 'Batna', 'Batna', 35.5600, 6.1700, 'actif', 'actif', 'inactif', '2019-03-28');
