@echo off
:: Naviga nella cartella del backend
cd /d D:\HOMER\AlphaNode\backend

echo =======================================================
echo 🚀 Avvio del Tunnel Online STABILE per Alpha Node...
echo 🌐 Utilizza il client OpenSSH nativo di Windows.
echo 🛡️ Nessuna pagina di avviso o blocco IP!
echo =======================================================
echo.

:: Avvia il tunnel SSH sicuro usando localhost.run
ssh -o StrictHostKeyChecking=no -R 80:localhost:5000 nokey@localhost.run

pause
