# Spécifications du Dashboard Décisionnel - Réseau Mobilis

## 1. Modèle de Données (Power BI / Tableau)
La source de données principale est la table PostgreSQL `speed_tests`.

### Tables Dimensionnelles (Suggérées)
- **DimDate** : Table calendrier standard (liée à `speed_tests.timestamp`).
- **DimLocation** : Hiérarchie Wilaya > Commune (extraite de `speed_tests` ou table de référence).
- **DimNetwork** : '3G', '4G', '5G'.

## 2. Indicateurs Clés de Performance (KPIs)

| KPI | Formule / Définition | Objectif (Target) |
|---|---|---|
| **Débit Descendant Moyen** | `AVERAGE(speed_tests[download_mbps])` | > 20 Mbps |
| **Latence Moyenne** | `AVERAGE(speed_tests[latency_ms])` | < 50 ms |
| **Score de Qualité** | Formule composite : `(0.6 * Norm_Download) + (0.4 * (1/Norm_Latency))` | - |
| **Nb de Tests** | `COUNT(speed_tests[test_id])` | - |
| **% Couverture 4G/5G** | `CALCULATE(COUNTROWS, network IN {"4G","5G"}) / COUNTROWS` | > 80% |

## 3. Maquette du Tableau de Bord (Layout)

### Zone Supérieure : Synthèse Globale
- **Cartes KPI (Scorecards)** : 
  - Débit Download Moyen (Code couleur : Vert si > 15 Mbps, Rouge sinon).
  - Latence Moyenne.
  - Total Tests effectués.
- **Filtres (Slicers)** :
  - Période (Date Range).
  - Wilaya.
  - Technologie (3G/4G/5G).

### Zone Centrale : Analyse Géospatiale
- **Carte Choroplèthe (Map)** :
  - **Dimension** : Wilaya (Polygones GeoJSON).
  - **Couleur** : Débit Descendant Moyen.
  - **Tooltip** : Détails au survol (Ex: Top ville, Latence, Nb Tests).
  - **Points** : Superposition optionnelle des points individuels pour les zones critiques (latence > 100ms).

### Zone Inférieure : Détails Techniques
- **Graphique en Barres** : "Débit Moyen par Wilaya" (Top 10 ou Bottom 10).
- **Graphique Circulaire (Donut)** : "Répartition par Technologie" (Part de 5G vs 4G).
- **Graphique Linéaire** : "Évolution de la Performance dans le temps" (Moyenne journalière).
- **Tableau** : "Zones Critiques" (Liste des communes avec débit < 5 Mbps).

## 4. Seuils de Performance (Conditional Formatting)

- **Excellent** (Vert Foncé) : DL > 50 Mbps
- **Bon** (Vert Clair) : DL 15 - 50 Mbps
- **Moyen** (Jaune) : DL 5 - 15 Mbps
- **Critique** (Rouge) : DL < 5 Mbps
