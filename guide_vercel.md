# 🚀 Déploiement sur Vercel

Voici comment mettre votre dashboard en ligne gratuitement avec Vercel.

## Prérequis Important
Vercel est "Serverless". Cela signifie que **votre base de données doit être hors du serveur** (dans le Cloud).
Si vous utilisez TiDB (comme vu dans vos fichiers), c'est parfait !

## Étape 1 : Mettre sur GitHub
Assurez-vous d'avoir poussé la dernière version de votre code (je viens de tout préparer).

## Étape 2 : Configurer Vercel
1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub.
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Sélectionnez votre repo `dashbord`.
4. Dans **"Framework Preset"**, choisissez **Vite**.
5. **IMPORTANT : Variables d'Environnement**
   Dépliez la section "Environment Variables" et ajoutez exactement les mêmes que dans votre fichier `.env` local :
   - `DB_HOST` : (Votre hôte TiDB/Cloud)
   - `DB_USER` : (Votre user)
   - `DB_PASSWORD` : (Votre password)
   - `DB_NAME` : `mobilis_dashboard`
   - `DB_PORT` : `4000` (ou le port de votre cloud DB)

   *Note : N'ajoutez PAS `PORT`, Vercel gère ça.*

## Étape 3 : Build
1. Cliquez sur **Deploy**.
2. Vercel va détecter automatiquement :
   - Le frontend dans `client` (grâce à mon fichier de config)
   - L'API backend dans `api/index.js` (grâce à `vercel.json` que j'ai créé)

## Vérification
Une fois déployé, Vercel vous donnera une URL (ex: `https://dashbord-xyz.vercel.app`).
- Le site s'affichera.
- Les appels API passeront par `/api/...` automatiquement.

---

## ⚠️ Si vous n'avez pas de Base de Données Cloud
Le déploiement échouera à se connecter.
Il faut créer une base gratuite sur [TiDB Cloud](https://tidbcloud.com/) ou [Railway](https://railway.app/), y importer votre `full_backup.sql`, et mettre les infos de connexion dans Vercel.
