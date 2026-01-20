# 🚀 Guide de Déploiement Hybride (Gratuit)

Ce guide explique comment déployer votre dashboard avec le **Frontend sur Vercel** et le **Backend sur Render**, en utilisant **TiDB Cloud** comme base de données.

---

## 1. Base de Données (TiDB Cloud)
1. Créez un compte gratuit sur [TiDB Cloud](https://tidbcloud.com/).
2. Créez un cluster "Serverless" (Gratuit).
3. Connectez-vous et récupérez vos informations de connexion (Host, User, Password).
4. **Important :** Importez vos données SQL (`bts_data.sql` et `insert_fake_data.sql`) en utilisant l'onglet "Import" ou via une console MySQL.

---

## 2. Backend (Render)
1. Créez un compte sur [Render.com](https://render.com).
2. Cliquez sur **"New" > "Web Service"**.
3. Connectez votre dépôt GitHub.
4. Configurez le service :
   - **Name :** `mobilis-api`
   - **Runtime :** `Docker`
   - **Root Directory :** `server`
5. Ajoutez les **Environment Variables** :
   - `DB_HOST` : (Votre hôte TiDB)
   - `DB_USER` : (Votre utilisateur)
   - `DB_PASSWORD` : (Votre mot de passe)
   - `DB_NAME` : `mobilis_dashboard`
   - `DB_PORT` : `4000`
   - `GROQ_API_KEY` : (Votre clé API obtenue sur console.groq.com)
6. **Note sur l'IA :** J'ai configuré l'IA pour utiliser **Groq**. C'est gratuit, beaucoup plus rapide que Llama en local, et cela ne consomme pas la RAM de votre serveur Render.
   - Allez sur [Groq Cloud](https://console.groq.com/keys) pour créer une clé API gratuite.
7. Cliquez sur **Create Web Service**. 

---

## 3. Frontend (Vercel)
1. Allez sur [Vercel.com](https://vercel.com).
2. Cliquez sur **"Add New" > "Project"**.
3. Sélectionnez votre dépôt GitHub.
4. Configurez le projet :
   - **Framework Preset :** `Vite`
   - **Root Directory :** `client`
5. Ajoutez la variable d'environnement :
   - `VITE_API_URL` : `https://votre-api-render.onrender.com/api` (Remplacez par l'URL fournie par Render).
6. Cliquez sur **Deploy**.

---

## 4. Résumé des changements effectués
- ✅ **Support SSL :** La connexion DB est maintenant compatible avec le Cloud.
- ✅ **API Dynamique :** Le frontend peut maintenant se connecter à votre serveur distant.
- ✅ **Dockerisation :** Le backend est prêt à être déployé sur n'importe quel serveur cloud.
- ✅ **Configuration IA :** Le chemin du modèle est maintenant configurable.
