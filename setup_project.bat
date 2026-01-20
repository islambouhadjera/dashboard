@echo off
echo ===================================================
echo      Mobilis Dashboard - Installation
echo ===================================================
echo.

echo [1/3] Installation des dependances Serveur...
cd server
call npm install
if not exist .env (
    echo.
    echo Creation du fichier .env pour le serveur...
    echo DB_HOST=localhost> .env
    echo DB_USER=root>> .env
    echo DB_PASSWORD=>> .env
    echo DB_NAME=mobilis_dashboard>> .env
    echo PORT=5000>> .env
    echo Fichier .env cree. Veuillez le modifier si vous avez un mot de passe MySQL.
)
cd ..
echo.

echo [2/3] Installation des dependances Client...
cd client
call npm install
cd ..
echo.

echo [3/3] Rappel Base de Donnees
echo N'oubliez pas d'importer le fichier 'database/full_backup.sql' dans votre MySQL.
echo.
echo ===================================================
echo      Installation terminee avec succes !
echo ===================================================
echo.
echo Pour demarrer :
echo   1. 'cd server' puis 'npm start'
echo   2. 'cd client' puis 'npm run dev'
echo.
pause
