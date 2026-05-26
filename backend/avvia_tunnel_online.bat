@echo off
:: Naviga nella cartella del backend
cd /d D:\HOMER\AlphaNode\backend

echo =======================================================
echo 🚀 Avvio del Tunnel Online per Alpha Node...
echo 🌐 Richiede NodeJS/NPM installati.
echo =======================================================
echo.

:: Avvia localtunnel esponendo la porta 5000
npx localtunnel --port 5000

pause
