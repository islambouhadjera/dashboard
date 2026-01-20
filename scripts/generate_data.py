import random
import datetime
import uuid
import math

# Configuration
NUM_SPEED_TESTS = 1000
BTS_FILENAME = "bts_data.sql"
SPEED_FILENAME = "insert_fake_data.sql"

# Données de référence
OPERATOR = "Mobilis"
WILAYAS = {
    "Alger": {"lat": 36.75, "lon": 3.05},
    "Oran": {"lat": 35.69, "lon": -0.63},
    "Constantine": {"lat": 36.36, "lon": 6.61},
    "Ouargla": {"lat": 31.95, "lon": 5.32}
}

COMMUNES = {
    "Alger": ["Alger-Centre", "Bab Ezzouar", "Kouba", "Hydra", "Bir Mourad Rais"],
    "Oran": ["Oran", "Es Senia", "Bir El Djir", "Arzew"],
    "Constantine": ["Constantine", "El Khroub", "Hamma Bouziane", "Didouche Mourad"],
    "Ouargla": ["Ouargla", "Hassi Messaoud", "Touggourt"]
}

NETWORKS = ["3G", "4G", "5G"]
DEVICES = ["Android", "iOS"]

# Stockage temporaire des BTS générées pour la cohérence
bts_list = []

def generate_bts_data():
    """Génère les données SQL pour les antennes BTS."""
    sql_statements = []
    sql_statements.append("INSERT INTO bts_antennas (nom, wilaya, commune, latitude, longitude, cell_id_A, cell_id_B, cell_id_C, date_installation) VALUES")
    
    values_list = []
    
    for wilaya, coords in WILAYAS.items():
        for i, commune in enumerate(COMMUNES[wilaya]):
            # Générer 2-3 BTS par commune
            num_bts = random.randint(2, 3)
            for j in range(num_bts):
                lat = coords["lat"] + random.uniform(-0.05, 0.05)
                lon = coords["lon"] + random.uniform(-0.05, 0.05)
                nom = f"BTS-{wilaya[:3].upper()}-{commune[:3].upper()}-{j+1:03d}"
                
                # Générer des Cell IDs uniques
                base_id = random.randint(10000, 99999)
                cell_id_a = f"{base_id}1"
                cell_id_b = f"{base_id}2"
                cell_id_c = f"{base_id}3"
                
                date_install = datetime.date(2018, 1, 1) + datetime.timedelta(days=random.randint(0, 1500))
                
                values_list.append(
                    f"('{nom}', '{wilaya}', '{commune}', {lat:.6f}, {lon:.6f}, '{cell_id_a}', '{cell_id_b}', '{cell_id_c}', '{date_install}')"
                )
                
                # Sauvegarder pour utilisation dans les speed tests
                bts_list.append({
                    "lat": lat,
                    "lon": lon,
                    "wilaya": wilaya,
                    "commune": commune,
                    "cell_ids": {"A": cell_id_a, "B": cell_id_b, "C": cell_id_c}
                })

    sql_statements.append(",\n".join(values_list) + ";")
    
    with open(BTS_FILENAME, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    print(f"Fichier BTS généré : {BTS_FILENAME}")

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calcule l'angle (azimut) entre deux points."""
    dLon = (lon2 - lon1)
    y = math.sin(math.radians(dLon)) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(math.radians(dLon))
    brng = math.atan2(y, x)
    brng = math.degrees(brng)
    return (brng + 360) % 360

def get_sector(bearing):
    """Détermine le secteur (A, B, C) en fonction de l'angle."""
    if 0 <= bearing < 120:
        return "A"
    elif 120 <= bearing < 240:
        return "B"
    else:
        return "C"

def generate_metrics(network, distance_km):
    """Génère des métriques réalistes affectées par la distance."""
    # Facteur de dégradation basé sur la distance (simplifié)
    signal_degrad = distance_km * 2  # Perte de dBm par km (très approximatif)
    
    if network == "3G":
        base_dl = random.uniform(0.5, 15.0)
        base_ul = random.uniform(0.1, 5.0)
        base_lat = random.uniform(60, 200)
        base_signal = random.randint(-90, -60)
    elif network == "4G":
        base_dl = random.uniform(10.0, 100.0)
        base_ul = random.uniform(5.0, 40.0)
        base_lat = random.uniform(30, 80)
        base_signal = random.randint(-100, -70)
    else: # 5G
        base_dl = random.uniform(100.0, 800.0)
        base_ul = random.uniform(40.0, 100.0)
        base_lat = random.uniform(10, 30)
        base_signal = random.randint(-95, -60)
    
    # Appliquer dégradation
    final_signal = base_signal - signal_degrad
    final_dl = base_dl * (1 / (1 + distance_km * 0.1)) # Réduction vitesse avec distance
    
    return round(final_dl, 2), round(base_ul, 2), round(base_lat, 2), int(final_signal)

def generate_speed_tests():
    """Génère les tests de vitesse liés aux BTS."""
    with open(SPEED_FILENAME, "w", encoding="utf-8") as f:
        f.write("-- Données générées automatiquement pour le dashboard Mobilis\n")
        f.write("INSERT INTO speed_tests (test_id, timestamp, operator, network_type, download_mbps, upload_mbps, latency_ms, signal_strength_dbm, device_type, wilaya, commune, latitude, longitude, cell_id) VALUES\n")
        
        values_list = []
        for _ in range(NUM_SPEED_TESTS):
            test_id = str(uuid.uuid4())
            
            # Choisir une BTS au hasard pour simuler la zone
            target_bts = random.choice(bts_list)
            
            # Générer une position utilisateur autour de cette BTS (max 5km)
            dist_lat = random.uniform(-0.04, 0.04) # approx 4-5km
            dist_lon = random.uniform(-0.04, 0.04)
            user_lat = target_bts["lat"] + dist_lat
            user_lon = target_bts["lon"] + dist_lon
            
            # Calculer distance exacte (formule simplifiée pythagore pour la rapidité sur petites distances)
            distance_km = math.sqrt((dist_lat * 111)**2 + (dist_lon * 111)**2)
            
            # Calculer l'angle pour déterminer le secteur
            angle = calculate_bearing(target_bts["lat"], target_bts["lon"], user_lat, user_lon)
            sector = get_sector(angle)
            cell_id = target_bts["cell_ids"][sector]
            
            # Temps
            days_offset = random.randint(0, 30)
            seconds_offset = random.randint(0, 86400)
            timestamp = datetime.datetime.now() - datetime.timedelta(days=days_offset, seconds=seconds_offset)
            ts_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            # Network & Metrics
            network = random.choices(NETWORKS, weights=[10, 60, 30], k=1)[0]
            dl, ul, lat_ms, signal = generate_metrics(network, distance_km)
            device = random.choice(DEVICES)
            
            values_list.append(
                f"('{test_id}', '{ts_str}', '{OPERATOR}', '{network}', {dl}, {ul}, {lat_ms}, {signal}, '{device}', '{target_bts['wilaya']}', '{target_bts['commune']}', {user_lat:.6f}, {user_lon:.6f}, '{cell_id}')"
            )
        
        f.write(",\n".join(values_list) + ";\n")
        
    print(f"Fichier Speed Tests généré : {SPEED_FILENAME}")

if __name__ == "__main__":
    random.seed(42) # Pour la reproductibilité
    generate_bts_data()
    generate_speed_tests()
