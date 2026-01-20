# Dashboard Mobilis - Network Analytics

Dashboard décisionnel pour le monitoring des performances réseau Mobilis avec visualisations géospatiales et analyses en temps réel.

## 🏗️ Architecture

- **Frontend**: React + Vite (Port 5173)
- **Backend**: Node.js + Express (Port 5000)
- **Base de données**: MySQL (Base: `mobilis_dashboard`)

## 🚀 Installation & Démarrage Rapide

Voici comment lancer le projet après l'avoir téléchargé depuis GitHub :

### 1. Base de Données
Le projet contient déjà une sauvegarde complète avec création de base incluse.
1. Ouvrez votre logiciel de gestion MySQL (phpMyAdmin, MySQL Workbench, etc.).
2. Importez le fichier : `database/full_backup.sql`.
   *Ce fichier va créer automatiquement la base `mobilis_dashboard` et les tables nécessaires.*

### 2. Installation Automatique (Windows)
Double-cliquez simplement sur le fichier :
👉 **`setup_project.bat`**

Ce script va :
- Installer les dépendances du serveur
- Installer les dépendances du client
- Créer le fichier `.env` si nécessaire

### 3. Démarrage
Lancez ces deux commandes dans deux terminaux séparés :

**Terminal 1 (Backend) :**
```bash
cd server
npm start
```

**Terminal 2 (Frontend) :**
```bash
cd client
npm run dev
```

Ouvrez ensuite votre navigateur sur **http://localhost:5173**

---

## 🛠️ Configuration Manuelle (Si nécessaire)

### Serveur (Backend)
```bash
cd server
npm install
# Créez un fichier .env avec :
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=mobilis_dashboard
```

### Client (Frontend)
```bash
cd client
npm install
```

## 📊 Fonctionnalités
- KPIs temps réel (Débit, Latence, Jitter)
- Carte interactive des tests et antennes
- Configuration globale de la période d'analyse
- Graphiques de tendances et distribution technologique

## 📁 Structure
- `/client`: Code source de l'interface React
- `/server`: API Node.js et logique métier
- `/database`: Scripts SQL et backups
