@echo off
:: Naviga nella cartella del backend
cd /d D:\HOMER\AlphaNode\backend

:: Avvia il server Alpha Node tramite Node.js indirizzando l'output su un file di log
node server.js > alphanode_log.txt 2>&1
